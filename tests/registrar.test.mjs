import assert from "node:assert/strict";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createApp } from "../server/app.mjs";
import { createConfig } from "../server/config.mjs";
import { createDatabase } from "../server/db.mjs";
import { hashPassword, newId, normalizeIdentifier } from "../server/security.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const expectedOrigin = "http://portal.test";

class Client {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookie = "";
    this.csrfToken = "";
    this.lastSetCookie = "";
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
    this.lastSetCookie = setCookie ?? "";
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

async function createAcademicTerm(transaction, suffix) {
  const year = await transaction.academicYear.create({
    data: {
      id: newId(),
      code: `TEST-AY-${suffix}`,
      name: `Test Academic Year ${suffix}`,
      startsOn: new Date("2030-08-01"),
      endsOn: new Date("2031-05-31")
    }
  });
  return transaction.academicTerm.create({
    data: {
      id: newId(),
      academicYearId: year.id,
      code: `TEST-TERM-${suffix}`,
      name: `First Semester, Test ${suffix}`,
      termNumber: 1,
      startsOn: new Date("2030-08-01"),
      endsOn: new Date("2030-12-18")
    },
    include: { academicYear: true }
  });
}

async function createStudentProfile(transaction, userId, suffix) {
  const college = await transaction.college.create({
    data: { id: newId(), code: `TST-${suffix}`, codeNormalized: normalizeIdentifier(`TST-${suffix}`), name: "Test College" }
  });
  const department = await transaction.department.create({
    data: { id: newId(), collegeId: college.id, code: `TSTD-${suffix}`, name: "Test Department" }
  });
  const program = await transaction.program.create({
    data: {
      id: newId(),
      departmentId: department.id,
      code: `TSP-${suffix}`,
      codeNormalized: normalizeIdentifier(`TSP-${suffix}`),
      name: "Test Program",
      credential: "Bachelor Degree",
      durationYears: 4
    }
  });
  const curriculum = await transaction.curriculum.create({
    data: {
      id: newId(), programId: program.id, code: `SY2023-${suffix}`,
      version: 1, effectiveFromYear: 2023, name: "Test Curriculum", status: "DRAFT"
    }
  });
  const subject = await transaction.subject.create({
    data: {
      id: newId(), programId: program.id, departmentId: department.id, code: `SUB-${suffix}`, codeNormalized: normalizeIdentifier(`SUB-${suffix}`),
      title: "Test Subject", defaultCreditUnits: 3, defaultLectureHours: 3, status: "ACTIVE"
    }
  });
  const profileSubject = await transaction.curriculumSubject.create({
    data: {
      id: newId(), curriculumId: curriculum.id, subjectId: subject.id, yearLevel: 1, termNumber: 1,
      creditUnits: 3, lectureHours: 3, type: "REQUIRED"
    }
  });
  const subject2 = await transaction.subject.create({
    data: {
      id: newId(), programId: program.id, departmentId: department.id, code: `SUB2-${suffix}`, codeNormalized: normalizeIdentifier(`SUB2-${suffix}`),
      title: "Test Subject 2", defaultCreditUnits: 3, defaultLectureHours: 3, status: "ACTIVE"
    }
  });
  const profileSubject2 = await transaction.curriculumSubject.create({
    data: {
      id: newId(), curriculumId: curriculum.id, subjectId: subject2.id, yearLevel: 1, termNumber: 2,
      creditUnits: 3, lectureHours: 3, type: "REQUIRED"
    }
  });
  const student = await transaction.student.create({
    data: {
      userId,
      studentNumber: `TEST-${suffix}`,
      studentNumberNormalized: `test-${suffix}`,
      firstName: "Student",
      lastName: "Integration Test",
      admissionYear: 2026,
      currentYearLevel: 1,
      programId: program.id,
      status: "ACTIVE"
    }
  });
  return { college, department, program, student, profileSubject, profileSubject2 };
}

async function recordVerifiedEnrollmentFee(transaction, obligation, studentId, enrollmentPeriodId, suffix) {
  const payment = await transaction.paymentTransaction.create({
    data: {
      id: newId(),
      obligationId: obligation.id,
      studentId,
      enrollmentPeriodId,
      gatewayName: "INTEGRATION_TEST",
      gatewayTransactionReference: `TEST-${suffix}-${newId().slice(0, 8)}`,
      paymentMethod: "ONLINE",
      amountPaid: obligation.amountDue,
      status: "VERIFIED",
      verifiedAt: new Date()
    }
  });
  await transaction.studentObligation.update({ where: { id: obligation.id }, data: { status: "PAID" } });
  return payment;
}

async function isolateOpenEnrollmentPeriodForTest(transaction) {
  await transaction.enrollmentPeriod.updateMany({
    where: { status: "OPEN" },
    data: { status: "CLOSED", closedAt: new Date() }
  });
  await transaction.academicTerm.updateMany({
    where: { status: "ENROLLMENT_OPEN" },
    data: { status: "CLOSED" }
  });
}

test("Student enrollment options include the official DRAFT curriculum for the active program", { timeout: 60_000 }, async () => {
  const prisma = createDatabase();
  const rollback = new Error("ROLLBACK_DRAFT_CURRICULUM_TEST");
  try {
    await prisma.$transaction(async (transaction) => {
      const config = createConfig({
        nodeEnv: "test",
        appOrigin: expectedOrigin,
        publicRoot: projectRoot,
        auditPepper: "test-audit-pepper-that-is-long-and-private",
        scryptN: 1 << 10,
        cleanupIntervalMs: 60_000
      });
      const suffix = newId().slice(0, 8);
      const password = "Correct horse battery 2026";
      const studentUser = await createTestUser(transaction, config, "student", `draft.curriculum.${suffix}`, password);
      const { program } = await createStudentProfile(transaction, studentUser.id, `draft-${suffix}`);
      const curriculum = await transaction.curriculum.create({
        data: {
          id: newId(),
          programId: program.id,
          code: "SY2023",
          name: "Bachelor of Science in Electronics and Communication Engineering",
          version: 1,
          effectiveFromYear: 2023,
          status: "DRAFT"
        }
      });
      const subject = await transaction.subject.create({
        data: {
          id: newId(),
          programId: program.id,
          departmentId: (await transaction.department.findFirstOrThrow({ where: { id: program.departmentId } })).id,
          code: `DRAFT-SUB-${suffix}`,
          codeNormalized: normalizeIdentifier(`DRAFT-SUB-${suffix}`),
          title: "Draft Curriculum Subject",
          defaultCreditUnits: 3,
          defaultLectureHours: 3,
          defaultLaboratoryHours: 0,
          status: "ACTIVE",
          isActive: true
        }
      });
      await transaction.curriculumSubject.createMany({
        data: [
          {
            id: newId(),
            curriculumId: curriculum.id,
            subjectId: subject.id,
            yearLevel: 1,
            termNumber: 1,
            creditUnits: 3,
            lectureHours: 3,
            laboratoryHours: 0,
            type: "REQUIRED",
            isRequired: true,
            sortOrder: 1
          }
        ]
      });
      const app = await createApp({ config, database: transaction });
      const server = createServer(app.handler);
      await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
      const address = server.address();
      const baseUrl = `http://127.0.0.1:${address.port}`;
      try {
        const studentClient = new Client(baseUrl);
        await studentClient.login(studentUser.username, password);
        const options = await studentClient.request("/api/v1/student/enrollment/options");
        assert.equal(options.response.status, 200, "options endpoint responds");
        assert.ok(options.payload.data.curriculumSubjects.some((item) => item.programId === program.id && item.curriculumCode === "SY2023"), "official draft curriculum is exposed to student enrollment");
        throw rollback;
      } finally {
        await new Promise((resolveClose) => server.close(resolveClose));
        await app.close();
      }
    });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    await prisma.$disconnect();
  }
});

const completeFormData = () => ({
  personal: {
    fullName: "Student Integration Test", birthday: "2005-04-11", sex: "Female",
    civilStatus: "Single", nationality: "Filipino", religion: "Roman Catholic", placeOfBirth: "Cagayan de Oro"
  },
  contact: {
    mobileNumber: "09170000000", personalEmail: "student.test@cjc.invalid",
    presentAddress: "Test Address", permanentAddress: "Test Address"
  },
  emergency: { name: "Guardian Test", relationship: "Parent", contactNumber: "09180000000" }
});

test("Student enrollment accepts curriculum-subject IDs from the selected curriculum", { timeout: 60_000 }, async () => {
  const prisma = createDatabase();
  const rollback = new Error("ROLLBACK_LEGACY_SUBJECT_ID_TEST");
  try {
    await prisma.$transaction(async (transaction) => {
      const config = createConfig({
        nodeEnv: "test",
        appOrigin: expectedOrigin,
        publicRoot: projectRoot,
        auditPepper: "test-audit-pepper-that-is-long-and-private",
        scryptN: 1 << 10,
        cleanupIntervalMs: 60_000
      });
      const suffix = newId().slice(0, 8);
      const password = "Correct horse battery 2026";
      const studentUser = await createTestUser(transaction, config, "student", `legacy.curriculum.${suffix}`, password);
      const { program, student, profileSubject, profileSubject2 } = await createStudentProfile(transaction, studentUser.id, `legacy-${suffix}`);
      const term = await createAcademicTerm(transaction, `legacy-${suffix}`);
      const curriculum = await transaction.curriculum.create({
        data: {
          id: newId(),
          programId: program.id,
          code: "SY2023",
          name: "Bachelor of Science in Electronics and Communication Engineering",
          version: 1,
          effectiveFromYear: 2023,
          status: "DRAFT"
        }
      });
      const subject = await transaction.subject.create({
        data: {
          id: newId(),
          programId: program.id,
          departmentId: (await transaction.department.findFirstOrThrow({ where: { id: program.departmentId } })).id,
          code: `LEGACY-SUB-${suffix}`,
          codeNormalized: normalizeIdentifier(`LEGACY-SUB-${suffix}`),
          title: "Legacy Curriculum Subject",
          defaultCreditUnits: 3,
          defaultLectureHours: 3,
          defaultLaboratoryHours: 0,
          status: "ACTIVE",
          isActive: true
        }
      });
      const curriculumSubject = await transaction.curriculumSubject.create({
        data: {
          id: newId(),
          curriculumId: curriculum.id,
          subjectId: subject.id,
          yearLevel: 1,
          termNumber: 1,
          creditUnits: 3,
          lectureHours: 3,
          laboratoryHours: 0,
          type: "REQUIRED",
          isRequired: true,
          sortOrder: 1
        }
      });
      await isolateOpenEnrollmentPeriodForTest(transaction);
      await transaction.enrollmentPeriod.create({
        data: {
          id: newId(),
          academicYearId: term.academicYearId,
          academicTermId: term.id,
          status: "OPEN",
          openedByUserId: null,
          openedAt: new Date()
        }
      });
      const entranceFee = await transaction.paymentType.findFirstOrThrow({
        where: { name: "Entrance Fee", isActive: true }
      });
      const obligation = await transaction.studentObligation.findFirst({
        where: { studentId: student.id, academicTermId: term.id, paymentTypeId: entranceFee.id }
      }) ?? await transaction.studentObligation.create({
        data: {
          id: newId(),
          studentId: student.id,
          paymentTypeId: entranceFee.id,
          academicYearId: term.academicYearId,
          academicTermId: term.id,
          amountDue: 1500,
          status: "PAID"
        }
      });
      await transaction.paymentTransaction.create({
        data: {
          id: newId(),
          obligationId: obligation.id,
          studentId: student.id,
          enrollmentPeriodId: (await transaction.enrollmentPeriod.findFirstOrThrow({ where: { academicTermId: term.id } })).id,
          gatewayName: "INTEGRATION_TEST",
          gatewayTransactionReference: `LEGACY-${suffix}`,
          paymentMethod: "ONLINE",
          amountPaid: obligation.amountDue,
          status: "VERIFIED",
          verifiedAt: new Date()
        }
      });
      const app = await createApp({ config, database: transaction });
      const server = createServer(app.handler);
      await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
      const address = server.address();
      const baseUrl = `http://127.0.0.1:${address.port}`;
      try {
        const studentClient = new Client(baseUrl);
        await studentClient.login(studentUser.username, password);
        const options = await studentClient.request("/api/v1/student/enrollment/options");
        const offeredSubject = options.payload.data.curriculumSubjects.find((item) => item.id === curriculumSubject.id);
        assert.ok(offeredSubject, "the curriculum subject is returned by the system-generated eligible-subject list");

        const arbitrarySelection = await studentClient.request("/api/v1/student/enrollment/submit", {
          method: "POST",
          json: {
            programId: program.id,
            academicTermId: term.id,
            yearLevel: 1,
            selectedSubjectIds: [newId()],
            formData: completeFormData()
          }
        });
        assert.equal(arbitrarySelection.response.status, 422, "arbitrary subject IDs remain rejected");
        assert.equal(arbitrarySelection.payload.error.code, "SUBJECT_SELECTION_INVALID");

        const response = await studentClient.request("/api/v1/student/enrollment/submit", {
          method: "POST",
          json: {
            programId: program.id,
            academicTermId: term.id,
            yearLevel: 1,
            selectedSubjectIds: [offeredSubject.id],
            formData: completeFormData()
          }
        });
        assert.equal(response.response.status, 200, "curriculum-subject IDs from the eligible list are accepted on submit");
        assert.equal(response.payload.data.application.status, "SUBMITTED");
        throw rollback;
      } finally {
        await new Promise((resolveClose) => server.close(resolveClose));
        await app.close();
      }
    });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    await prisma.$disconnect();
  }
});

test("Registrar manages terms, open/close scheduling, and admin-approved removal without history loss", { timeout: 90_000 }, async () => {
  const prisma = createDatabase();
  const rollback = new Error("ROLLBACK_TERM_MANAGEMENT_TEST");
  try {
    await prisma.$transaction(async (transaction) => {
      await isolateOpenEnrollmentPeriodForTest(transaction);
      const config = createConfig({
        nodeEnv: "test",
        appOrigin: expectedOrigin,
        publicRoot: projectRoot,
        auditPepper: "test-audit-pepper-that-is-long-and-private",
        scryptN: 1 << 10,
        cleanupIntervalMs: 60_000
      });
      const suffix = newId().slice(0, 8);
      const password = "Correct horse battery 2026";
      const registrar = await createTestUser(transaction, config, "registrar", `term.registrar.${suffix}`, password);
      const admin = await createTestUser(transaction, config, "administrator", `term.admin.${suffix}`, password);
      const studentUser = await createTestUser(transaction, config, "student", `term.student.${suffix}`, password);
      const { student } = await createStudentProfile(transaction, studentUser.id, `term-${suffix}`);
      const app = await createApp({ config, database: transaction });
      const server = createServer(app.handler);
      await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
      const address = server.address();
      const baseUrl = `http://127.0.0.1:${address.port}`;

      try {
        const registrarClient = new Client(baseUrl);
        await registrarClient.login(registrar.username, password);

        const created = await registrarClient.request("/api/v1/registrar/academic-terms", {
          method: "POST",
          json: {
            academicYear: {
              code: `AY-${suffix}`,
              name: `Academic Year ${suffix}`,
              startsOn: "2035-08-01",
              endsOn: "2036-05-31",
              status: "PLANNED"
            },
            code: `TERM-${suffix}`,
            name: `Trimester ${suffix}`,
            termNumber: 1,
            startsOn: "2035-08-01",
            endsOn: "2035-12-18",
            enrollmentStarts: "2035-07-15T00:00:00.000Z",
            enrollmentEnds: "2035-07-31T23:59:59.000Z",
            status: "PLANNED"
          }
        });
        assert.equal(created.response.status, 201, "registrar creates term with inline academic year metadata");
        const term = created.payload.data.term;
        assert.equal(term.status, "PLANNED");

        const updated = await registrarClient.request(`/api/v1/registrar/academic-terms/${term.id}`, {
          method: "PATCH",
          json: {
            name: `Trimester ${suffix} Revised`,
            code: `TERM-${suffix}-R`,
            enrollmentStarts: "2035-07-20T00:00:00.000Z",
            enrollmentEnds: "2035-08-02T23:59:59.000Z",
            status: "ENROLLMENT_OPEN"
          }
        });
        assert.equal(updated.response.status, 200, "registrar updates term metadata and scheduling");
        assert.equal(updated.payload.data.term.name, `Trimester ${suffix} Revised`);
        assert.equal(updated.payload.data.term.code, `TERM-${suffix}-R`);

        const opened = await registrarClient.request("/api/v1/registrar/enrollment-period/open", {
          method: "POST",
          json: { academicTermId: term.id }
        });
        assert.equal(opened.response.status, 200, "registrar opens enrollment");
        assert.equal(opened.payload.data.period.status, "OPEN");

        await transaction.paymentType.upsert({
          where: { name: "Entrance Fee" },
          create: {
            id: newId(),
            name: "Entrance Fee",
            description: "Entrance fee for new students",
            category: "ADMISSION",
            amount: 500,
            isActive: true
          },
          update: {}
        });

        const entranceFeeType = await transaction.paymentType.findFirstOrThrow({ where: { name: "Entrance Fee" }, select: { id: true } });
        const obligation = await transaction.studentObligation.findFirst({
          where: {
            studentId: student.id,
            academicTermId: term.id,
            paymentTypeId: entranceFeeType.id
          }
        }) ?? await transaction.studentObligation.create({
          data: {
            id: newId(),
            studentId: student.id,
            paymentTypeId: entranceFeeType.id,
            academicYearId: (await transaction.academicTerm.findUniqueOrThrow({ where: { id: term.id }, select: { academicYearId: true } })).academicYearId,
            academicTermId: term.id,
            amountDue: 500,
            status: "PAID",
            createdByUserId: registrar.id
          }
        });
        const payment = await transaction.paymentTransaction.create({
          data: {
            id: newId(),
            obligationId: obligation.id,
            studentId: student.id,
            enrollmentPeriodId: opened.payload.data.period.id,
            gatewayName: "INTEGRATION_TEST",
            gatewayTransactionReference: `TERM-${suffix}-${newId().slice(0,8)}`,
            paymentMethod: "ONLINE",
            amountPaid: obligation.amountDue,
            status: "VERIFIED",
            verifiedAt: new Date()
          }
        });

        const removalRequest = await registrarClient.request(`/api/v1/registrar/academic-terms/${term.id}/removal-request`, {
          method: "POST",
          json: { reason: "Duplicate test term" }
        });
        assert.equal(removalRequest.response.status, 201, "registrar submits deletion request");
        assert.equal(removalRequest.payload.data.request.status, "SUBMITTED");

        const adminClient = new Client(baseUrl);
        await adminClient.login(admin.username, password);
        const adminQueue = await adminClient.request("/api/v1/admin/academic-term-removal-requests");
        assert.equal(adminQueue.response.status, 200, "admin can review pending term removal requests");
        assert.equal(adminQueue.payload.data.requests[0].academicTermId, term.id);

        const approved = await adminClient.request(`/api/v1/admin/academic-term-removal-requests/${removalRequest.payload.data.request.id}`, {
          method: "PATCH",
          json: { outcome: "APPROVED", remarks: "Approved for archive" }
        });
        assert.equal(approved.response.status, 200, "admin approval processes removal request");

        const archivedTerm = await transaction.academicTerm.findUniqueOrThrow({ where: { id: term.id } });
        const archivedPeriod = await transaction.enrollmentPeriod.findUniqueOrThrow({ where: { academicTermId: term.id } });
        const keptObligation = await transaction.studentObligation.findUniqueOrThrow({ where: { id: obligation.id } });
        const keptPayment = await transaction.paymentTransaction.findUniqueOrThrow({ where: { id: payment.id } });

        assert.equal(archivedTerm.status, "ARCHIVED", "approval archives the term without deleting its historical record");
        assert.equal(archivedPeriod.status, "CLOSED", "active enrollment period is closed on approval");
        assert.equal(keptObligation.academicTermId, term.id, "student obligation remains linked to original academic term");
        assert.equal(keptPayment.enrollmentPeriodId, opened.payload.data.period.id, "payment remains tied to original enrollment period");
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

test("Registrar controls the enrollment lifecycle and students see the period status", { timeout: 90_000 }, async () => {
  const prisma = createDatabase();
  const rollback = new Error("ROLLBACK_REGISTRAR_INTEGRATION_TEST");
  try {
    await prisma.$transaction(async (transaction) => {
      await isolateOpenEnrollmentPeriodForTest(transaction);
      const config = createConfig({
        nodeEnv: "test",
        appOrigin: expectedOrigin,
        publicRoot: projectRoot,
        auditPepper: "test-audit-pepper-that-is-long-and-private",
        scryptN: 1 << 10,
        cleanupIntervalMs: 60_000
      });
      const suffix = newId().slice(0, 8);
      const password = "Correct horse battery 2026";
      const registrar = await createTestUser(transaction, config, "registrar", `test.registrar.${suffix}`, password);
      const studentUser = await createTestUser(transaction, config, "student", `test.enrollee.${suffix}`, password);
      const lateStudentUser = await createTestUser(transaction, config, "student", `test.lateenrollee.${suffix}`, password);
      const outsider = await createTestUser(transaction, config, "faculty", `test.faculty.${suffix}`, password);
      const term = await createAcademicTerm(transaction, suffix);
      const { program, student, profileSubject, profileSubject2 } = await createStudentProfile(transaction, studentUser.id, suffix);
      const { program: lateProgram, profileSubject: lateProfileSubject, profileSubject2: lateProfileSubject2 } = await createStudentProfile(transaction, lateStudentUser.id, `${suffix}b`);

      await transaction.paymentType.upsert({
        where: { name: "Entrance Fee" },
        create: {
          id: newId(),
          name: "Entrance Fee",
          description: "Entrance fee for new students",
          category: "ADMISSION",
          amount: 500,
          isActive: true
        },
        update: {}
      });

      const app = await createApp({ config, database: transaction });
      const server = createServer(app.handler);
      await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
      const address = server.address();
      const baseUrl = `http://127.0.0.1:${address.port}`;

      try {
        const registrarClient = new Client(baseUrl);
        const login = await registrarClient.login(registrar.username, password);
        assert.equal(login.response.status, 200, "registrar login");
        assert.equal(login.payload.data.user.primaryRole, "registrar");
        assert.equal(login.payload.data.landingPath, "/portal/registrar");

        const dashboard = await registrarClient.request("/api/v1/registrar/dashboard");
        assert.equal(dashboard.response.status, 200, "registrar dashboard access");
        assert.ok(Array.isArray(dashboard.payload.data.terms));
        assert.ok(Array.isArray(dashboard.payload.data.academicYears));
        assert.ok(dashboard.payload.data.applicationCounts);

        const createdTerm = await registrarClient.request("/api/v1/registrar/academic-terms", {
          method: "POST",
          json: {
            academicYearId: term.academicYearId,
            code: `TEST-TERM-2-${suffix}`,
            name: `Summer, Test ${suffix}`,
            termNumber: 2,
            startsOn: "2031-05-01",
            endsOn: "2031-05-31",
            enrollmentStarts: "2031-04-01T00:00:00.000Z",
            enrollmentEnds: "2031-04-30T23:59:59.000Z"
          }
        });
        assert.equal(createdTerm.response.status, 201, "registrar creates a term");
        const secondTerm = createdTerm.payload.data.term;
        assert.equal(secondTerm.status, "PLANNED");
        assert.equal(secondTerm.periodStatus, "DRAFT");
        const storedDraftPeriod = await transaction.enrollmentPeriod.findUniqueOrThrow({
          where: { academicTermId: secondTerm.id }
        });
        assert.equal(storedDraftPeriod.status, "DRAFT", "new term preserves existing periods and starts as draft");

        const deniedDashboard = await registrarClient.request("/api/v1/admin/users");
        assert.equal(deniedDashboard.response.status, 403, "registrar admin denial");

        const beforeOptions = await (async () => {
          const studentClient = new Client(baseUrl);
          await studentClient.login(studentUser.username, password);
          return studentClient.request("/api/v1/student/enrollment/options");
        })();
        assert.equal(beforeOptions.response.status, 200, "enrollment options");
        const beforeTerm = beforeOptions.payload.data.terms.find((entry) => entry.id === term.id);
        assert.equal(beforeTerm, undefined, "students do not see a term before its enrollment period opens");

        const unauthorizedOpen = await (async () => {
          const facultyClient = new Client(baseUrl);
          await facultyClient.login(outsider.username, password);
          return facultyClient.request("/api/v1/registrar/enrollment-period/open", {
            method: "POST", json: { academicTermId: term.id }
          });
        })();
        assert.equal(unauthorizedOpen.response.status, 403, "OPEN_ENROLLMENT permission enforcement");

        const opened = await registrarClient.request("/api/v1/registrar/enrollment-period/open", {
          method: "POST", json: { academicTermId: term.id }
        });
        assert.equal(opened.response.status, 200, "open enrollment");
        assert.equal(opened.payload.data.period.status, "OPEN");
        assert.equal(opened.payload.data.period.academicTerm.id, term.id);
        assert.ok(opened.payload.data.period.openedAt);

        const conflictingOpen = await registrarClient.request("/api/v1/registrar/enrollment-period/open", {
          method: "POST", json: { academicTermId: secondTerm.id }
        });
        assert.equal(conflictingOpen.response.status, 409, "only one semester can be open at a time");
        assert.equal(conflictingOpen.payload.error.code, "PERIOD_ALREADY_OPEN");

        const storedPeriod = await transaction.enrollmentPeriod.findUniqueOrThrow({
          where: { academicTermId: term.id }
        });
        assert.equal(storedPeriod.status, "OPEN");
        assert.equal(storedPeriod.openedByUserId, registrar.id);
        assert.ok(storedPeriod.openedAt);
        const refreshedTerm = await transaction.academicTerm.findUniqueOrThrow({ where: { id: term.id } });
        assert.equal(refreshedTerm.status, "ENROLLMENT_OPEN");

        const termFee = await transaction.studentObligation.findFirstOrThrow({
          where: {
            studentId: student.id,
            academicYearId: term.academicYearId,
            academicTermId: term.id,
            paymentType: { name: "Entrance Fee" }
          }
        });

        const openOptions = await (async () => {
          const studentClient = new Client(baseUrl);
          await studentClient.login(studentUser.username, password);
          const options = await studentClient.request("/api/v1/student/enrollment/options");
          const unpaidSubmit = await studentClient.request("/api/v1/student/enrollment/submit", {
            method: "POST",
            json: {
              programId: program.id,
              academicTermId: term.id,
              yearLevel: 1,
              selectedSubjectIds: [profileSubject.id],
              formData: completeFormData()
            }
          });
          assert.equal(unpaidSubmit.response.status, 402, "unpaid term fee blocks enrollment");
          assert.equal(unpaidSubmit.payload.error.code, "ENTRANCE_FEE_REQUIRED");
          await recordVerifiedEnrollmentFee(transaction, termFee, student.id, storedPeriod.id, `${suffix}-first`);
          const submitted = await studentClient.request("/api/v1/student/enrollment/submit", {
            method: "POST",
            json: {
              programId: program.id,
              academicTermId: term.id,
              yearLevel: 1,
              selectedSubjectIds: [profileSubject.id],
              formData: completeFormData()
            }
          });
          assert.equal(submitted.response.status, 200, "submit while enrollment open");
          assert.equal(submitted.payload.data.application.status, "SUBMITTED");
          return options;
        })();
        const openTerm = openOptions.payload.data.terms.find((entry) => entry.id === term.id);
        assert.equal(openTerm.enrollmentOpen, true, "student portal reflects open enrollment");
        assert.equal(openTerm.periodStatus, "OPEN");

        const closed = await registrarClient.request("/api/v1/registrar/enrollment-period/close", {
          method: "POST", json: { periodId: storedPeriod.id }
        });
        assert.equal(closed.response.status, 200, "close enrollment");
        assert.equal(closed.payload.data.period.status, "CLOSED");
        assert.ok(closed.payload.data.period.closedAt);

        const closedPeriod = await transaction.enrollmentPeriod.findUniqueOrThrow({
          where: { id: storedPeriod.id }
        });
        assert.equal(closedPeriod.status, "CLOSED");
        assert.equal(closedPeriod.closedByUserId, registrar.id);
        assert.ok(closedPeriod.closedAt);
        const closedTermRecord = await transaction.academicTerm.findUniqueOrThrow({ where: { id: term.id } });
        assert.equal(closedTermRecord.status, "CLOSED");

        const closedReflection = await (async () => {
          const studentClient = new Client(baseUrl);
          await studentClient.login(lateStudentUser.username, password);
          const options = await studentClient.request("/api/v1/student/enrollment/options");
          const closedSubmit = await studentClient.request("/api/v1/student/enrollment/submit", {
            method: "POST",
            json: {
              programId: lateProgram.id,
              academicTermId: term.id,
              yearLevel: 1,
              selectedSubjectIds: [lateProfileSubject.id],
              formData: completeFormData()
            }
          });
          assert.equal(closedSubmit.response.status, 409, "submit blocked when enrollment closed");
          assert.equal(closedSubmit.payload.error.code, "ENROLLMENT_CLOSED");
          return options;
        })();
        const closedTermView = closedReflection.payload.data.terms.find((entry) => entry.id === term.id);
        assert.equal(closedTermView, undefined, "closed terms are removed from student enrollment choices");

        const openedSecondTerm = await registrarClient.request("/api/v1/registrar/enrollment-period/open", {
          method: "POST", json: { academicTermId: secondTerm.id }
        });
        assert.equal(openedSecondTerm.response.status, 200, "open next semester");
        const firstTermFee = await transaction.studentObligation.findFirstOrThrow({
          where: { studentId: student.id, academicTermId: term.id, paymentType: { name: "Entrance Fee" } }
        });
        const secondTermFee = await transaction.studentObligation.findFirstOrThrow({
          where: { studentId: student.id, academicTermId: secondTerm.id, paymentType: { name: "Entrance Fee" } }
        });
        assert.equal(firstTermFee.status, "PAID", "previous semester payment remains historical");
        assert.equal(secondTermFee.status, "UNPAID", "new semester receives a separate unpaid fee");
        const secondTermClient = new Client(baseUrl);
        await secondTermClient.login(studentUser.username, password);
        const secondOptions = await secondTermClient.request("/api/v1/student/enrollment/options");
        assert.deepEqual(secondOptions.payload.data.terms.map((entry) => entry.id), [secondTerm.id], "student sees only the active semester");
        const secondTermSubmit = await (async () => {
          return secondTermClient.request("/api/v1/student/enrollment/submit", {
            method: "POST",
            json: {
              programId: program.id,
              academicTermId: secondTerm.id,
                yearLevel: 1,
                selectedSubjectIds: [profileSubject2.id],
              formData: completeFormData()
            }
          });
        })();
        assert.equal(secondTermSubmit.response.status, 402, "previous semester payment cannot satisfy the new semester");
        assert.equal(secondTermSubmit.payload.error.code, "ENTRANCE_FEE_REQUIRED");
        await recordVerifiedEnrollmentFee(
          transaction,
          secondTermFee,
          student.id,
          openedSecondTerm.payload.data.period.id,
          `${suffix}-second`
        );
        const paidSecondTermSubmit = await secondTermClient.request("/api/v1/student/enrollment/submit", {
          method: "POST",
          json: {
            programId: program.id,
              academicTermId: secondTerm.id,
                yearLevel: 1,
                selectedSubjectIds: [profileSubject2.id],
              formData: completeFormData()
          }
        });
        if (paidSecondTermSubmit.response.status !== 200) console.log(paidSecondTermSubmit.payload);
        assert.equal(paidSecondTermSubmit.response.status, 200, "verified current-semester payment permits enrollment");
        await registrarClient.request("/api/v1/registrar/enrollment-period/close", {
          method: "POST", json: { periodId: openedSecondTerm.payload.data.period.id }
        });

        const reopen = await registrarClient.request("/api/v1/registrar/enrollment-period/open", {
          method: "POST", json: { academicTermId: term.id }
        });
        assert.equal(reopen.response.status, 200, "reopen enrollment resets closure fields");
        assert.equal(reopen.payload.data.period.status, "OPEN");
        const reopenedPeriod = await transaction.enrollmentPeriod.findUniqueOrThrow({
          where: { id: storedPeriod.id }
        });
        assert.equal(reopenedPeriod.closedByUserId, null);
        assert.equal(reopenedPeriod.closedAt, null);

        const closeAgain = await registrarClient.request("/api/v1/registrar/enrollment-period/close", {
          method: "POST", json: { periodId: storedPeriod.id }
        });
        assert.equal(closeAgain.response.status, 200, "second close succeeds once reopened");
        const finalClose = await registrarClient.request("/api/v1/registrar/enrollment-period/close", {
          method: "POST", json: { periodId: storedPeriod.id }
        });
        assert.equal(finalClose.response.status, 409, "closing a closed period fails");
        assert.equal(finalClose.payload.error.code, "PERIOD_NOT_OPEN");

        const missingTerm = await registrarClient.request("/api/v1/registrar/enrollment-period/open", {
          method: "POST", json: { academicTermId: newId() }
        });
        assert.equal(missingTerm.response.status, 404, "unknown term rejection");

        const studentApplications = await (async () => {
          const studentClient = new Client(baseUrl);
          await studentClient.login(studentUser.username, password);
          return studentClient.request("/api/v1/registrar/dashboard");
        })();
        assert.equal(studentApplications.response.status, 403, "student registrar denial");

        const applicationsList = await registrarClient.request("/api/v1/registrar/applications");
        assert.equal(applicationsList.response.status, 200, "VIEW_STUDENT_APPLICATION enforcement");
        assert.ok(Array.isArray(applicationsList.payload.data.applications));
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

test("Registrar manages academic years independently and requires admin approval to archive them", { timeout: 90_000 }, async () => {
  const prisma = createDatabase();
  const rollback = new Error("ROLLBACK_ACADEMIC_YEAR_MANAGEMENT_TEST");
  try {
    await prisma.$transaction(async (transaction) => {
      await isolateOpenEnrollmentPeriodForTest(transaction);
      const config = createConfig({
        nodeEnv: "test",
        appOrigin: expectedOrigin,
        publicRoot: projectRoot,
        auditPepper: "test-audit-pepper-that-is-long-and-private",
        scryptN: 1 << 10,
        cleanupIntervalMs: 60_000
      });
      const suffix = newId().slice(0, 8);
      const password = "Correct horse battery 2026";
      const registrar = await createTestUser(transaction, config, "registrar", `year.registrar.${suffix}`, password);
      const admin = await createTestUser(transaction, config, "administrator", `year.admin.${suffix}`, password);

      const app = await createApp({ config, database: transaction });
      const server = createServer(app.handler);
      await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
      const address = server.address();
      const baseUrl = `http://127.0.0.1:${address.port}`;

      try {
        const registrarClient = new Client(baseUrl);
        const adminClient = new Client(baseUrl);
        assert.equal((await registrarClient.login(registrar.username, password)).response.status, 200);
        assert.equal((await adminClient.login(admin.username, password)).response.status, 200);

        const createdYear = await registrarClient.request("/api/v1/registrar/academic-years", {
          method: "POST",
          json: {
            code: `AY-${suffix}`,
            name: `Academic Year ${suffix}`,
            startsOn: "2038-08-01",
            endsOn: "2039-05-31",
            status: "PLANNED"
          }
        });
        assert.equal(createdYear.response.status, 201, "registrar creates academic year independently");
        assert.equal(createdYear.payload.data.year.code, `AY-${suffix}`);

        const listing = await registrarClient.request("/api/v1/registrar/academic-years");
        assert.equal(listing.response.status, 200, "registrar can list academic years");
        assert.ok(listing.payload.data.years.some((year) => year.id === createdYear.payload.data.year.id));

        const createdTerm = await registrarClient.request("/api/v1/registrar/academic-terms", {
          method: "POST",
          json: {
            academicYearId: createdYear.payload.data.year.id,
            code: `TERM-${suffix}`,
            name: `Semester ${suffix}`,
            termNumber: 1,
            startsOn: "2038-08-01",
            endsOn: "2038-12-18",
            enrollmentStarts: "2038-07-15T00:00:00.000Z",
            enrollmentEnds: "2038-07-31T23:59:59.000Z",
            status: "PLANNED"
          }
        });
        assert.equal(createdTerm.response.status, 201, "registrar creates a semester under the academic year");

        const removalRequest = await registrarClient.request(`/api/v1/registrar/academic-years/${createdYear.payload.data.year.id}/removal-request`, {
          method: "POST",
          json: { reason: "Academic year has been superseded by a revised cycle." }
        });
        assert.equal(removalRequest.response.status, 201, "registrar may request removal after year creation");
        assert.equal(removalRequest.payload.data.request.academicYearId, createdYear.payload.data.year.id);

        const adminQueue = await adminClient.request("/api/v1/admin/academic-year-removal-requests");
        assert.equal(adminQueue.response.status, 200, "admin can review year removal requests");
        assert.ok(adminQueue.payload.data.requests.some((entry) => entry.academicYearId === createdYear.payload.data.year.id));

        const approved = await adminClient.request(`/api/v1/admin/academic-year-removal-requests/${removalRequest.payload.data.request.id}`, {
          method: "PATCH",
          json: { outcome: "APPROVED", remarks: "Approved for archival to preserve history and prevent active use." }
        });
        assert.equal(approved.response.status, 200, "admin approval archives the academic year and linked terms");
        assert.equal(approved.payload.data.request.status, "APPROVED");

        const archivedYear = await transaction.academicYear.findUniqueOrThrow({ where: { id: createdYear.payload.data.year.id } });
        const archivedTerm = await transaction.academicTerm.findUniqueOrThrow({ where: { id: createdTerm.payload.data.term.id } });
        assert.equal(archivedYear.status, "ARCHIVED");
        assert.equal(archivedTerm.status, "ARCHIVED");
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

test("Registrar reviews, returns, receives a resubmission, and permanently approves one application", { timeout: 90_000 }, async () => {
  const prisma = createDatabase();
  const rollback = new Error("ROLLBACK_REGISTRAR_APPLICATION_WORKFLOW_TEST");
  try {
    await prisma.$transaction(async (transaction) => {
      await isolateOpenEnrollmentPeriodForTest(transaction);
      const config = createConfig({
        nodeEnv: "test",
        appOrigin: expectedOrigin,
        publicRoot: projectRoot,
        auditPepper: "test-audit-pepper-that-is-long-and-private",
        scryptN: 1 << 10,
        cleanupIntervalMs: 60_000
      });
      const suffix = newId().slice(0, 8);
      const password = "Correct horse battery 2026";
      const registrar = await createTestUser(transaction, config, "registrar", `review.registrar.${suffix}`, password);
      const studentUser = await createTestUser(transaction, config, "student", `review.student.${suffix}`, password);
      const term = await createAcademicTerm(transaction, `review-${suffix}`);
      const { program, student, profileSubject, profileSubject2 } = await createStudentProfile(transaction, studentUser.id, `review-${suffix}`);

      await transaction.paymentType.upsert({
        where: { name: "Entrance Fee" },
        create: {
          id: newId(),
          name: "Entrance Fee",
          description: "Entrance fee for new students",
          category: "ADMISSION",
          amount: 500,
          isActive: true
        },
        update: {}
      });

      const applicationNumber = `APP-TEST-${suffix}`;
      const admissionApplication = await transaction.admissionApplication.create({
        data: {
          id: newId(),
          applicationNumber,
          applicationNumberNormalized: normalizeIdentifier(applicationNumber),
          applicantUserId: studentUser.id,
          intendedProgramId: program.id,
          academicTermId: term.id,
          convertedStudentId: student.id,
          firstName: "Student",
          lastName: "Integration Test",
          email: studentUser.email,
          status: "PENDING",
          submittedAt: new Date(),
          attemptNumber: 1,
          history: {
            create: {
              toStatus: "PENDING",
              actionType: "STUDENT_SUBMIT",
              changedByUserId: studentUser.id,
              changedByRole: "student"
            }
          }
        }
      });
      const documentType = await transaction.documentType.create({
        data: {
          name: `Test Birth Certificate ${suffix}`,
          description: "Registrar review serialization fixture",
          required: true,
          sortOrder: 999
        }
      });
      await transaction.studentDocument.create({
        data: {
          id: newId(),
          studentId: student.id,
          admissionApplicationId: admissionApplication.id,
          documentTypeId: documentType.id,
          originalFileName: "birth-certificate.png",
          storedFileName: `test-${suffix}.png`,
          filePath: `tests/${suffix}/birth-certificate.png`,
          fileSize: 8192n,
          mimeType: "image/png",
          uploadedByUserId: studentUser.id,
          uploadedAt: new Date(),
          status: "SUBMITTED"
        }
      });

      const app = await createApp({ config, database: transaction });
      const server = createServer(app.handler);
      await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
      const address = server.address();
      const baseUrl = `http://127.0.0.1:${address.port}`;

      try {
        const registrarClient = new Client(baseUrl);
        const studentClient = new Client(baseUrl);
        assert.equal((await registrarClient.login(registrar.username, password)).response.status, 200);
        assert.equal((await studentClient.login(studentUser.username, password)).response.status, 200);

        const opened = await registrarClient.request("/api/v1/registrar/enrollment-period/open", {
          method: "POST",
          json: { academicTermId: term.id }
        });
        assert.equal(opened.response.status, 200);

        const unpaidSubmit = await studentClient.request("/api/v1/student/enrollment/submit", {
          method: "POST",
          json: { programId: program.id,
              academicTermId: term.id,
              yearLevel: 1,
              selectedSubjectIds: [profileSubject.id],
              formData: completeFormData() }
        });
        assert.equal(unpaidSubmit.response.status, 402);
        const termFee = await transaction.studentObligation.findFirstOrThrow({
          where: {
            studentId: student.id,
            academicYearId: term.academicYearId,
            academicTermId: term.id,
            paymentType: { name: "Entrance Fee" }
          }
        });
        await recordVerifiedEnrollmentFee(
          transaction,
          termFee,
          student.id,
          opened.payload.data.period.id,
          `${suffix}-review`
        );
        const submitted = await studentClient.request("/api/v1/student/enrollment/submit", {
          method: "POST",
          json: { programId: program.id,
              academicTermId: term.id,
              yearLevel: 1,
              selectedSubjectIds: [profileSubject.id],
              formData: completeFormData() }
        });
        assert.equal(submitted.response.status, 200);

        // Fake program head approval for Registrar tests
        await transaction.enrollmentApplication.updateMany({
          where: { studentId: student.id, academicTermId: term.id },
          data: { status: "UNDER_REVIEW" }
        });

        const pending = await registrarClient.request("/api/v1/registrar/applications?status=PENDING");
        assert.equal(pending.response.status, 200);
        if (!pending.payload.data.applications.some((entry) => entry.id === admissionApplication.id)) console.log("Missing admission. Applications:", pending.payload.data.applications);
        assert.ok(pending.payload.data.applications.some((entry) => entry.id === admissionApplication.id));

        const review = await registrarClient.request(`/api/v1/registrar/applications/${admissionApplication.id}`);
        assert.equal(review.response.status, 200);
        assert.equal(review.payload.data.application.formData.personal.fullName, "Student Integration Test");
        assert.ok(Array.isArray(review.payload.data.documents));
        const submittedDocument = review.payload.data.documents.find((document) => document.documentTypeId === documentType.id);
        assert.equal(submittedDocument.fileSize, 8192);

        const correctionRemarks = "Please upload a clearer copy of your birth certificate.";
        const returned = await registrarClient.request(`/api/v1/registrar/applications/${admissionApplication.id}`, {
          method: "PATCH",
          json: { status: "RETURNED_FOR_CORRECTION", decisionNotes: correctionRemarks }
        });
        assert.equal(returned.response.status, 200);
        assert.equal(returned.payload.data.application.status, "RETURNED_FOR_CORRECTION");

        const feedback = await studentClient.request("/api/v1/student/enrollment");
        assert.equal(feedback.response.status, 200);
        assert.equal(feedback.payload.data.admission.status, "RETURNED_FOR_CORRECTION");
        assert.equal(feedback.payload.data.feedback[0].comment, correctionRemarks);

        const resubmitted = await studentClient.request("/api/v1/student/enrollment/submit", {
          method: "POST",
          json: { programId: program.id,
              academicTermId: term.id,
              yearLevel: 1,
              selectedSubjectIds: [profileSubject.id],
              formData: completeFormData() }
        });
        assert.equal(resubmitted.response.status, 200);

        // Fake program head approval for resubmission
        await transaction.enrollmentApplication.updateMany({
          where: { studentId: student.id, academicTermId: term.id },
          data: { status: "UNDER_REVIEW" }
        });

        const resubmissionQueue = await registrarClient.request("/api/v1/registrar/applications?status=PENDING");
        const queuedApplication = resubmissionQueue.payload.data.applications.find((entry) => entry.id === admissionApplication.id);
        assert.equal(queuedApplication.attemptNumber, 2);
        assert.equal(queuedApplication.tag, "RESUBMISSION");

        const section = await transaction.classSection.create({
          data: {
            id: newId(), academicTermId: term.id, programId: program.id, code: "TEST-SEC", yearLevel: 1, curriculumId: profileSubject.curriculumId, capacity: 40, isActive: true
          }
        });
        const offering = await transaction.courseOffering.create({
          data: {
            id: newId(), academicTermId: term.id, subjectId: profileSubject.subjectId, classSectionId: section.id,
            offeringCode: "TEST-OFFER", creditUnits: 3, capacity: 40, status: "OPEN"
          }
        });

        const approved = await registrarClient.request(`/api/v1/registrar/applications/${admissionApplication.id}`, {
          method: "PATCH",
          json: { 
            status: "APPROVED", 
            decisionNotes: "Admission requirements verified.",
            sectionAssignments: [
              { curriculumSubjectId: profileSubject.id, courseOfferingId: offering.id }
            ]
          }
        });
        if (approved.response.status !== 200) console.log(approved.payload);
        assert.equal(approved.response.status, 200);
        assert.equal(approved.payload.data.application.status, "APPROVED");

        const stored = await transaction.admissionApplication.findUniqueOrThrow({
          where: { id: admissionApplication.id },
          include: { history: { orderBy: { changedAt: "asc" } } }
        });
        assert.equal(stored.status, "APPROVED");
        assert.equal(stored.attemptNumber, 2);
        assert.ok(stored.history.some((entry) => entry.actionType === "VIEW_APPLICATION"));
        assert.ok(stored.history.some((entry) => entry.actionType === "RETURN_FOR_CORRECTION"));
        assert.ok(stored.history.some((entry) => entry.actionType === "STUDENT_RESUBMIT"));
        assert.ok(stored.history.some((entry) => entry.actionType === "APPROVE"));
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

test("Registrar can reject a pending admission while its enrollment remains a draft", { timeout: 90_000 }, async () => {
  const prisma = createDatabase();
  const rollback = new Error("ROLLBACK_REGISTRAR_DRAFT_REJECTION_TEST");
  try {
    await prisma.$transaction(async (transaction) => {
      const config = createConfig({
        nodeEnv: "test",
        appOrigin: expectedOrigin,
        publicRoot: projectRoot,
        auditPepper: "test-audit-pepper-that-is-long-and-private",
        scryptN: 1 << 10,
        cleanupIntervalMs: 60_000
      });
      const suffix = newId().slice(0, 8);
      const password = "Correct horse battery 2026";
      const registrar = await createTestUser(transaction, config, "registrar", `draft.registrar.${suffix}`, password);
      const studentUser = await createTestUser(transaction, config, "student", `draft.student.${suffix}`, password);
      const term = await createAcademicTerm(transaction, `draft-${suffix}`);
      const { program, student, profileSubject, profileSubject2 } = await createStudentProfile(transaction, studentUser.id, `draft-${suffix}`);
      const applicationNumber = `APP-DRAFT-${suffix}`;
      const admissionApplication = await transaction.admissionApplication.create({
        data: {
          id: newId(),
          applicationNumber,
          applicationNumberNormalized: normalizeIdentifier(applicationNumber),
          applicantUserId: studentUser.id,
          intendedProgramId: program.id,
          academicTermId: term.id,
          convertedStudentId: student.id,
          firstName: "Draft",
          lastName: "Applicant",
          email: studentUser.email,
          status: "PENDING",
          submittedAt: new Date(),
          history: {
            create: {
              toStatus: "PENDING",
              actionType: "STUDENT_SUBMIT",
              changedByUserId: studentUser.id,
              changedByRole: "student"
            }
          }
        }
      });
      const enrollmentApplication = await transaction.enrollmentApplication.create({
        data: {
          id: newId(),
          studentId: student.id,
          programId: program.id,
          academicTermId: term.id,
          yearLevel: 1,
          formData: {},
          status: "DRAFT"
        }
      });

      const app = await createApp({ config, database: transaction });
      const server = createServer(app.handler);
      await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
      const address = server.address();
      const baseUrl = `http://127.0.0.1:${address.port}`;

      try {
        const registrarClient = new Client(baseUrl);
        assert.equal((await registrarClient.login(registrar.username, password)).response.status, 200);
        const rejected = await registrarClient.request(`/api/v1/registrar/applications/${admissionApplication.id}`, {
          method: "PATCH",
          json: { status: "REJECTED", decisionNotes: "Admission requirements were not satisfied." }
        });
        assert.equal(rejected.response.status, 200);
        assert.equal(rejected.payload.data.application.status, "REJECTED");

        const [storedAdmission, storedEnrollment] = await Promise.all([
          transaction.admissionApplication.findUniqueOrThrow({
            where: { id: admissionApplication.id },
            include: { history: true }
          }),
          transaction.enrollmentApplication.findUniqueOrThrow({
            where: { id: enrollmentApplication.id }
          })
        ]);
        assert.equal(storedAdmission.status, "REJECTED");
        assert.ok(storedAdmission.history.some((entry) => entry.actionType === "REJECT"));
        assert.equal(storedEnrollment.status, "DRAFT");
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
