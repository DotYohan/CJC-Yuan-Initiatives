import assert from "node:assert/strict";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createApp } from "../server/app.mjs";
import { createConfig } from "../server/config.mjs";
import { createDatabase } from "../server/db.mjs";
import { ProgramHeadStore } from "../server/program-head-store.mjs";
import { hashPassword, newId, normalizeIdentifier } from "../server/security.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const expectedOrigin = "http://portal.test";

class Client {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookie = "";
    this.csrfToken = "";
  }

  async request(path, options = {}) {
    const method = options.method ?? "GET";
    const headers = new Headers(options.headers ?? {});
    if (this.cookie) headers.set("Cookie", this.cookie);
    if (!new Set(["GET", "HEAD"]).has(method)) {
      headers.set("Origin", expectedOrigin);
      if (this.csrfToken) headers.set("X-CSRF-Token", this.csrfToken);
    }
    let body;
    if (options.json !== undefined) {
      body = JSON.stringify(options.json);
      headers.set("Content-Type", "application/json");
    }
    const response = await fetch(`${this.baseUrl}${path}`, { method, headers, body, redirect: "manual" });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      const pair = setCookie.split(";", 1)[0];
      this.cookie = pair.endsWith("=") ? "" : pair;
    }
    const payload = await response.json();
    if (payload?.data?.csrfToken) this.csrfToken = payload.data.csrfToken;
    return { response, payload };
  }

  async session() {
    return this.request("/api/v1/auth/session");
  }

  async login(identifier, password) {
    if (!this.csrfToken) await this.session();
    return this.request("/api/v1/auth/login", { method: "POST", json: { identifier, password } });
  }
}

async function createTestUser(transaction, config, roleSlug, username, password) {
  const role = await transaction.role.findUniqueOrThrow({ where: { slug: roleSlug } });
  const id = newId();
  const email = `${username}@cjc.invalid`;
  const passwordHash = await hashPassword(password, config.scrypt);
  await transaction.user.create({
    data: {
      id,
      username,
      usernameNormalized: normalizeIdentifier(username),
      displayName: `${role.name} Integration Test`,
      email,
      emailNormalized: normalizeIdentifier(email),
      passwordHash,
      status: "ACTIVE",
      mustChangePassword: false,
      userRoles: { create: { roleId: role.id, isPrimary: true } }
    }
  });
  return { id, username, email, password };
}

test("Program head can view the ECE curriculum dashboard and assign a default curriculum subject", { timeout: 90_000 }, async () => {
  const prisma = createDatabase();
  const rollback = new Error("ROLLBACK_PROGRAM_HEAD_LEGACY_TEST");
  try {
    await prisma.$transaction(async (transaction) => {
    const config = createConfig({
      nodeEnv: "test",
      appOrigin: expectedOrigin,
      publicRoot: projectRoot,
      auditPepper: "program-head-audit-pepper",
      scryptN: 1 << 10,
      cleanupIntervalMs: 60_000
    });
    const suffix = newId().slice(0, 8);
    const password = "Correct horse battery 2026";
    const programHeadUser = await createTestUser(transaction, config, "program_head", `ph.${suffix}`, password);

    const college = await transaction.college.create({
      data: { id: newId(), code: `ECE${suffix}`, codeNormalized: normalizeIdentifier(`ECE${suffix}`), name: "School of Engineering" }
    });
    const department = await transaction.department.create({
      data: { id: newId(), collegeId: college.id, code: `ECE${suffix}`, name: "Electronics Engineering" }
    });
    const program = await transaction.program.create({
      data: {
        id: newId(),
        departmentId: department.id,
        code: `BSECE${suffix}`,
        codeNormalized: normalizeIdentifier(`BSECE${suffix}`),
        name: "Bachelor of Science in Electronics Engineering",
        credential: "Bachelor Degree",
        durationYears: 4,
        termsPerYear: 2
      }
    });
    const faculty = await transaction.faculty.create({
      data: {
        id: newId(),
        userId: programHeadUser.id,
        employeeNumber: `PH-${suffix}`,
        employeeNumberNormalized: normalizeIdentifier(`PH-${suffix}`),
        departmentId: department.id,
        firstName: "Program",
        lastName: "Head"
      }
    });
    await transaction.programHeadAssignment.create({
      data: {
        id: newId(),
        programId: program.id,
        facultyId: faculty.id,
        startsOn: new Date("2025-01-01")
      }
    });
    const subject = await transaction.subject.create({
      data: {
        id: newId(),
        departmentId: department.id,
        code: `ECE${suffix}101`,
        codeNormalized: normalizeIdentifier(`ECE${suffix}101`),
        title: "Fundamentals of Electronics",
        description: "Introductory electronics course",
        defaultCreditUnits: 3,
        defaultLectureHours: 3,
        defaultLaboratoryHours: 0
      }
    });

    const app = await createApp({ config, database: transaction });
    const server = createServer(app.handler);
    await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    try {
      const client = new Client(baseUrl);
      const loginResult = await client.login(programHeadUser.username, password);
      assert.equal(loginResult.response.status, 200, "program head account logs in");

      const dashboard = await client.request("/api/v1/program-head/dashboard");
      assert.equal(dashboard.response.status, 200, "program head dashboard loads");
      assert.equal(dashboard.payload.data.dashboard.program.name, program.name, "dashboard resolves assigned program");

      const catalog = await client.request("/api/v1/program-head/subjects?query=Fundamentals");
      assert.equal(catalog.response.status, 200, "program head subject catalog endpoint loads");
      assert.ok(catalog.payload.data.subjects.some((item) => item.id === subject.id), "catalog returns the matching reusable subject");

      const curriculum = await client.request("/api/v1/program-head/curricula", {
        method: "POST",
        json: {
          programId: program.id,
          code: `ECE-${suffix}`,
          name: `ECE Prospectus ${suffix}`,
          version: 1,
          effectiveFromYear: 2026,
          status: "DRAFT"
        }
      });
      assert.equal(curriculum.response.status, 201, "program head creates the ECE curriculum");
      const curriculumId = curriculum.payload.data.curriculum.id;

      const assignment = await client.request(`/api/v1/program-head/curricula/${curriculumId}/subjects`, {
        method: "POST",
        json: {
          subjectId: subject.id,
          yearLevel: 1,
          termNumber: 1,
          creditUnits: 3,
          lectureHours: 3,
          laboratoryHours: 0,
          type: "REQUIRED"
        }
      });
      assert.equal(assignment.response.status, 201, "program head assigns a required subject to the curriculum");
      assert.equal(assignment.payload.data.entry.subject.title, subject.title, "subject assignment reflects the chosen subject");
    } finally {
      await new Promise((resolveClose) => server.close(resolveClose));
      await app.close();
    }
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    await prisma.$disconnect();
  }
});

test("Admin-created Program Head is assigned to one program and cannot see another program", { timeout: 90_000 }, async () => {
  const prisma = createDatabase();
  const rollback = new Error("ROLLBACK_PROGRAM_HEAD_ACCOUNT_ASSIGNMENT_TEST");
  try {
    await prisma.$transaction(async (transaction) => {
      const config = createConfig({
        nodeEnv: "test",
        appOrigin: expectedOrigin,
        publicRoot: projectRoot,
        auditPepper: "program-head-account-audit-pepper",
        scryptN: 1 << 10,
        cleanupIntervalMs: 60_000
      });
      const suffix = newId().slice(0, 8);
      const password = "Correct horse battery 2026";
      const administrator = await createTestUser(transaction, config, "administrator", `admin.ph.${suffix}`, password);

      const college = await transaction.college.create({
        data: { id: newId(), code: `COE${suffix}`, codeNormalized: normalizeIdentifier(`COE${suffix}`), name: "College of Engineering" }
      });
      const eceDepartment = await transaction.department.create({
        data: { id: newId(), collegeId: college.id, code: `ECE${suffix}`, name: "Electronics Engineering" }
      });
      const ceDepartment = await transaction.department.create({
        data: { id: newId(), collegeId: college.id, code: `CE${suffix}`, name: "Civil Engineering" }
      });
      const eceProgram = await transaction.program.create({
        data: {
          id: newId(), departmentId: eceDepartment.id, code: `BSECE${suffix}`,
          codeNormalized: normalizeIdentifier(`BSECE${suffix}`), name: "Electronics Engineering",
          credential: "Bachelor Degree", durationYears: 4, termsPerYear: 2
        }
      });
      const ceProgram = await transaction.program.create({
        data: {
          id: newId(), departmentId: ceDepartment.id, code: `BSCE${suffix}`,
          codeNormalized: normalizeIdentifier(`BSCE${suffix}`), name: "Civil Engineering",
          credential: "Bachelor Degree", durationYears: 4, termsPerYear: 2
        }
      });
      await transaction.curriculum.createMany({
        data: [
          { id: newId(), programId: eceProgram.id, code: `ECE-CUR-${suffix}`, name: "ECE Curriculum", version: 1, effectiveFromYear: 2026 },
          { id: newId(), programId: ceProgram.id, code: `CE-CUR-${suffix}`, name: "CE Curriculum", version: 1, effectiveFromYear: 2026 }
        ]
      });
      await transaction.student.createMany({
        data: [
          {
            id: newId(), studentNumber: `ECE-${suffix}`, studentNumberNormalized: normalizeIdentifier(`ECE-${suffix}`),
            programId: eceProgram.id, firstName: "Electronics", lastName: "Student", admissionYear: 2026
          },
          {
            id: newId(), studentNumber: `CE-${suffix}`, studentNumberNormalized: normalizeIdentifier(`CE-${suffix}`),
            programId: ceProgram.id, firstName: "Civil", lastName: "Student", admissionYear: 2026
          }
        ]
      });
      const academicYear = await transaction.academicYear.create({
        data: {
          id: newId(), code: `PH-AY-${suffix}`, name: `Program Head AY ${suffix}`,
          startsOn: new Date("2032-08-01"), endsOn: new Date("2033-05-31")
        }
      });
      const academicTerm = await transaction.academicTerm.create({
        data: {
          id: newId(), academicYearId: academicYear.id, code: `PH-TERM-${suffix}`,
          name: "First Semester", termNumber: 1,
          startsOn: new Date("2032-08-01"), endsOn: new Date("2032-12-20")
        }
      });
      const eceSubject = await transaction.subject.create({
        data: {
          id: newId(), departmentId: eceDepartment.id, code: `ECE101${suffix}`,
          codeNormalized: normalizeIdentifier(`ECE101${suffix}`), title: "ECE Fundamentals", defaultCreditUnits: 3
        }
      });
      const ceSubject = await transaction.subject.create({
        data: {
          id: newId(), departmentId: ceDepartment.id, code: `CE101${suffix}`,
          codeNormalized: normalizeIdentifier(`CE101${suffix}`), title: "CE Fundamentals", defaultCreditUnits: 3
        }
      });
      const eceSection = await transaction.classSection.create({
        data: { id: newId(), academicTermId: academicTerm.id, programId: eceProgram.id, code: `ECE-1A-${suffix}`, yearLevel: 1 }
      });
      const ceSection = await transaction.classSection.create({
        data: { id: newId(), academicTermId: academicTerm.id, programId: ceProgram.id, code: `CE-1A-${suffix}`, yearLevel: 1 }
      });
      await transaction.courseOffering.createMany({
        data: [
          { id: newId(), academicTermId: academicTerm.id, subjectId: eceSubject.id, classSectionId: eceSection.id, offeringCode: `ECE-OFFER-${suffix}`, creditUnits: 3 },
          { id: newId(), academicTermId: academicTerm.id, subjectId: ceSubject.id, classSectionId: ceSection.id, offeringCode: `CE-OFFER-${suffix}`, creditUnits: 3 }
        ]
      });

      const app = await createApp({ config, database: transaction });
      const server = createServer(app.handler);
      await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
      const address = server.address();
      const baseUrl = `http://127.0.0.1:${address.port}`;

      try {
        const adminClient = new Client(baseUrl);
        assert.equal((await adminClient.login(administrator.username, password)).response.status, 200);

        const missingProgram = await adminClient.request("/api/v1/admin/users", {
          method: "POST",
          json: {
            displayName: "Missing Program Head", username: `missing.ph.${suffix}`,
            password, role: "program_head", mustChangePassword: false
          }
        });
        assert.equal(missingProgram.response.status, 422, "Program Head requires a program");
        assert.equal(missingProgram.payload.error.code, "PROGRAM_REQUIRED");

        const nongenericRole = await adminClient.request("/api/v1/admin/users", {
          method: "POST",
          json: {
            displayName: "Faculty Role", username: `faculty.create.${suffix}`,
            password, role: "faculty", mustChangePassword: false
          }
        });
        assert.equal(nongenericRole.response.status, 422, "account creation exposes only generic roles");

        const created = await adminClient.request("/api/v1/admin/users", {
          method: "POST",
          json: {
            displayName: "ECE Program Head", username: `direct.ph.${suffix}`,
            email: `direct.ph.${suffix}@cjc.invalid`, password, role: "program_head",
            programId: eceProgram.id, mustChangePassword: false
          }
        });
        assert.equal(created.response.status, 201, "Admin creates Program Head with a program");
        assert.equal(created.payload.data.user.assignedProgram.id, eceProgram.id);
        const programHeadUserId = created.payload.data.user.id;
        const storedAssignment = await transaction.userProgramAssignment.findUniqueOrThrow({ where: { userId: programHeadUserId } });
        assert.equal(storedAssignment.programId, eceProgram.id);

        for (const role of ["registrar", "cashier", "administrator", "student"]) {
          const account = await adminClient.request("/api/v1/admin/users", {
            method: "POST",
            json: {
              displayName: `${role} Generic Account`, username: `${role}.${suffix}`,
              password, role, programId: ceProgram.id, mustChangePassword: false
            }
          });
          assert.equal(account.response.status, 201, `${role} account does not require a program`);
          assert.equal(
            await transaction.userProgramAssignment.findUnique({ where: { userId: account.payload.data.user.id } }),
            null,
            `${role} account stores no program assignment`
          );
        }

        const programHeadClient = new Client(baseUrl);
        assert.equal((await programHeadClient.login(`direct.ph.${suffix}`, password)).response.status, 200);
        const dashboard = await programHeadClient.request("/api/v1/program-head/dashboard");
        assert.equal(dashboard.response.status, 200);
        assert.equal(dashboard.payload.data.dashboard.program.id, eceProgram.id);
        assert.deepEqual(dashboard.payload.data.dashboard.curricula.map((item) => item.programId ?? eceProgram.id), [eceProgram.id]);
        assert.deepEqual(dashboard.payload.data.dashboard.students.map((item) => item.firstName), ["Electronics"]);
        assert.deepEqual(dashboard.payload.data.dashboard.courseOfferings.map((item) => item.classSection.programId), [eceProgram.id]);

        const createdCurriculum = await programHeadClient.request("/api/v1/program-head/curricula", {
          method: "POST",
          json: {
            code: `ADMIN-PH-${suffix}`,
            name: "Admin-created Program Head Curriculum",
            version: 1,
            effectiveFromYear: 2028,
            status: "DRAFT"
          }
        });
        assert.equal(createdCurriculum.response.status, 201, "Admin-created Program Head creates a curriculum");
        assert.equal(createdCurriculum.payload.data.curriculum.programId, eceProgram.id, "new curriculum uses the assigned Program UUID");

        const refreshedDashboard = await programHeadClient.request("/api/v1/program-head/dashboard");
        assert.equal(refreshedDashboard.response.status, 200);
        assert.ok(
          refreshedDashboard.payload.data.dashboard.curricula.some((item) => item.id === createdCurriculum.payload.data.curriculum.id),
          "new curriculum appears after the Program Head dashboard reloads"
        );

        const forbidden = await programHeadClient.request("/api/v1/program-head/curricula", {
          method: "POST",
          json: {
            programId: ceProgram.id, code: `FORBIDDEN-${suffix}`, name: "Forbidden Curriculum",
            version: 2, effectiveFromYear: 2027, status: "DRAFT"
          }
        });
        assert.equal(forbidden.response.status, 403, "Program Head cannot manage another program");
      } finally {
        await new Promise((resolveClose) => server.close(resolveClose));
        await app.close();
      }
      throw rollback;
    }, { timeout: 60_000, maxWait: 10_000 });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    await prisma.$disconnect();
  }
});

test("Program Head workflow opens scoped offerings and enforces enrollment academic rules", { timeout: 90_000 }, async () => {
  const prisma = createDatabase();
  const rollback = new Error("ROLLBACK_PROGRAM_HEAD_WORKFLOW_TEST");
  try {
    await prisma.$transaction(async (transaction) => {
      const config = createConfig({ nodeEnv: "test", appOrigin: expectedOrigin, publicRoot: projectRoot, auditPepper: "ph-workflow", scryptN: 1 << 10 });
      const suffix = newId().slice(0, 8);
      const user = await createTestUser(transaction, config, "program_head", `ph.workflow.${suffix}`, "Correct horse battery 2026");
      const college = await transaction.college.create({ data: { id: newId(), code: `WF${suffix}`, codeNormalized: normalizeIdentifier(`WF${suffix}`), name: "Workflow College" } });
      const department = await transaction.department.create({ data: { id: newId(), collegeId: college.id, code: `WFD${suffix}`, name: "Workflow Department" } });
      const program = await transaction.program.create({
        data: { id: newId(), departmentId: department.id, code: `WFP${suffix}`, codeNormalized: normalizeIdentifier(`WFP${suffix}`), name: "Workflow Program", credential: "BS", durationYears: 4, termsPerYear: 2 }
      });
      await transaction.userProgramAssignment.create({ data: { id: newId(), userId: user.id, programId: program.id } });
      const curriculum = await transaction.curriculum.create({
        data: { id: newId(), programId: program.id, code: `WFC${suffix}`, name: "Workflow Curriculum", version: 1, effectiveFromYear: 2034 }
      });
      const prerequisite = await transaction.subject.create({
        data: { id: newId(), departmentId: department.id, code: `PRE${suffix}`, codeNormalized: normalizeIdentifier(`PRE${suffix}`), title: "Prerequisite", defaultCreditUnits: 3 }
      });
      const advanced = await transaction.subject.create({
        data: { id: newId(), departmentId: department.id, code: `ADV${suffix}`, codeNormalized: normalizeIdentifier(`ADV${suffix}`), title: "Advanced Subject", defaultCreditUnits: 3 }
      });
      const overload = await transaction.subject.create({
        data: { id: newId(), departmentId: department.id, code: `MAX${suffix}`, codeNormalized: normalizeIdentifier(`MAX${suffix}`), title: "Overload Subject", defaultCreditUnits: 30 }
      });
      await transaction.curriculumSubject.createMany({ data: [
        { id: newId(), curriculumId: curriculum.id, subjectId: prerequisite.id, yearLevel: 1, termNumber: 1, creditUnits: 3 },
        { id: newId(), curriculumId: curriculum.id, subjectId: advanced.id, yearLevel: 1, termNumber: 2, creditUnits: 3 },
        { id: newId(), curriculumId: curriculum.id, subjectId: overload.id, yearLevel: 1, termNumber: 2, creditUnits: 30 }
      ] });
      await transaction.subjectRequirement.create({ data: { id: newId(), subjectId: advanced.id, requiredSubjectId: prerequisite.id, type: "PREREQUISITE" } });
      const academicYear = await transaction.academicYear.create({
        data: { id: newId(), code: `WFAY${suffix}`, name: "Workflow AY", startsOn: new Date("2034-01-01"), endsOn: new Date("2034-12-31") }
      });
      const priorTerm = await transaction.academicTerm.create({
        data: { id: newId(), academicYearId: academicYear.id, code: `WFT1${suffix}`, name: "First Term", termNumber: 1, startsOn: new Date("2034-01-01"), endsOn: new Date("2034-05-31") }
      });
      const currentTerm = await transaction.academicTerm.create({
        data: { id: newId(), academicYearId: academicYear.id, code: `WFT2${suffix}`, name: "Second Term", termNumber: 2, startsOn: new Date("2034-06-01"), endsOn: new Date("2034-10-31"), status: "ENROLLMENT_OPEN" }
      });
      const priorSection = await transaction.classSection.create({ data: { id: newId(), academicTermId: priorTerm.id, programId: program.id, curriculumId: curriculum.id, code: `WF1${suffix}`, yearLevel: 1 } });
      const currentSection = await transaction.classSection.create({ data: { id: newId(), academicTermId: currentTerm.id, programId: program.id, curriculumId: curriculum.id, code: `WF2${suffix}`, yearLevel: 1 } });
      const priorOffering = await transaction.courseOffering.create({ data: { id: newId(), academicTermId: priorTerm.id, subjectId: prerequisite.id, classSectionId: priorSection.id, offeringCode: `PRE-O${suffix}`, creditUnits: 3 } });
      const advancedOffering = await transaction.courseOffering.create({ data: { id: newId(), academicTermId: currentTerm.id, subjectId: advanced.id, classSectionId: currentSection.id, offeringCode: `ADV-O${suffix}`, creditUnits: 3 } });
      const overloadOffering = await transaction.courseOffering.create({ data: { id: newId(), academicTermId: currentTerm.id, subjectId: overload.id, classSectionId: currentSection.id, offeringCode: `MAX-O${suffix}`, creditUnits: 30 } });
      const student = await transaction.student.create({
        data: { id: newId(), studentNumber: `WF-${suffix}`, studentNumberNormalized: normalizeIdentifier(`WF-${suffix}`), programId: program.id, curriculumId: curriculum.id, firstName: "Workflow", lastName: "Student", admissionYear: 2034 }
      });
      const priorEnrollment = await transaction.enrollment.create({ data: { id: newId(), studentId: student.id, academicTermId: priorTerm.id, programId: program.id, curriculumId: curriculum.id, yearLevel: 1, status: "COMPLETED" } });
      const priorItem = await transaction.enrollmentItem.create({ data: { id: newId(), enrollmentId: priorEnrollment.id, courseOfferingId: priorOffering.id, status: "COMPLETED" } });
      const gradingPeriod = await transaction.gradingPeriod.create({ data: { id: newId(), academicTermId: priorTerm.id, code: `FINAL${suffix}`, name: "Final", type: "FINAL", sequence: 1, isFinal: true } });
      const grade = await transaction.grade.create({ data: { id: newId(), enrollmentItemId: priorItem.id, gradingPeriodId: gradingPeriod.id, letterGrade: "INC", isPassing: false, status: "POSTED" } });
      const enrollment = await transaction.enrollment.create({ data: { id: newId(), studentId: student.id, academicTermId: currentTerm.id, programId: program.id, curriculumId: curriculum.id, yearLevel: 1, status: "PENDING" } });
      const advancedItem = await transaction.enrollmentItem.create({ data: { id: newId(), enrollmentId: enrollment.id, courseOfferingId: advancedOffering.id } });

      const store = new ProgramHeadStore(transaction);
      const catalog = await store.subjectCatalog(user.id, "Advanced");
      assert.ok(catalog.some((subject) => subject.id === advanced.id), "catalog search returns reusable subjects");
      const opened = await store.createOffering(user.id, {
        academicTermId: currentTerm.id, curriculumId: curriculum.id, subjectId: prerequisite.id,
        sectionCode: `WF-NEW-${suffix}`, offeringCode: `PRE-NEW-${suffix}`, capacity: 35
      });
      assert.equal(opened.classSection.programId, program.id, "new offering remains scoped to assigned program");

      const incEvaluation = await store.enrollmentEvaluation(user.id, enrollment.id);
      assert.ok(incEvaluation.blockingIssues.some((issue) => issue.code === "INC_RESTRICTION"), "unresolved INC blocks evaluation");
      await assert.rejects(
        store.approveEnrollmentEvaluation(user.id, enrollment.id, { overrideItemIds: [advancedItem.id], overrideReason: "Approved exception" }),
        (error) => error.message === "ENROLLMENT_RULES_FAILED" && error.details.blockingIssues.some((issue) => issue.code === "INC_RESTRICTION")
      );

      await transaction.grade.update({ where: { id: grade.id }, data: { letterGrade: "5.0", remarks: null, isPassing: false } });
      const missingPrerequisite = await store.enrollmentEvaluation(user.id, enrollment.id);
      assert.deepEqual(missingPrerequisite.blockingIssues.map((issue) => issue.code), ["MISSING_PREREQUISITE"]);
      const approved = await store.approveEnrollmentEvaluation(user.id, enrollment.id, { overrideItemIds: [advancedItem.id], overrideReason: "Dean-approved prerequisite exception" });
      assert.equal(approved.enrollment.status, "ASSESSED");
      assert.equal((await transaction.enrollmentItem.findUniqueOrThrow({ where: { id: advancedItem.id } })).overrideApprovedByUserId, user.id);

      const overloadStudent = await transaction.student.create({
        data: { id: newId(), studentNumber: `MAX-${suffix}`, studentNumberNormalized: normalizeIdentifier(`MAX-${suffix}`), programId: program.id, curriculumId: curriculum.id, firstName: "Overload", lastName: "Student", admissionYear: 2034 }
      });
      const overloadEnrollment = await transaction.enrollment.create({ data: { id: newId(), studentId: overloadStudent.id, academicTermId: currentTerm.id, programId: program.id, curriculumId: curriculum.id, yearLevel: 1, status: "PENDING" } });
      await transaction.enrollmentItem.create({ data: { id: newId(), enrollmentId: overloadEnrollment.id, courseOfferingId: overloadOffering.id } });
      const overloadEvaluation = await store.enrollmentEvaluation(user.id, overloadEnrollment.id);
      assert.ok(overloadEvaluation.blockingIssues.some((issue) => issue.code === "MAX_UNITS_EXCEEDED"), "29-unit maximum is enforced");
      throw rollback;
    }, { timeout: 60_000, maxWait: 10_000 });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    await prisma.$disconnect();
  }
});
