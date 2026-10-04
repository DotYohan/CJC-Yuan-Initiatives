import assert from "node:assert/strict";
import { test } from "node:test";
import { AdmissionStore } from "../server/admission-store.mjs";
import { createConfig } from "../server/config.mjs";
import { createDatabase } from "../server/db.mjs";
import { DocumentStore } from "../server/document-store.mjs";
import { EnrollmentApplicationStore } from "../server/enrollment-store.mjs";
import { ProgramHeadStore } from "../server/program-head-store.mjs";
import { RegistrarStore } from "../server/registrar-store.mjs";
import { StudentDashboardStore } from "../server/student-store.mjs";
import { newId, normalizeIdentifier } from "../server/security.mjs";

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

test("Student lifecycle: Account creation, requirement upload, submission, document preservation, and registrar review", { timeout: 60_000 }, async () => {
  const prisma = createDatabase();
  const rollback = new Error("ROLLBACK_LIFECYCLE_TEST");

  try {
    await prisma.$transaction(async (transaction) => {
      const database = nestedTransactionClient(transaction);
      const admissionStore = new AdmissionStore(database);
      const enrollmentStore = new EnrollmentApplicationStore(database);
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

      // SCENARIO 1: New student creates account only
      const suffix = newId().slice(0, 8);
      const registered = await admissionStore.registerStudent({
        firstName: "Lifecycle",
        middleName: "Test",
        lastName: `Student${suffix}`,
        birthDate: "2007-03-20",
        personalEmail: `lifecycle.${suffix}@example.test`,
        mobileNumber: "09181234567",
        admissionYear: 2026,
        password: "Correct horse battery 2026",
        confirmPassword: "Correct horse battery 2026"
      }, config);

      assert.ok(registered.studentNumber);
      assert.ok(registered.schoolEmail);

      // Verify student profile exists with no program assigned
      const student = await transaction.student.findUnique({
        where: { studentNumberNormalized: normalizeIdentifier(registered.studentNumber) },
        include: { user: true }
      });
      assert.ok(student);
      assert.equal(student.status, "APPLICANT");
      assert.equal(student.programId, null);

      // Verify no pending application exists for Registrar review
      const registrarApplicationsBefore = await registrarStore.visibleApplications("PENDING");
      const foundInRegistrar = registrarApplicationsBefore.some(
        (app) => app.studentNumber === registered.studentNumber || app.email === `lifecycle.${suffix}@example.test`
      );
      assert.equal(foundInRegistrar, false, "Draft student registration must NOT appear on Registrar review queue");

      // SCENARIO 2: Student opens enrollment, uploads requirements, and submits application
      const enrollmentData = await enrollmentStore.getForUser(student.userId);
      assert.ok(enrollmentData.admission, "Student must have an admission record");
      const initialAppId = enrollmentData.admission.id;

      // Upload required document
      const docType = await transaction.documentType.findFirst({ where: { active: true } });
      assert.ok(docType, "Active document type must exist");

      const uploadedDoc = await documentStore.uploadDocument({
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
      assert.ok(uploadedDoc.id);

      // Pay entrance fee obligation and open target enrollment period so submit can proceed
      const feeObligation = await transaction.studentObligation.findFirst({
        where: { studentId: student.id }
      });
      const activeTermId = feeObligation.academicTermId;
      await transaction.enrollmentPeriod.updateMany({
        where: { status: "OPEN" },
        data: { status: "CLOSED" }
      });
      const period = await transaction.enrollmentPeriod.upsert({
        where: { academicTermId: activeTermId },
        update: { status: "OPEN" },
        create: {
          id: newId(),
          academicYearId: feeObligation.academicYearId,
          academicTermId: activeTermId,
          status: "OPEN"
        }
      });
      await transaction.studentObligation.update({
        where: { id: feeObligation.id },
        data: { status: "PAID" }
      });
      await transaction.paymentTransaction.create({
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
      assert.ok(options.programs.length > 0);
      assert.ok(options.curriculumSubjects.length > 0);
      const targetTerm = (options.terms || []).find((t) => t.id === activeTermId);
      const eligibleSubject = options.curriculumSubjects.find(
        (cs) => cs.academicTermId === activeTermId
          && (!targetTerm?.termNumber || cs.termNumber === targetTerm.termNumber)
          && (!cs.requirements?.length || cs.requirements.every((p) => p.eligible))
      ) || options.curriculumSubjects.find((cs) => cs.academicTermId === activeTermId) || options.curriculumSubjects[0];
      assert.ok(eligibleSubject);

      // Submit enrollment application
      const submittedEnrollment = await enrollmentStore.save(student.userId, {
        programId: eligibleSubject.programId,
        academicTermId: activeTermId,
        yearLevel: eligibleSubject.yearLevel,
        selectedSubjectIds: [eligibleSubject.id],
        formData: {
          personal: {
            fullName: "Lifecycle Test Student",
            birthday: "2007-03-20",
            sex: "Female",
            civilStatus: "Single",
            nationality: "Filipino",
            religion: "Roman Catholic",
            placeOfBirth: "Digos City"
          },
          contact: {
            mobileNumber: "09181234567",
            personalEmail: `lifecycle.${suffix}@example.test`,
            presentAddress: "Digos City, Davao del Sur",
            permanentAddress: "Digos City, Davao del Sur"
          },
          selection: { subjectIds: [eligibleSubject.id] }
        }
      }, true);

      assert.equal(submittedEnrollment.status, "SUBMITTED");

      // Program Head evaluates & endorses student enrollment for Registrar review
      await transaction.enrollmentApplication.update({
        where: { id: submittedEnrollment.id },
        data: { status: "UNDER_REVIEW" }
      });

      // SCENARIO 3: Registrar views submitted application and all documents are intact
      const registrarApplicationsAfter = await registrarStore.visibleApplications("PENDING");
      const submittedAdmission = registrarApplicationsAfter.find(
        (app) => app.student?.studentNumber === registered.studentNumber || app.studentNumber === registered.studentNumber
      );
      assert.ok(submittedAdmission, "Submitted application must appear on Registrar review queue");

      const reviewDetail = await registrarStore.applicationReview(submittedAdmission.id);
      assert.ok(reviewDetail, "Registrar must be able to load review details");
      const submittedDoc = reviewDetail.documents.find((doc) => doc.fileName === "birth_cert.pdf");
      assert.ok(submittedDoc, "Uploaded document must remain attached to submitted application and visible to Registrar");
      assert.equal(submittedDoc.fileName, "birth_cert.pdf");

      // SCENARIO 4: Document uploads are locked while under review
      await assert.rejects(
        () => documentStore.uploadDocument({
          studentId: student.id,
          applicationId: submittedAdmission.id,
          documentTypeId: docType.id,
          originalFileName: "new_file.pdf",
          storedFileName: "stored_new_file.pdf",
          filePath: "students/test/new_file.pdf",
          fileSize: 1024,
          mimeType: "application/pdf",
          uploadedByUserId: student.userId
        }),
        /APPLICATION_LOCKED/,
        "Uploading or replacing documents while application is under review must be rejected"
      );

      // Registrar returns application for correction
      const registrarUser = await transaction.user.findFirst({ where: { userRoles: { some: { role: { slug: "registrar" } } } } });
      await registrarStore.updateApplication(
        submittedAdmission.id,
        registrarUser?.id || student.userId,
        "registrar",
        "RETURNED_FOR_CORRECTION",
        "Please provide clearer birth certificate"
      );

      // Now student can replace the document
      const replacedDoc = await documentStore.uploadDocument({
        studentId: student.id,
        applicationId: submittedAdmission.id,
        documentTypeId: docType.id,
        originalFileName: "birth_cert_clear.pdf",
        storedFileName: "stored_birth_cert_clear.pdf",
        filePath: "students/test/birth_cert_clear.pdf",
        fileSize: 3072,
        mimeType: "application/pdf",
        uploadedByUserId: student.userId
      });
      assert.ok(replacedDoc.id);
      assert.equal(replacedDoc.originalFileName, "birth_cert_clear.pdf");

      // Resubmit after document replacement
      const resubmittedEnrollment = await enrollmentStore.save(student.userId, {
        programId: eligibleSubject.programId,
        academicTermId: activeTermId,
        yearLevel: eligibleSubject.yearLevel,
        selectedSubjectIds: [eligibleSubject.id],
        formData: {
          personal: {
            fullName: "Lifecycle Test Student",
            birthday: "2007-03-20",
            sex: "Female",
            civilStatus: "Single",
            nationality: "Filipino",
            religion: "Roman Catholic",
            placeOfBirth: "Digos City"
          },
          contact: {
            mobileNumber: "09181234567",
            personalEmail: `lifecycle.${suffix}@example.test`,
            presentAddress: "Digos City, Davao del Sur",
            permanentAddress: "Digos City, Davao del Sur"
          },
          selection: { subjectIds: [eligibleSubject.id] }
        }
      }, true);
      assert.equal(resubmittedEnrollment.status, "SUBMITTED");

      // Program Head marks under review
      await transaction.enrollmentApplication.update({
        where: { id: resubmittedEnrollment.id },
        data: { status: "UNDER_REVIEW" }
      });

      // Create section and offering for Registrar section assignment
      const classSection = await transaction.classSection.create({
        data: {
          id: newId(),
          academicTermId: activeTermId,
          programId: eligibleSubject.programId,
          code: `SEC-${suffix}`,
          yearLevel: eligibleSubject.yearLevel,
          curriculumId: eligibleSubject.curriculumId,
          capacity: 50,
          isActive: true
        }
      });
      const offering = await transaction.courseOffering.create({
        data: {
          id: newId(),
          academicTermId: activeTermId,
          subjectId: eligibleSubject.subjectId,
          classSectionId: classSection.id,
          offeringCode: `OFFER-${suffix}`,
          creditUnits: eligibleSubject.creditUnits,
          capacity: 50,
          status: "OPEN"
        }
      });

      // SCENARIO 5: Registrar approves enrollment
      await registrarStore.updateApplication(
        submittedAdmission.id,
        registrarUser?.id || student.userId,
        "registrar",
        "APPROVED",
        "Admission and enrollment approved.",
        [{ curriculumSubjectId: eligibleSubject.id, courseOfferingId: offering.id }]
      );

      // Verify Student record was updated and locked to the approved program & curriculum
      const enrolledStudent = await transaction.student.findUnique({
        where: { id: student.id },
        include: { program: true, curriculum: true }
      });
      assert.equal(enrolledStudent.status, "ACTIVE");
      assert.equal(enrolledStudent.programId, eligibleSubject.programId);
      assert.ok(enrolledStudent.curriculumId);
      assert.equal(enrolledStudent.currentYearLevel, eligibleSubject.yearLevel);

      // Verify StudentProgramHistory and StudentCurriculumAssignment were recorded
      const programHistory = await transaction.studentProgramHistory.findFirst({
        where: { studentId: student.id, programId: eligibleSubject.programId }
      });
      assert.ok(programHistory, "StudentProgramHistory must be created on approval");

      const curriculumAssignment = await transaction.studentCurriculumAssignment.findFirst({
        where: { studentId: student.id, curriculumId: enrolledStudent.curriculumId }
      });
      assert.ok(curriculumAssignment, "StudentCurriculumAssignment must be created on approval");

      // SCENARIO 6: Student Profile Dashboard reflects program, curriculum, and year level
      const studentDashboardStore = new StudentDashboardStore(database);
      const studentProfile = await studentDashboardStore.forUser(student.userId);
      assert.ok(studentProfile.student.program, "Student profile must have program assigned");
      assert.equal(studentProfile.student.program.code, enrolledStudent.program.code);
      assert.ok(studentProfile.student.curriculum, "Student profile must have curriculum assigned");
      assert.equal(studentProfile.student.currentYearLevel, eligibleSubject.yearLevel);
      assert.ok(Array.isArray(studentProfile.schedule), "Schedule array must exist");
      assert.equal(studentProfile.schedule.length, 1, "Enrolled offering must appear in schedule");
      assert.equal(studentProfile.schedule[0].subjectCode, eligibleSubject.subjectCode);
      assert.equal(studentProfile.schedule[0].section, `SEC-${suffix}`);
      assert.equal(studentProfile.schedule[0].weekday, null, "Unscheduled offering has weekday: null");

      // SCENARIO 7: Program Head Dashboard shows student in officially enrolled list
      const phRole = await transaction.role.findFirst({ where: { slug: "program_head" } });
      const phUser = await transaction.user.create({
        data: {
          id: newId(),
          username: `ph.${suffix}`,
          usernameNormalized: normalizeIdentifier(`ph.${suffix}`),
          email: `ph.${suffix}@example.test`,
          emailNormalized: normalizeIdentifier(`ph.${suffix}@example.test`),
          displayName: `PH ${suffix}`,
          passwordHash: "dummy-hash",
          userRoles: { create: { roleId: phRole.id, isPrimary: true } }
        }
      });
      await transaction.userProgramAssignment.create({
        data: {
          id: newId(),
          userId: phUser.id,
          programId: eligibleSubject.programId
        }
      });

      const programHeadStore = new ProgramHeadStore(database);
      const phDashboard = await programHeadStore.dashboard(phUser.id);
      const officiallyEnrolled = phDashboard.officialStudents.find((s) => s.id === student.id);
      assert.ok(officiallyEnrolled, "Enrolled student must appear in Program Head officialStudents list");
      assert.ok(phDashboard.officialStudents.length >= 1, "Official student count must be at least 1");

      const phStudentDetail = await programHeadStore.studentDetail(phUser.id, student.id);
      assert.ok(phStudentDetail, "Program Head must be able to view enrolled student detail");
      assert.equal(phStudentDetail.studentNumber, registered.studentNumber);

      // SCENARIO 8: Program is locked - student cannot enroll in another program
      const optionsAfterEnrollment = await enrollmentStore.options(student.userId);
      assert.equal(optionsAfterEnrollment.programs.length, 1, "Only the assigned program must be available to enrolled student");
      assert.equal(optionsAfterEnrollment.programs[0].id, eligibleSubject.programId);

      const otherProgram = await transaction.program.findFirst({
        where: { id: { not: eligibleSubject.programId }, isActive: true }
      });
      if (otherProgram) {
        await assert.rejects(
          () => enrollmentStore.save(student.userId, {
            programId: otherProgram.id,
            academicTermId: activeTermId,
            yearLevel: 1,
            selectedSubjectIds: []
          }),
          /STUDENT_PROGRAM_MISMATCH/,
          "Enrolled student must not be allowed to change program during enrollment"
        );
      }

      // SCENARIO 9: Registrar/Admin Override Feature
      // Non-registrar cannot override
      await assert.rejects(
        () => registrarStore.overrideStudentProgram(student.userId, "student", student.id, {
          programId: otherProgram.id,
          reason: "Unauthorized attempt"
        }),
        /UNAUTHORIZED/,
        "Non-registrar must not be allowed to override student program"
      );

      // Reason is required
      await assert.rejects(
        () => registrarStore.overrideStudentProgram(registrarUser?.id || phUser.id, "registrar", student.id, {
          programId: otherProgram.id,
          reason: ""
        }),
        /OVERRIDE_REASON_REQUIRED/,
        "Override reason is mandatory"
      );

      // Authorized override by Registrar
      if (otherProgram) {
        const overrideResult = await registrarStore.overrideStudentProgram(
          registrarUser?.id || phUser.id,
          "registrar",
          student.id,
          {
            programId: otherProgram.id,
            reason: "Transferred to another department by approved petition"
          }
        );
        assert.equal(overrideResult.student.programId, otherProgram.id);
        assert.equal(overrideResult.overrideLog.action, "Program Change Override");
        assert.equal(overrideResult.overrideLog.newProgram, otherProgram.code);
        assert.ok(overrideResult.overrideLog.date);

        const studentAfterOverride = await transaction.student.findUnique({
          where: { id: student.id }
        });
        assert.equal(studentAfterOverride.programId, otherProgram.id, "Student program must be updated after override");
      }

      throw rollback;
    });
  } catch (caught) {
    if (caught !== rollback) throw caught;
  }
});
