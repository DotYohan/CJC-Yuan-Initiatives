import assert from "node:assert/strict";
import { test } from "node:test";
import { AdmissionStore } from "../server/admission-store.mjs";
import { AuthenticationStore } from "../server/auth-store.mjs";
import { createConfig } from "../server/config.mjs";
import { createDatabase } from "../server/db.mjs";
import { DocumentStore } from "../server/document-store.mjs";
import { EnrollmentApplicationStore } from "../server/enrollment-store.mjs";
import { RegistrarStore } from "../server/registrar-store.mjs";
import { StudentAssistantStore } from "../server/student-assistant-store.mjs";
import { newId, normalizeIdentifier, hashPassword } from "../server/security.mjs";

const nestedTransactionClient = (transaction) => {
  let client;
  client = new Proxy(transaction, {
    get(target, property, receiver) {
      if (property === "$transaction") return async (callback) => callback(client);
      const value = Reflect.get(target, property, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    }
  });
  return client;
};

test("Student Assistant Workflow: Account creation, department queue isolation, incomplete encoding block, footprint audit, and registrar verification", { timeout: 60_000 }, async () => {
  const prisma = createDatabase();
  const rollback = new Error("ROLLBACK_SA_TEST");

  try {
    await prisma.$transaction(async (transaction) => {
      const database = nestedTransactionClient(transaction);
      const authStore = new AuthenticationStore(database);
      const admissionStore = new AdmissionStore(database);
      const enrollmentStore = new EnrollmentApplicationStore(database);
      const saStore = new StudentAssistantStore(database);
      const registrarStore = new RegistrarStore(database);
      const documentStore = new DocumentStore(database, {
        saveFile: async () => {},
        deleteFile: async () => {}
      });

      const config = createConfig({
        nodeEnv: "test",
        auditPepper: "test-audit-pepper-that-is-long-and-private",
        scryptN: 1 << 10
      });

      // ── Step 1: Register Student
      const suffix = newId().slice(0, 8);
      const studentPassword = "Password123456!";
      const registered = await admissionStore.registerStudent({
        firstName: "SAWorkflow",
        middleName: "Test",
        lastName: `Student_${suffix}`,
        birthDate: "2007-03-20",
        personalEmail: `saworkflow.${suffix}@example.test`,
        mobileNumber: "09181234567",
        admissionYear: 2026,
        password: studentPassword,
        confirmPassword: studentPassword
      }, config);

      const student = await database.student.findUnique({
        where: { studentNumberNormalized: normalizeIdentifier(registered.studentNumber) },
        include: { user: true }
      });
      assert.ok(student);

      const enrollmentData = await enrollmentStore.getForUser(student.userId);
      assert.ok(enrollmentData.admission);
      const initialAppId = enrollmentData.admission.id;

      // Upload required document
      const docType = await database.documentType.findFirst({ where: { active: true } });
      if (docType) {
        await documentStore.uploadDocument({
          studentId: student.id,
          applicationId: initialAppId,
          documentTypeId: docType.id,
          originalFileName: "birth_cert.pdf",
          storedFileName: "stored_birth_cert.pdf",
          filePath: "students/test/birth_cert.pdf",
          fileSize: 2048,
          mimeType: "application/pdf",
          uploadedByUserId: student.userId
        });
      }

      // Satisfy fee obligation & ensure open enrollment period
      const feeObligation = await database.studentObligation.findFirst({
        where: { studentId: student.id }
      });
      assert.ok(feeObligation);
      const activeTermId = feeObligation.academicTermId;

      await database.enrollmentPeriod.updateMany({
        where: { status: "OPEN" },
        data: { status: "CLOSED" }
      });
      const period = await database.enrollmentPeriod.upsert({
        where: { academicTermId: activeTermId },
        update: { status: "OPEN" },
        create: {
          id: newId(),
          academicYearId: feeObligation.academicYearId,
          academicTermId: activeTermId,
          status: "OPEN"
        }
      });
      await database.studentObligation.update({
        where: { id: feeObligation.id },
        data: { status: "PAID" }
      });
      await database.paymentTransaction.create({
        data: {
          id: newId(),
          obligationId: feeObligation.id,
          studentId: student.id,
          enrollmentPeriodId: period.id,
          gatewayName: "SIMULATED_GATEWAY",
          paymentMethod: "ONLINE",
          amountPaid: feeObligation.amountDue,
          status: "VERIFIED"
        }
      });

      // Fetch options and subjects for active open term
      const options = await enrollmentStore.options(student.userId);
      assert.ok(options.curriculumSubjects.length > 0);
      const eligibleSubject = options.curriculumSubjects.find(
        (cs) => cs.academicTermId === activeTermId
      ) || options.curriculumSubjects[0];
      assert.ok(eligibleSubject);

      // Submit enrollment application
      const submittedEnrollment = await enrollmentStore.save(student.userId, {
        programId: eligibleSubject.programId,
        academicTermId: activeTermId,
        yearLevel: eligibleSubject.yearLevel,
        selectedSubjectIds: [eligibleSubject.id],
        formData: {
          personal: {
            fullName: "SA Workflow Student",
            birthday: "2007-03-20",
            sex: "Female",
            civilStatus: "Single",
            nationality: "Filipino",
            religion: "Roman Catholic",
            placeOfBirth: "Digos City"
          },
          contact: {
            mobileNumber: "09181234567",
            personalEmail: `saworkflow.${suffix}@example.test`,
            presentAddress: "Digos City, Davao del Sur",
            permanentAddress: "Digos City, Davao del Sur"
          },
          selection: { subjectIds: [eligibleSubject.id] }
        }
      }, true);
      assert.equal(submittedEnrollment.status, "SUBMITTED");

      // Resolve department for the student's program
      const program = await database.program.findUnique({
        where: { id: eligibleSubject.programId },
        include: { department: true }
      });
      assert.ok(program?.departmentId, "Program must belong to a department");
      const departmentId = program.departmentId;

      // ── Step 2: Admin creates Student Assistant Account
      // 2a. Must reject if departmentId is missing
      await assert.rejects(
        async () => {
          await authStore.createUser({
            id: newId(),
            username: `sa_inv_${suffix}`,
            usernameNormalized: normalizeIdentifier(`sa_inv_${suffix}`),
            displayName: "Invalid SA",
            email: `sa_inv_${suffix}@example.com`,
            emailNormalized: normalizeIdentifier(`sa_inv_${suffix}@example.com`),
            passwordHash: await hashPassword("Password123456!", config.scrypt),
            mustChangePassword: false,
            roleSlug: "student_assistant"
          });
        },
        (error) => error.message === "DEPARTMENT_REQUIRED"
      );

      // 2b. Successfully create SA assigned to department
      const saUsername = `sa_user_${suffix}`;
      const saUser = await authStore.createUser({
        id: newId(),
        username: saUsername,
        usernameNormalized: normalizeIdentifier(saUsername),
        displayName: "Maria Santos (SA)",
        email: `${saUsername}@example.com`,
        emailNormalized: normalizeIdentifier(`${saUsername}@example.com`),
        passwordHash: await hashPassword("Password123456!", config.scrypt),
        mustChangePassword: false,
        roleSlug: "student_assistant",
        departmentId
      });
      assert.ok(saUser.id);
      assert.equal(saUser.assignedDepartment?.id, departmentId);

      // Check SA dashboard
      const saDashboard = await saStore.dashboard(saUser.id);
      assert.equal(saDashboard.department.id, departmentId);
      assert.ok(Array.isArray(saDashboard.programs));

      // ── Step 3: Program Head evaluates and endorses student enrollment
      await database.enrollmentApplication.update({
        where: { id: submittedEnrollment.id },
        data: { status: "UNDER_REVIEW" }
      });

      // ── Step 4: Strict Queue Isolation Verification
      // Because an SA is assigned to this department, the application MUST NOT appear in Registrar queue!
      const registrarAppsBefore = await registrarStore.visibleApplications("PENDING");
      const foundInRegistrarBefore = registrarAppsBefore.some(
        (app) => app.student?.studentNumber === registered.studentNumber || app.studentNumber === registered.studentNumber
      );
      assert.equal(
        foundInRegistrarBefore,
        false,
        "Application MUST NOT appear in Registrar queue before SA encoding is complete"
      );

      // Registrar approval must not bypass the Student Assistant handoff,
      // even when section assignments are supplied directly in the request.
      await assert.rejects(
        () => registrarStore.updateApplication(
          initialAppId,
          saUser.id,
          "registrar",
          "APPROVED",
          "Attempted direct Registrar approval.",
          [{ curriculumSubjectId: eligibleSubject.id, courseOfferingId: "00000000-0000-0000-0000-000000000000" }]
        ),
        (error) => error.message === "STUDENT_ASSISTANT_ENCODING_REQUIRED",
        "Registrar approval must require completed Student Assistant encoding"
      );

      // Application MUST appear in the SA's queue
      const saAppsPending = await saStore.enrollmentApplications(saUser.id, "PENDING");
      const foundInSa = saAppsPending.find((app) => app.id === submittedEnrollment.id);
      assert.ok(foundInSa, "Application MUST be present in SA's pending queue");
      assert.equal(foundInSa.encodingStatus, "PENDING");

      // Verify SA detail view
      const saDetail = await saStore.enrollmentApplicationDetail(saUser.id, submittedEnrollment.id);
      assert.equal(saDetail.id, submittedEnrollment.id);
      assert.equal(saDetail.items.length, 1);
      assert.equal(saDetail.items[0].id, eligibleSubject.id);

      // Ensure open course offering exists for eligible subject
      let offering = (saDetail.offeringChoices || []).find((c) => c.subjectId === eligibleSubject.subjectId && c.available);
      if (!offering) {
        offering = await database.courseOffering.create({
          data: {
            id: newId(),
            offeringCode: `OFF-SA-${suffix}`,
            sectionCode: `SEC-SA-${suffix}`,
            subjectId: eligibleSubject.subjectId,
            academicTermId: activeTermId,
            maxSeats: 40,
            status: "OPEN"
          }
        });
      }

      // ── Step 5: User Rule: If SA forgets or misses a section, reject submission & remain in SA account
      // 5a. Submit empty assignments (missing section)
      await assert.rejects(
        async () => {
          await saStore.encodeSubjects(saUser.id, submittedEnrollment.id, {
            assignments: []
          });
        },
        (error) => error.message === "INCOMPLETE_SUBJECT_ENCODING",
        "Submitting incomplete section encoding must throw INCOMPLETE_SUBJECT_ENCODING"
      );

      // Verify that after failed/missing encoding, it STILL does NOT appear in Registrar queue!
      const registrarAppsStillHidden = await registrarStore.visibleApplications("PENDING");
      assert.equal(
        registrarAppsStillHidden.some(
          (app) => app.student?.studentNumber === registered.studentNumber || app.studentNumber === registered.studentNumber
        ),
        false,
        "Application must remain hidden from Registrar account when encoding is incomplete"
      );

      // ── Step 6: SA successfully encodes all approved subjects (Captures SA Footprint)
      const encodeResult = await saStore.encodeSubjects(saUser.id, submittedEnrollment.id, {
        assignments: [
          { curriculumSubjectId: eligibleSubject.id, courseOfferingId: offering.id }
        ]
      });
      assert.ok(encodeResult.encoding);
      assert.equal(encodeResult.encoding.encodedByUserId, saUser.id);
      assert.equal(encodeResult.encoding.encodedByDisplayName, "Maria Santos (SA)");
      assert.equal(encodeResult.encoding.encodedByUsername, saUsername);
      assert.ok(encodeResult.encoding.encodedAt);
      assert.equal(encodeResult.encoding.assignments.length, 1);

      // Check status history for SA footprint audit record
      const history = await database.admissionApplicationStatusHistory.findFirst({
        where: { applicationId: initialAppId, actionType: "SA_SUBJECT_ENCODED" }
      });
      assert.ok(history, "Audit log must contain SA_SUBJECT_ENCODED action");
      assert.equal(history.changedByUserId, saUser.id);
      assert.equal(history.changedByRole, "student_assistant");
      assert.match(history.remarks, /Maria Santos \(SA\)/);

      // ── Step 7: Application now proceeds to Registrar Account
      const registrarAppsAfter = await registrarStore.visibleApplications("PENDING");
      const foundInRegistrarAfter = registrarAppsAfter.find(
        (app) => app.student?.studentNumber === registered.studentNumber || app.studentNumber === registered.studentNumber
      );
      assert.ok(
        foundInRegistrarAfter,
        "Application MUST proceed and appear in Registrar queue after SA encoding is completed"
      );

      // Registrar review contains the SA footprint
      const regReview = await registrarStore.applicationReview(initialAppId);
      assert.ok(regReview.enrollmentReview?.saEncoding);
      assert.equal(regReview.enrollmentReview.saEncoding.encodedByDisplayName, "Maria Santos (SA)");
      assert.equal(regReview.enrollmentReview.saEncoding.assignments.length, 1);
      assert.equal(regReview.enrollmentReview.saEncoding.assignments[0].courseOfferingId, offering.id);

      // ── Step 8: Registrar verifies and approves enrollment
      const registrarUser = await database.user.findFirst({
        where: { userRoles: { some: { role: { slug: "registrar" } } } }
      });
      const regUserId = registrarUser?.id || saUser.id;

      // Approve without overriding assignments (auto-uses SA assignments)
      const approved = await registrarStore.updateApplication(
        initialAppId,
        regUserId,
        "registrar",
        "APPROVED",
        "Verified SA encoding and approved enrollment.",
        null // null uses SA pre-encoded assignments
      );
      assert.equal(approved.status, "APPROVED");

      // Verify official enrollment was created
      const officialEnrollment = await database.enrollment.findUnique({
        where: { studentId_academicTermId: { studentId: student.id, academicTermId: activeTermId } },
        include: { items: true, statusHistory: true }
      });
      assert.ok(officialEnrollment);
      assert.equal(officialEnrollment.status, "ENROLLED");
      assert.equal(officialEnrollment.items.length, 1);
      assert.equal(officialEnrollment.items[0].courseOfferingId, offering.id);
      assert.match(
        officialEnrollment.statusHistory[0].reason,
        /Subject offerings encoded by Student Assistant Maria Santos \(SA\)/
      );

      // Rollback to keep test database completely clean
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
});
