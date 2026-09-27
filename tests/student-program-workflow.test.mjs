import assert from "node:assert/strict";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { AdmissionStore } from "../server/admission-store.mjs";
import { createApp } from "../server/app.mjs";
import { createConfig } from "../server/config.mjs";
import { createDatabase } from "../server/db.mjs";
import { EnrollmentApplicationStore } from "../server/enrollment-store.mjs";
import { RegistrarStore } from "../server/registrar-store.mjs";
import { hashPassword, newId, normalizeIdentifier } from "../server/security.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const expectedOrigin = "http://portal.test";

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

const createClient = (baseUrl) => {
  let cookie = "";
  let csrfToken = "";

  const ensureSession = async () => {
    const response = await fetch(`${baseUrl}/api/v1/auth/session`, {
      headers: cookie ? { cookie } : {}
    });
    const payload = await response.json();
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";", 1)[0];
    csrfToken = payload.data.csrfToken;
    return payload.data;
  };

  const request = async (path, options = {}) => {
    if (!csrfToken) await ensureSession();
    const headers = {
      origin: expectedOrigin,
      ...(cookie ? { cookie } : {}),
      ...(options.json ? { "content-type": "application/json" } : {}),
      ...(options.method && options.method !== "GET" ? { "x-csrf-token": csrfToken } : {}),
      ...(options.headers || {})
    };
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.json ? JSON.stringify(options.json) : options.body
    });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";", 1)[0];
    const text = await response.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = text;
    }
    if (payload?.data?.csrfToken) csrfToken = payload.data.csrfToken;
    return { response, payload };
  };

  return { ensureSession, request };
};

test("Student lifecycle: Account creation (no program) -> Enrollment program selection -> Evaluation -> Registrar Override & Approval -> Program Locked", { timeout: 60_000 }, async () => {
  const prisma = createDatabase();
  const rollback = new Error("ROLLBACK_STUDENT_PROGRAM_WORKFLOW_TEST");

  try {
    await prisma.$transaction(async (transaction) => {
      const config = createConfig({
        nodeEnv: "test",
        appOrigin: expectedOrigin,
        publicRoot: projectRoot,
        auditPepper: "test-audit-pepper-long-and-secure",
        scryptN: 1 << 10,
        cleanupIntervalMs: 60_000
      });
      const database = nestedTransactionClient(transaction);
      const app = await createApp({
        config,
        database: transaction,
        admissionStore: new AdmissionStore(database),
        enrollmentStore: new EnrollmentApplicationStore(database),
        registrarStore: new RegistrarStore(database)
      });
      const server = createServer(app.handler);
      await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
      const address = server.address();
      const baseUrl = `http://127.0.0.1:${address.port}`;

      try {
        const testSuffix = newId().slice(0, 8);

        // Setup test academic structure
        const ay = await transaction.academicYear.create({
          data: {
            id: newId(),
            code: `AY-${testSuffix}`,
            name: `Academic Year ${testSuffix}`,
            startsOn: new Date("2026-08-01"),
            endsOn: new Date("2027-05-31")
          }
        });

        const term = await transaction.academicTerm.create({
          data: {
            id: newId(),
            academicYearId: ay.id,
            code: `TERM1-${testSuffix}`,
            name: `First Semester ${testSuffix}`,
            termNumber: 1,
            startsOn: new Date("2026-08-01"),
            endsOn: new Date("2026-12-18"),
            status: "ENROLLMENT_OPEN"
          }
        });

        await transaction.enrollmentPeriod.updateMany({
          where: { status: "OPEN" },
          data: { status: "CLOSED" }
        });

        const period = await transaction.enrollmentPeriod.create({
          data: {
            id: newId(),
            academicYearId: ay.id,
            academicTermId: term.id,
            status: "OPEN",
            openedAt: new Date()
          }
        });

        const college = await transaction.college.create({
          data: {
            id: newId(),
            code: `COL-${testSuffix}`,
            codeNormalized: normalizeIdentifier(`COL-${testSuffix}`),
            name: "College of Engineering and Technology"
          }
        });

        const dept = await transaction.department.create({
          data: {
            id: newId(),
            collegeId: college.id,
            code: `DEP-${testSuffix}`,
            name: "Computer Studies Department"
          }
        });

        // Create Program A (BSIT)
        const progA = await transaction.program.create({
          data: {
            id: newId(),
            departmentId: dept.id,
            code: `BSIT-${testSuffix}`,
            codeNormalized: normalizeIdentifier(`BSIT-${testSuffix}`),
            name: "Bachelor of Science in Information Technology",
            credential: "Bachelor Degree",
            durationYears: 4,
            isActive: true
          }
        });

        const curA = await transaction.curriculum.create({
          data: {
            id: newId(),
            programId: progA.id,
            code: `CUR-BSIT-${testSuffix}`,
            name: "BSIT Curriculum 2026",
            effectiveFromYear: 2026,
            version: 1,
            status: "ACTIVE"
          }
        });

        const subA = await transaction.subject.create({
          data: {
            id: newId(),
            departmentId: dept.id,
            code: `IT101-${testSuffix}`,
            codeNormalized: normalizeIdentifier(`IT101-${testSuffix}`),
            title: "Introduction to Computing",
            defaultCreditUnits: 3,
            status: "ACTIVE"
          }
        });

        const curSubA = await transaction.curriculumSubject.create({
          data: {
            id: newId(),
            curriculumId: curA.id,
            subjectId: subA.id,
            yearLevel: 1,
            termNumber: 1,
            creditUnits: 3,
            type: "REQUIRED"
          }
        });

        // Create Program B (BSECE)
        const progB = await transaction.program.create({
          data: {
            id: newId(),
            departmentId: dept.id,
            code: `BSECE-${testSuffix}`,
            codeNormalized: normalizeIdentifier(`BSECE-${testSuffix}`),
            name: "Bachelor of Science in Electronics Engineering",
            credential: "Bachelor Degree",
            durationYears: 4,
            isActive: true
          }
        });

        const curB = await transaction.curriculum.create({
          data: {
            id: newId(),
            programId: progB.id,
            code: `CUR-BSECE-${testSuffix}`,
            name: "BSECE Curriculum 2026",
            effectiveFromYear: 2026,
            version: 1,
            status: "ACTIVE"
          }
        });

        const subB = await transaction.subject.create({
          data: {
            id: newId(),
            departmentId: dept.id,
            code: `ECE101-${testSuffix}`,
            codeNormalized: normalizeIdentifier(`ECE101-${testSuffix}`),
            title: "Circuits I",
            defaultCreditUnits: 3,
            status: "ACTIVE"
          }
        });

        const curSubB = await transaction.curriculumSubject.create({
          data: {
            id: newId(),
            curriculumId: curB.id,
            subjectId: subB.id,
            yearLevel: 1,
            termNumber: 1,
            creditUnits: 3,
            type: "REQUIRED"
          }
        });

        // 1. Register a new student (Freshman/Transferee)
        const suffix = newId().slice(0, 8);
        const studentClient = createClient(baseUrl);
        const studentPassword = "Correct horse battery 2026";
        const regRes = await studentClient.request("/api/v1/admission/register", {
          method: "POST",
          json: {
            firstName: "Juan",
            middleName: "Protacio",
            lastName: `DelaCruz${suffix}`,
            birthDate: "2007-01-15",
            personalEmail: `student.${suffix}@example.test`,
            mobileNumber: "09171234567",
            password: studentPassword,
            confirmPassword: studentPassword
          }
        });

        assert.equal(regRes.response.status, 201, "Registration should succeed with 201");
        const schoolEmail = regRes.payload.data.schoolEmail;
        const studentNumber = regRes.payload.data.studentNumber;

        // Verify newly created student has programId: null, curriculumId: null, status: APPLICANT
        const studentRecord = await transaction.student.findUniqueOrThrow({
          where: { studentNumberNormalized: normalizeIdentifier(studentNumber) }
        });
        const studentId = studentRecord.id;
        assert.equal(studentRecord.programId, null, "New student should NOT have an assigned program");
        assert.equal(studentRecord.curriculumId, null, "New student should NOT have an assigned curriculum");
        assert.equal(studentRecord.status, "APPLICANT", "New student should have status APPLICANT");

        // Login as student
        const loginStudentRes = await studentClient.request("/api/v1/auth/login", {
          method: "POST",
          json: { identifier: schoolEmail, password: studentPassword }
        });
        assert.equal(loginStudentRes.response.status, 200, "Student login should succeed");

        // 2. Fetch enrollment options as unassigned student
        const optionsRes = await studentClient.request("/api/v1/student/enrollment/options");
        assert.equal(optionsRes.response.status, 200);
        const optionsData = optionsRes.payload.data;
        assert.ok(optionsData.programs.length >= 2, "Unassigned student should see all active programs");
        assert.equal(optionsData.studentContext.programId, null, "Context should reflect unassigned program");
        assert.ok(optionsData.curriculumSubjects.length >= 2, "Curriculum subjects across programs should be available");

        // Pick Program A and matching curriculum subject
        const chosenProgram = progA;
        const matchingSubject = optionsData.curriculumSubjects.find(
          (cs) => cs.programId === chosenProgram.id && cs.academicTermId === term.id
        );
        assert.ok(matchingSubject, "Should find curriculum subject for chosen program");

        // Setup Entrance Fee requirement satisfied
        const entranceFee = await transaction.paymentType.upsert({
          where: { name: "Entrance Fee" },
          update: { isActive: true },
          create: { id: newId(), name: "Entrance Fee", category: "ADMISSION", amount: 500, isActive: true }
        });
        await transaction.studentObligation.updateMany({
          where: {
            studentId,
            paymentTypeId: entranceFee.id
          },
          data: {
            status: "WAIVED"
          }
        });

        // 3. Submit enrollment application with chosen program
        const enrollRes = await studentClient.request("/api/v1/student/enrollment/submit", {
          method: "POST",
          json: {
            programId: chosenProgram.id,
            academicTermId: term.id,
            yearLevel: 1,
            selectedSubjectIds: [matchingSubject.id],
            formData: {
              personal: {
                fullName: "Juan Dela Cruz",
                birthday: "2007-01-15",
                sex: "Male",
                civilStatus: "Single",
                nationality: "Filipino",
                religion: "Catholic",
                placeOfBirth: "Digos City"
              },
              contact: {
                mobileNumber: "09171234567",
                personalEmail: `student_${suffix}@example.com`,
                presentAddress: "Digos City, Davao del Sur",
                permanentAddress: "Digos City, Davao del Sur"
              }
            }
          }
        });
        if (enrollRes.response.status !== 200) console.log("Enrollment submit response:", enrollRes.payload);
        assert.equal(enrollRes.response.status, 200, "Submitting enrollment with chosen program should succeed");
        assert.equal(enrollRes.payload.data.application.status, "SUBMITTED");
        assert.equal(enrollRes.payload.data.application.programId, chosenProgram.id);

        // 4. Setup Registrar user
        const registrarRole = await transaction.role.findUniqueOrThrow({ where: { slug: "registrar" } });
        const registrarUserId = newId();
        const registrarPass = "Password123!";
        const passHash = await hashPassword(registrarPass, config.scrypt);
        await transaction.user.create({
          data: {
            id: registrarUserId,
            username: `reg_${suffix}`,
            usernameNormalized: normalizeIdentifier(`reg_${suffix}`),
            displayName: "Test Registrar",
            email: `reg_${suffix}@cjc.invalid`,
            emailNormalized: normalizeIdentifier(`reg_${suffix}@cjc.invalid`),
            passwordHash: passHash,
            status: "ACTIVE",
            mustChangePassword: false,
            userRoles: { create: { roleId: registrarRole.id, isPrimary: true } }
          }
        });

        const registrarClient = createClient(baseUrl);
        const loginRes = await registrarClient.request("/api/v1/auth/login", {
          method: "POST",
          json: { identifier: `reg_${suffix}`, password: registrarPass }
        });
        if (loginRes.response.status !== 200) console.log("Registrar login failed:", loginRes.payload);
        assert.equal(loginRes.response.status, 200, "Registrar login should succeed");

        // 5. Registrar lists programs with curricula
        const progCurRes = await registrarClient.request("/api/v1/registrar/programs-with-curricula");
        assert.equal(progCurRes.response.status, 200);
        assert.ok(progCurRes.payload.data.programs.length >= 2);
        const progBInList = progCurRes.payload.data.programs.find((p) => p.id === progB.id);
        assert.ok(progBInList, "Program B should be in registrar programs list");
        assert.ok(progBInList.curricula.some((c) => c.id === curB.id));

        // 6. Test Program Override Feature:
        // Try override without reason -> 400
        const noReasonOverride = await registrarClient.request(`/api/v1/registrar/students/${studentId}/override-program`, {
          method: "PATCH",
          json: { programId: progB.id, curriculumId: curB.id, reason: "" }
        });
        assert.equal(noReasonOverride.response.status, 422, "Override without reason should return 422");

        // Try override with unauthorized student client -> 403
        const unauthOverride = await studentClient.request(`/api/v1/registrar/students/${studentId}/override-program`, {
          method: "PATCH",
          json: { programId: progB.id, curriculumId: curB.id, reason: "Student trying to change program" }
        });
        assert.equal(unauthOverride.response.status, 403, "Non-registrar/admin should get 403 Forbidden");

        // Authorized override with valid reason -> 200
        const validOverride = await registrarClient.request(`/api/v1/registrar/students/${studentId}/override-program`, {
          method: "PATCH",
          json: {
            programId: progB.id,
            curriculumId: curB.id,
            reason: "Student submitted shifting request to BSECE."
          }
        });
        assert.equal(validOverride.response.status, 200, "Valid program override should return 200");
        assert.equal(validOverride.payload.data.student.program.id, progB.id);
        assert.equal(validOverride.payload.data.student.curriculum.id, curB.id);

        // Verify Audit Log entry created for program override
        const overrideAudit = await transaction.auditLog.findFirst({
          where: {
            eventType: "registrar.program_override"
          }
        });
        assert.ok(overrideAudit, "Audit log should record registrar.program_override event");
        assert.equal(overrideAudit.metadata?.reason, "Student submitted shifting request to BSECE.");

        // Verify StudentProgramHistory and StudentCurriculumAssignment created
        const progHist = await transaction.studentProgramHistory.findFirst({
          where: { studentId, programId: progB.id }
        });
        assert.ok(progHist, "StudentProgramHistory record must exist");

        const curAssign = await transaction.studentCurriculumAssignment.findFirst({
          where: { studentId, curriculumId: curB.id }
        });
        assert.ok(curAssign, "StudentCurriculumAssignment record must exist");

        // 7. Verify subsequent enrollment options for now-assigned student
        const updatedOptionsRes = await studentClient.request("/api/v1/student/enrollment/options");
        assert.equal(updatedOptionsRes.response.status, 200);
        const updatedOptions = updatedOptionsRes.payload.data;
        assert.equal(updatedOptions.programs.length, 1, "Assigned student should only see their assigned program");
        assert.equal(updatedOptions.programs[0].id, progB.id);
        assert.equal(updatedOptions.studentContext.programId, progB.id);

      } finally {
        await new Promise((resolveClose) => server.close(resolveClose));
        await app.close();
      }

      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
});
