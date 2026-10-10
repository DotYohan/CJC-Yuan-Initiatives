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

class TestApiClient {
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
    let payload = null;
    const text = await response.text();
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { raw: text };
      }
    }
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

test("Dean Workflow: Account creation, strict collegiate scoping, multi-tier grade lifecycle, and program evaluation", { timeout: 90_000 }, async () => {
  const database = createDatabase();
  const rollback = new Error("ROLLBACK_DEAN_WORKFLOW_TEST");

  try {
    await database.$transaction(async (transaction) => {
      const config = createConfig({
        nodeEnv: "test",
        appOrigin: expectedOrigin,
        publicRoot: projectRoot,
        auditPepper: "dean-workflow-audit-pepper",
        scryptN: 1 << 10,
        cleanupIntervalMs: 60_000
      });

      const suffix = newId().slice(0, 8);
      const defaultPassword = "IntegrationPassword123!";
      const defaultPasswordHash = await hashPassword(defaultPassword, config.scrypt);

      // ── Term and Grading Period ──
      const academicYear = await transaction.academicYear.create({
        data: {
          id: newId(),
          code: `AY-${suffix}`,
          name: `Academic Year ${suffix}`,
          startsOn: new Date("2026-06-01"),
          endsOn: new Date("2027-05-31")
        }
      });
      const activeTerm = await transaction.academicTerm.create({
        data: {
          id: newId(),
          academicYearId: academicYear.id,
          code: `TERM-${suffix}`,
          name: `1st Semester ${suffix}`,
          termNumber: 1,
          startsOn: new Date("2026-06-01"),
          endsOn: new Date("2026-10-31"),
          status: "ACTIVE"
        }
      });
      const gradingPeriod = await transaction.gradingPeriod.create({
        data: {
          id: newId(),
          academicTermId: activeTerm.id,
          code: `FIN-${suffix}`,
          name: "Final Period",
          type: "FINAL",
          sequence: 1,
          isFinal: true
        }
      });

      // ── Colleges & Departments ──
      const collegeA = await transaction.college.create({
        data: {
          id: newId(),
          code: `COE-${suffix}`,
          codeNormalized: normalizeIdentifier(`COE-${suffix}`),
          name: `College of Engineering ${suffix}`,
          shortName: "COE"
        }
      });
      const collegeB = await transaction.college.create({
        data: {
          id: newId(),
          code: `CBA-${suffix}`,
          codeNormalized: normalizeIdentifier(`CBA-${suffix}`),
          name: `College of Business ${suffix}`,
          shortName: "CBA"
        }
      });

      const deptA = await transaction.department.create({
        data: { id: newId(), collegeId: collegeA.id, code: `DEPT-CPE-${suffix}`, name: `Computer Engineering ${suffix}` }
      });
      const deptB = await transaction.department.create({
        data: { id: newId(), collegeId: collegeB.id, code: `DEPT-ACC-${suffix}`, name: `Accountancy ${suffix}` }
      });

      // ── Programs & Curricula ──
      const programA = await transaction.program.create({
        data: {
          id: newId(),
          departmentId: deptA.id,
          code: `BSCPE-${suffix}`,
          codeNormalized: normalizeIdentifier(`BSCPE-${suffix}`),
          name: `BS Computer Engineering ${suffix}`,
          credential: "BS",
          durationYears: 4,
          termsPerYear: 2,
          isActive: true
        }
      });
      const programB = await transaction.program.create({
        data: {
          id: newId(),
          departmentId: deptB.id,
          code: `BSA-${suffix}`,
          codeNormalized: normalizeIdentifier(`BSA-${suffix}`),
          name: `BS Accountancy ${suffix}`,
          credential: "BS",
          durationYears: 4,
          termsPerYear: 2,
          isActive: true
        }
      });

      const subjectA = await transaction.subject.create({
        data: {
          id: newId(),
          programId: programA.id,
          departmentId: deptA.id,
          code: `CPE101-${suffix}`,
          codeNormalized: normalizeIdentifier(`CPE101-${suffix}`),
          title: `Intro to CPE ${suffix}`,
          defaultCreditUnits: 3,
          defaultLectureHours: 3,
          defaultLaboratoryHours: 0
        }
      });
      const subjectB = await transaction.subject.create({
        data: {
          id: newId(),
          programId: programB.id,
          departmentId: deptB.id,
          code: `ACC101-${suffix}`,
          codeNormalized: normalizeIdentifier(`ACC101-${suffix}`),
          title: `Financial Accounting 1 ${suffix}`,
          defaultCreditUnits: 3,
          defaultLectureHours: 3,
          defaultLaboratoryHours: 0
        }
      });

      const curriculumA = await transaction.curriculum.create({
        data: {
          id: newId(),
          programId: programA.id,
          code: `CURR-CPE-${suffix}`,
          name: `CPE Curriculum ${suffix}`,
          effectiveFromYear: 2026,
          version: 1,
          status: "ACTIVE",
          subjects: {
            create: {
              id: newId(),
              subjectId: subjectA.id,
              yearLevel: 1,
              termNumber: 1,
              creditUnits: 3,
              lectureHours: 3,
              laboratoryHours: 0
            }
          }
        },
        include: { subjects: true }
      });

      const curriculumB = await transaction.curriculum.create({
        data: {
          id: newId(),
          programId: programB.id,
          code: `CURR-ACC-${suffix}`,
          name: `ACC Curriculum ${suffix}`,
          effectiveFromYear: 2026,
          version: 1,
          status: "ACTIVE",
          subjects: {
            create: {
              id: newId(),
              subjectId: subjectB.id,
              yearLevel: 1,
              termNumber: 1,
              creditUnits: 3,
              lectureHours: 3,
              laboratoryHours: 0
            }
          }
        },
        include: { subjects: true }
      });

      // ── Roles ──
      const adminRole = await transaction.role.findUniqueOrThrow({ where: { slug: "administrator" } });
      const registrarRole = await transaction.role.findUniqueOrThrow({ where: { slug: "registrar" } });
      const facultyRole = await transaction.role.findUniqueOrThrow({ where: { slug: "faculty" } });
      const deanRole = await transaction.role.findUniqueOrThrow({ where: { slug: "dean" } });

      // ── Admin User ──
      const adminUser = await transaction.user.create({
        data: {
          id: newId(),
          username: `admin_${suffix}`,
          usernameNormalized: normalizeIdentifier(`admin_${suffix}`),
          email: `admin_${suffix}@cjc.edu.ph`,
          emailNormalized: normalizeIdentifier(`admin_${suffix}@cjc.edu.ph`),
          displayName: "System Administrator",
          passwordHash: defaultPasswordHash,
          status: "ACTIVE",
          mustChangePassword: false,
          userRoles: { create: { roleId: adminRole.id, isPrimary: true } }
        }
      });

      // ── Registrar User ──
      const registrarUser = await transaction.user.create({
        data: {
          id: newId(),
          username: `reg_${suffix}`,
          usernameNormalized: normalizeIdentifier(`reg_${suffix}`),
          email: `reg_${suffix}@cjc.edu.ph`,
          emailNormalized: normalizeIdentifier(`reg_${suffix}@cjc.edu.ph`),
          displayName: "Official Registrar",
          passwordHash: defaultPasswordHash,
          status: "ACTIVE",
          mustChangePassword: false,
          userRoles: { create: { roleId: registrarRole.id, isPrimary: true } }
        }
      });

      // ── Faculty 1 (College A) and Faculty 2 (College B) ──
      const facultyUserA = await transaction.user.create({
        data: {
          id: newId(),
          username: `facA_${suffix}`,
          usernameNormalized: normalizeIdentifier(`facA_${suffix}`),
          email: `facA_${suffix}@cjc.edu.ph`,
          emailNormalized: normalizeIdentifier(`facA_${suffix}@cjc.edu.ph`),
          displayName: "Professor Turing",
          passwordHash: defaultPasswordHash,
          status: "ACTIVE",
          mustChangePassword: false,
          userRoles: { create: { roleId: facultyRole.id, isPrimary: true } },
          facultyProfile: {
            create: {
              id: newId(),
              employeeNumber: `FAC-A-${suffix}`,
              employeeNumberNormalized: normalizeIdentifier(`FAC-A-${suffix}`),
              firstName: "Alan",
              lastName: "Turing",
              departmentId: deptA.id
            }
          }
        },
        include: { facultyProfile: true }
      });
      const facultyA = facultyUserA.facultyProfile;

      const facultyUserB = await transaction.user.create({
        data: {
          id: newId(),
          username: `facB_${suffix}`,
          usernameNormalized: normalizeIdentifier(`facB_${suffix}`),
          email: `facB_${suffix}@cjc.edu.ph`,
          emailNormalized: normalizeIdentifier(`facB_${suffix}@cjc.edu.ph`),
          displayName: "Professor Pacioli",
          passwordHash: defaultPasswordHash,
          status: "ACTIVE",
          mustChangePassword: false,
          userRoles: { create: { roleId: facultyRole.id, isPrimary: true } },
          facultyProfile: {
            create: {
              id: newId(),
              employeeNumber: `FAC-B-${suffix}`,
              employeeNumberNormalized: normalizeIdentifier(`FAC-B-${suffix}`),
              firstName: "Luca",
              lastName: "Pacioli",
              departmentId: deptB.id
            }
          }
        },
        include: { facultyProfile: true }
      });
      const facultyB = facultyUserB.facultyProfile;

      // ── Class Sections & Offerings ──
      const sectionA = await transaction.classSection.create({
        data: {
          id: newId(),
          academicTermId: activeTerm.id,
          programId: programA.id,
          curriculumId: curriculumA.id,
          code: `SEC-CPE-${suffix}`,
          yearLevel: 1,
          capacity: 40
        }
      });
      const sectionB = await transaction.classSection.create({
        data: {
          id: newId(),
          academicTermId: activeTerm.id,
          programId: programB.id,
          curriculumId: curriculumB.id,
          code: `SEC-ACC-${suffix}`,
          yearLevel: 1,
          capacity: 40
        }
      });

      const offeringA = await transaction.courseOffering.create({
        data: {
          id: newId(),
          offeringCode: `OFF-CPE-${suffix}`,
          academicTermId: activeTerm.id,
          classSectionId: sectionA.id,
          subjectId: subjectA.id,
          creditUnits: 3,
          lectureHours: 3,
          laboratoryHours: 0,
          capacity: 40,
          status: "OPEN",
          faculty: {
            create: {
              id: newId(),
              facultyId: facultyA.id,
              role: "PRIMARY_INSTRUCTOR"
            }
          }
        }
      });

      const offeringB = await transaction.courseOffering.create({
        data: {
          id: newId(),
          offeringCode: `OFF-ACC-${suffix}`,
          academicTermId: activeTerm.id,
          classSectionId: sectionB.id,
          subjectId: subjectB.id,
          creditUnits: 3,
          lectureHours: 3,
          laboratoryHours: 0,
          capacity: 40,
          status: "OPEN",
          faculty: {
            create: {
              id: newId(),
              facultyId: facultyB.id,
              role: "PRIMARY_INSTRUCTOR"
            }
          }
        }
      });

      // ── Students & Enrollments ──
      const studentUserA = await transaction.user.create({
        data: {
          id: newId(),
          username: `stuA_${suffix}`,
          usernameNormalized: normalizeIdentifier(`stuA_${suffix}`),
          email: `stuA_${suffix}@cjc.edu.ph`,
          emailNormalized: normalizeIdentifier(`stuA_${suffix}@cjc.edu.ph`),
          displayName: "Ada Lovelace",
          passwordHash: defaultPasswordHash,
          status: "ACTIVE",
          studentProfile: {
            create: {
              id: newId(),
              studentNumber: `SN-ENG-${suffix}`,
              studentNumberNormalized: normalizeIdentifier(`SN-ENG-${suffix}`),
              firstName: "Ada",
              lastName: "Lovelace",
              programId: programA.id,
              curriculumId: curriculumA.id,
              admissionYear: 2026,
              currentYearLevel: 1,
              status: "ACTIVE"
            }
          }
        },
        include: { studentProfile: true }
      });
      const studentA = studentUserA.studentProfile;

      const enrollmentA = await transaction.enrollment.create({
        data: {
          id: newId(),
          studentId: studentA.id,
          academicTermId: activeTerm.id,
          programId: programA.id,
          curriculumId: curriculumA.id,
          yearLevel: 1,
          status: "ENROLLED",
          items: {
            create: {
              id: newId(),
              courseOfferingId: offeringA.id,
              status: "ENROLLED"
            }
          }
        },
        include: { items: true }
      });
      const enrolledItemA = enrollmentA.items[0];

      const studentUserB = await transaction.user.create({
        data: {
          id: newId(),
          username: `stuB_${suffix}`,
          usernameNormalized: normalizeIdentifier(`stuB_${suffix}`),
          email: `stuB_${suffix}@cjc.edu.ph`,
          emailNormalized: normalizeIdentifier(`stuB_${suffix}@cjc.edu.ph`),
          displayName: "Warren Buffett",
          passwordHash: defaultPasswordHash,
          status: "ACTIVE",
          studentProfile: {
            create: {
              id: newId(),
              studentNumber: `SN-BUS-${suffix}`,
              studentNumberNormalized: normalizeIdentifier(`SN-BUS-${suffix}`),
              firstName: "Warren",
              lastName: "Buffett",
              programId: programB.id,
              curriculumId: curriculumB.id,
              admissionYear: 2026,
              currentYearLevel: 1,
              status: "ACTIVE"
            }
          }
        },
        include: { studentProfile: true }
      });
      const studentB = studentUserB.studentProfile;

      await transaction.enrollment.create({
        data: {
          id: newId(),
          studentId: studentB.id,
          academicTermId: activeTerm.id,
          programId: programB.id,
          curriculumId: curriculumB.id,
          yearLevel: 1,
          status: "ENROLLED",
          items: {
            create: {
              id: newId(),
              courseOfferingId: offeringB.id,
              status: "ENROLLED"
            }
          }
        }
      });

      // ── Launch API Server ──
      const app = await createApp({ config, database: transaction });
      const server = createServer(app.handler);
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const port = server.address().port;
      const baseUrl = `http://127.0.0.1:${port}`;

      try {
        const adminClient = new TestApiClient(baseUrl);
        const adminLogin = await adminClient.login(adminUser.username, defaultPassword);
        assert.equal(adminLogin.response.status, 200, "Admin login must succeed");

        // ══════════════════════════════════════════════════════════════════════
        // TEST 1: Dean Account Creation (Validation & College Requirement)
        // ══════════════════════════════════════════════════════════════════════
        console.log("\n[TEST 1] Admin creates Dean accounts with required college assignment...");
        // 1a: Attempt creation without collegeId -> 422
        const noCollegeRes = await adminClient.request("/api/v1/admin/users", {
          method: "POST",
          json: {
            username: `dean_invalid_${suffix}`,
            displayName: "Invalid Dean",
            password: "SecurePassword123!",
            role: "dean",
            collegeId: null
          }
        });
        assert.equal(noCollegeRes.response.status, 422, "Dean without collegeId must be rejected with 422");
        console.log("✓ Dean creation without collegeId properly rejected with 422");

        // 1b: Create Dean A for College A (Engineering)
        const deanAUsername = `dean_coe_${suffix}`;
        const deanAPassword = `DeanPassword123!`;
        const createDeanARes = await adminClient.request("/api/v1/admin/users", {
          method: "POST",
          json: {
            username: deanAUsername,
            displayName: "Dean of Engineering",
            password: deanAPassword,
            role: "dean",
            collegeId: collegeA.id,
            mustChangePassword: false
          }
        });
        assert.equal(createDeanARes.response.status, 201, "Dean A creation must return 201");
        console.log(`✓ Dean A created and assigned to College A (${collegeA.code})`);

        // 1c: Create Dean B for College B (Business)
        const deanBUsername = `dean_cba_${suffix}`;
        const deanBPassword = `DeanPassword123!`;
        const createDeanBRes = await adminClient.request("/api/v1/admin/users", {
          method: "POST",
          json: {
            username: deanBUsername,
            displayName: "Dean of Business",
            password: deanBPassword,
            role: "dean",
            collegeId: collegeB.id,
            mustChangePassword: false
          }
        });
        assert.equal(createDeanBRes.response.status, 201, "Dean B creation must return 201");
        console.log(`✓ Dean B created and assigned to College B (${collegeB.code})`);

        // 1d: Dean login returns assigned college in session
        const deanAClient = new TestApiClient(baseUrl);
        const deanALogin = await deanAClient.login(deanAUsername, deanAPassword);
        assert.equal(deanALogin.response.status, 200, "Dean A login must succeed");
        assert.equal(deanALogin.payload.data.user.assignedCollege?.id, collegeA.id, "Session user must include assignedCollege");

        const deanBClient = new TestApiClient(baseUrl);
        const deanBLogin = await deanBClient.login(deanBUsername, deanBPassword);
        assert.equal(deanBLogin.response.status, 200, "Dean B login must succeed");
        assert.equal(deanBLogin.payload.data.user.assignedCollege?.id, collegeB.id);
        console.log("✓ Dean sessions verify correct assignedCollege binding");

        // ══════════════════════════════════════════════════════════════════════
        // TEST 2: Strict Collegiate Scoping Verification
        // ══════════════════════════════════════════════════════════════════════
        console.log("\n[TEST 2] Verifying strict collegiate scoping for Dean endpoints...");
        // 2a: Overview counts
        const overviewResA = await deanAClient.request("/api/v1/dean/dashboard");
        assert.equal(overviewResA.response.status, 200);
        const overviewA = overviewResA.payload.data.overview;
        assert.equal(overviewA.college.id, collegeA.id);
        assert.equal(overviewA.counts.programs, 1, "Only COE programs counted");
        assert.equal(overviewA.counts.facultyMembers, 1, "Only COE faculty counted");
        assert.equal(overviewA.counts.officialStudents, 1, "Only COE official students counted");

        // 2b: Official Students
        const studentsResA = await deanAClient.request("/api/v1/dean/students");
        assert.equal(studentsResA.response.status, 200);
        const stuListA = studentsResA.payload.data.students;
        assert.equal(stuListA.length, 1);
        assert.equal(stuListA[0].studentNumber, studentA.studentNumber, "Dean A sees only Engineering student");

        // 2c: Faculty Directory
        const facResA = await deanAClient.request("/api/v1/dean/faculty");
        assert.equal(facResA.response.status, 200);
        const facListA = facResA.payload.data.faculty;
        assert.equal(facListA.length, 1);
        assert.equal(facListA[0].employeeNumber, facultyA.employeeNumber, "Dean A sees only Engineering faculty");

        // 2d: Schedules
        const schedResA = await deanAClient.request("/api/v1/dean/schedules");
        assert.equal(schedResA.response.status, 200);
        const schedListA = schedResA.payload.data.schedules;
        assert.equal(schedListA.length, 1);
        assert.equal(schedListA[0].offeringCode, offeringA.offeringCode, "Dean A sees only Engineering schedule");
        console.log("✓ Scoped read-only queries verified for dashboard, students, faculty, and schedules");

        // ══════════════════════════════════════════════════════════════════════
        // TEST 3: Multi-tier Grade Lifecycle (Submit -> Return -> Resubmit -> Dean Approve -> Registrar Post)
        // ══════════════════════════════════════════════════════════════════════
        console.log("\n[TEST 3] Multi-tier Grade Lifecycle...");
        const teacherClientA = new TestApiClient(baseUrl);
        await teacherClientA.login(facultyUserA.username, defaultPassword);

        // 3a: Faculty A submits initial grade (88.5)
        const submitGradesRes = await teacherClientA.request(`/api/v1/faculty/classes/${offeringA.id}/grades/submit`, {
          method: "POST",
          json: {
            grades: [
              {
                enrollmentItemId: enrolledItemA.id,
                gradingPeriodId: gradingPeriod.id,
                numericGrade: 88.5,
                remarks: "Initial submission"
              }
            ]
          }
        });
        assert.equal(submitGradesRes.response.status, 200, "Faculty grade submission should succeed");
        console.log("✓ Faculty submitted grade (88.5, status: SUBMITTED)");

        // 3b: Offering A appears in Dean A's pending queue
        const deanAPending = await deanAClient.request("/api/v1/dean/grades/pending");
        assert.equal(deanAPending.response.status, 200);
        assert.equal(deanAPending.payload.data.submissions.length, 1);
        assert.equal(deanAPending.payload.data.submissions[0].offeringId, offeringA.id);

        // 3c: Offering A DOES NOT appear in Dean B's pending queue (different college)
        const deanBPending = await deanBClient.request("/api/v1/dean/grades/pending");
        assert.equal(deanBPending.response.status, 200);
        assert.equal(deanBPending.payload.data.submissions.length, 0, "Dean B queue must be empty for COE offering");

        // 3d: Dean B cross-college view attempt is forbidden (403)
        const deanBCrossView = await deanBClient.request(`/api/v1/dean/grades/offering/${offeringA.id}`);
        assert.equal(deanBCrossView.response.status, 403, "Cross-college grade sheet view must return 403");
        console.log("✓ Cross-college grade review strictly blocked with 403");

        // 3e: Dean A views grade sheet
        const deanAGradeSheet = await deanAClient.request(`/api/v1/dean/grades/offering/${offeringA.id}`);
        assert.equal(deanAGradeSheet.response.status, 200);
        assert.equal(Number(deanAGradeSheet.payload.data.students[0].grades[0].numericGrade), 88.5);
        assert.equal(deanAGradeSheet.payload.data.students[0].grades[0].status, "SUBMITTED");

        // 3f: Dean A returns grades without remarks -> 422
        const noRemarksReturn = await deanAClient.request(`/api/v1/dean/grades/offering/${offeringA.id}/return`, {
          method: "POST",
          json: { remarks: "   " }
        });
        assert.equal(noRemarksReturn.response.status, 422, "Dean return without remarks must be rejected");

        // 3g: Dean A returns grades with valid remarks
        const returnRemarks = "Please verify attendance scores and laboratory computation.";
        const returnRes = await deanAClient.request(`/api/v1/dean/grades/offering/${offeringA.id}/return`, {
          method: "POST",
          json: { remarks: returnRemarks }
        });
        assert.equal(returnRes.response.status, 200, "Dean return with remarks must succeed");
        console.log("✓ Dean returned grade sheet to faculty with remarks");

        // Verify status reverted to DRAFT and removed from Dean pending queue
        const deanAAfterReturn = await deanAClient.request("/api/v1/dean/grades/pending");
        assert.equal(deanAAfterReturn.payload.data.submissions.length, 0, "Returned grades removed from Dean pending queue");

        // 3h: Faculty edits grade (numericGrade: 92.0) and resubmits
        const facultyResubmitRes = await teacherClientA.request(`/api/v1/faculty/classes/${offeringA.id}/grades/submit`, {
          method: "POST",
          json: {
            grades: [
              {
                enrollmentItemId: enrolledItemA.id,
                gradingPeriodId: gradingPeriod.id,
                numericGrade: 92.0,
                remarks: "Corrected after Dean feedback"
              }
            ]
          }
        });
        assert.equal(facultyResubmitRes.response.status, 200, "Faculty resubmission must succeed");
        console.log("✓ Faculty updated grade to 92.0 and resubmitted");

        // 3i: Dean A approves grades
        const approveRemarks = "Endorsed for Registrar posting.";
        const deanApproveRes = await deanAClient.request(`/api/v1/dean/grades/offering/${offeringA.id}/approve`, {
          method: "POST",
          json: { remarks: approveRemarks }
        });
        assert.equal(deanApproveRes.response.status, 200, "Dean grade approval must succeed");
        console.log("✓ Dean approved grades and forwarded to Registrar");

        // 3j: Faculty CANNOT edit grades while in APPROVED state
        const facultyUnauthorizedEdit = await teacherClientA.request(`/api/v1/faculty/classes/${offeringA.id}/grades`, {
          method: "POST",
          json: {
            grades: [
              {
                enrollmentItemId: enrolledItemA.id,
                gradingPeriodId: gradingPeriod.id,
                numericGrade: 99.0,
                remarks: "Unauthorized attempt"
              }
            ]
          }
        });
        assert.equal(facultyUnauthorizedEdit.response.status, 409, "Faculty cannot edit Dean-approved grades");
        console.log("✓ Faculty locked from editing Dean-approved grades (409 Conflict)");

        // 3k: Registrar pending queue shows Offering A as DEAN_APPROVED
        const regClient = new TestApiClient(baseUrl);
        await regClient.login(registrarUser.username, defaultPassword);

        const regQueueRes = await regClient.request("/api/v1/registrar/grades/submissions");
        assert.equal(regQueueRes.response.status, 200);
        const regOffering = regQueueRes.payload.data.submissions.find((s) => s.offeringId === offeringA.id);
        assert.ok(regOffering, "Offering must appear in Registrar queue");
        assert.equal(regOffering.approvalStage, "DEAN_APPROVED");
        console.log("✓ Registrar sees offering marked as DEAN_APPROVED");

        // 3l: Registrar approves and permanently posts grades
        const regApproveRes = await regClient.request(`/api/v1/registrar/grades/submissions/${offeringA.id}/approve`, {
          method: "POST"
        });
        assert.equal(regApproveRes.response.status, 200, "Registrar approval must succeed");

        const dbGrade = await transaction.grade.findFirstOrThrow({
          where: { enrollmentItemId: enrolledItemA.id }
        });
        assert.equal(dbGrade.status, "POSTED", "Grade status must be permanently POSTED");
        assert.equal(Number(dbGrade.numericGrade), 92.0);
        console.log("✓ Grades permanently posted and verified in database");

        // ══════════════════════════════════════════════════════════════════════
        // TEST 4: Collegiate Program Evaluation Flow
        // ══════════════════════════════════════════════════════════════════════
        console.log("\n[TEST 4] Collegiate Program Evaluation Flow...");
        // Create student 3 in Program A with a pending enrollment application
        const studentUser3 = await transaction.user.create({
          data: {
            id: newId(),
            username: `stu3_${suffix}`,
            usernameNormalized: normalizeIdentifier(`stu3_${suffix}`),
            email: `stu3_${suffix}@cjc.edu.ph`,
            emailNormalized: normalizeIdentifier(`stu3_${suffix}@cjc.edu.ph`),
            displayName: "Grace Hopper",
            passwordHash: defaultPasswordHash,
            status: "ACTIVE",
            studentProfile: {
              create: {
                id: newId(),
                studentNumber: `SN-EVAL-${suffix}`,
                studentNumberNormalized: normalizeIdentifier(`SN-EVAL-${suffix}`),
                firstName: "Grace",
                lastName: "Hopper",
                programId: programA.id,
                curriculumId: curriculumA.id,
                admissionYear: 2026,
                currentYearLevel: 1,
                status: "ACTIVE"
              }
            }
          },
          include: { studentProfile: true }
        });
        const student3 = studentUser3.studentProfile;

        const pendingEnrollment = await transaction.enrollment.create({
          data: {
            id: newId(),
            studentId: student3.id,
            academicTermId: activeTerm.id,
            programId: programA.id,
            curriculumId: curriculumA.id,
            yearLevel: 1,
            status: "PENDING",
            items: {
              create: {
                id: newId(),
                courseOfferingId: offeringA.id,
                status: "PENDING"
              }
            }
          }
        });

        // 4a: Appears in Dean A pending evaluations
        const deanAEvals = await deanAClient.request("/api/v1/dean/evaluations/pending");
        assert.equal(deanAEvals.response.status, 200);
        const evalItem = deanAEvals.payload.data.evaluations.find((e) => e.id === pendingEnrollment.id);
        assert.ok(evalItem, "Pending enrollment must be in Dean A evaluation queue");

        // 4b: Dean B cannot see or access Dean A student evaluation (403)
        const deanBCrossEval = await deanBClient.request(`/api/v1/dean/evaluations/${pendingEnrollment.id}`);
        assert.equal(deanBCrossEval.response.status, 403, "Cross-college evaluation access must be forbidden");
        console.log("✓ Cross-college student evaluation attempt blocked with 403");

        // 4c: Dean A views evaluation details
        const deanAEvalDetail = await deanAClient.request(`/api/v1/dean/evaluations/${pendingEnrollment.id}`);
        assert.equal(deanAEvalDetail.response.status, 200);
        assert.equal(deanAEvalDetail.payload.data.enrollment.student.id, student3.id);

        // 4d: Dean A approves academic evaluation
        const approveEvalRes = await deanAClient.request(`/api/v1/dean/evaluations/${pendingEnrollment.id}/approve`, {
          method: "POST",
          json: { remarks: "Collegiate curriculum check passed." }
        });
        assert.equal(approveEvalRes.response.status, 200, "Dean evaluation approval must succeed");

        const updatedEnrollment = await transaction.enrollment.findUniqueOrThrow({
          where: { id: pendingEnrollment.id }
        });
        assert.equal(updatedEnrollment.status, "ASSESSED", "Enrollment status must advance to ASSESSED");

        // Verify audit log
        const auditLog = await transaction.auditLog.findFirst({
          where: { eventType: "dean.evaluation.approved", resourceId: pendingEnrollment.id }
        });
        assert.ok(auditLog, "Audit log must record dean.evaluation.approved");
        console.log("✓ Collegiate program evaluation approved and logged in system audit trail");

      } finally {
        await new Promise((resolve) => server.close(resolve));
      }

      // Rollback test data cleanly
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
});
