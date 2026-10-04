import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createDatabase } from "../server/db.mjs";
import { createConfig } from "../server/config.mjs";
import { newId, normalizeIdentifier, hashPassword, tokenHash } from "../server/security.mjs";
import { createApp } from "../server/app.mjs";

const prisma = createDatabase();

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

const expectedOrigin = "http://portal.test";

class TestApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookies = new Map();
    this.csrfToken = "";
  }

  async request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers(options.headers || {});
    const cookieHeader = Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
    if (cookieHeader) headers.set("Cookie", cookieHeader);
    if (!["GET", "HEAD"].includes(options.method || "GET")) {
      headers.set("Origin", expectedOrigin);
      if (this.csrfToken) headers.set("X-CSRF-Token", this.csrfToken);
    }
    if (options.json !== undefined) {
      headers.set("Content-Type", "application/json");
      options.body = JSON.stringify(options.json);
    }

    const response = await fetch(url, { ...options, headers, redirect: "manual" });
    const setCookies = response.headers.getSetCookie?.() || [];
    for (const cookie of setCookies) {
      const parts = cookie.split(";")[0].split("=");
      if (parts.length >= 2) {
        this.cookies.set(parts[0].trim(), parts.slice(1).join("=").trim());
      }
    }

    let payload = null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      payload = await response.json();
      if (payload?.data?.csrfToken) this.csrfToken = payload.data.csrfToken;
      if (payload?.csrfToken) this.csrfToken = payload.csrfToken;
    }
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

test("Faculty Management & Access Control: Complete 9-Phase Verification Workflow", async () => {
  const rollback = new Error("ROLLBACK_TEST_TRANSACTION");
  try {
    await prisma.$transaction(async (transaction) => {
      const database = nestedTransactionClient(transaction);
      const suffix = newId().slice(0, 8);
      const config = createConfig({
        nodeEnv: "test",
        appOrigin: expectedOrigin,
        auditPepper: "faculty-test-pepper",
        scryptN: 1 << 10
      });

      // ── Set up reference data: Colleges, Programs, Curricula, Offerings, Term ──
      let activeTerm = await transaction.academicTerm.findFirst({
        where: { status: { notIn: ["CLOSED", "ARCHIVED"] } },
        include: { academicYear: true, gradingPeriods: true }
      });
      if (!activeTerm) {
        const academicYear = await transaction.academicYear.create({
          data: {
            id: newId(),
            code: `AY-${suffix}`,
            name: `Academic Year ${suffix}`,
            startsOn: new Date("2026-06-01"),
            endsOn: new Date("2027-05-31")
          }
        });
        activeTerm = await transaction.academicTerm.create({
          data: {
            id: newId(),
            academicYearId: academicYear.id,
            code: `TERM-${suffix}`,
            name: `1st Semester ${suffix}`,
            termNumber: 1,
            startsOn: new Date("2026-06-01"),
            endsOn: new Date("2026-10-31"),
            status: "ACTIVE"
          },
          include: { academicYear: true, gradingPeriods: true }
        });
      }

      // Ensure grading period exists for the term
      let gradingPeriod = await transaction.gradingPeriod.findFirst({
        where: { academicTermId: activeTerm.id }
      });
      if (!gradingPeriod) {
        gradingPeriod = await transaction.gradingPeriod.create({
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
      }

      // Find or create two different Colleges (e.g., COE and CCIS)
      let collegeA = await transaction.college.findFirst({
        where: { isActive: true },
        include: { departments: { where: { isActive: true } } }
      });
      if (!collegeA) {
        collegeA = await transaction.college.create({
          data: {
            id: newId(),
            code: `COE-${suffix}`,
            name: `College of Engineering ${suffix}`,
            shortName: "COE",
            departments: {
              create: {
                id: newId(),
                code: `DEPT-ECE-${suffix}`,
                name: `ECE Department ${suffix}`
              }
            }
          },
          include: { departments: true }
        });
      }

      let collegeB = await transaction.college.findFirst({
        where: { id: { not: collegeA.id }, isActive: true },
        include: { departments: { where: { isActive: true } } }
      });
      if (!collegeB) {
        collegeB = await transaction.college.create({
          data: {
            id: newId(),
            code: `CCIS-${suffix}`,
            name: `College of Computer Studies ${suffix}`,
            shortName: "CCIS",
            departments: {
              create: {
                id: newId(),
                code: `DEPT-CS-${suffix}`,
                name: `CS Department ${suffix}`
              }
            }
          },
          include: { departments: true }
        });
      }

      // Ensure each college has a department
      const deptA = collegeA.departments[0] || await transaction.department.create({
        data: { id: newId(), collegeId: collegeA.id, code: `DEPT-A-${suffix}`, name: `Dept A ${suffix}` }
      });
      const deptB = collegeB.departments[0] || await transaction.department.create({
        data: { id: newId(), collegeId: collegeB.id, code: `DEPT-B-${suffix}`, name: `Dept B ${suffix}` }
      });

      // Find or create Program under College A
      let programA = await transaction.program.findFirst({
        where: { department: { collegeId: collegeA.id }, isActive: true },
        include: { department: true }
      });
      if (!programA) {
        programA = await transaction.program.create({
          data: {
            id: newId(),
            departmentId: deptA.id,
            code: `PROG-A-${suffix}`,
            codeNormalized: normalizeIdentifier(`PROG-A-${suffix}`),
            name: `Program A ${suffix}`,
            credential: "BS",
            durationYears: 4,
            termsPerYear: 2,
            isActive: true
          },
          include: { department: true }
        });
      }

      // Subject and curriculum for Program A
      let subjectA = await transaction.subject.findFirst({
        where: { isActive: true }
      });
      if (!subjectA) {
        subjectA = await transaction.subject.create({
          data: {
            id: newId(),
            departmentId: deptA.id,
            code: `SUBJ-A-${suffix}`,
            codeNormalized: normalizeIdentifier(`SUBJ-A-${suffix}`),
            title: `Subject A ${suffix}`,
            creditUnits: 3,
            lectureHours: 3,
            laboratoryHours: 0
          }
        });
      }

      let curriculumA = await transaction.curriculum.findFirst({
        where: { programId: programA.id, status: { not: "RETIRED" } },
        include: { subjects: true }
      });
      if (!curriculumA) {
        curriculumA = await transaction.curriculum.create({
          data: {
            id: newId(),
            programId: programA.id,
            code: `CURR-A-${suffix}`,
            name: `Curriculum A ${suffix}`,
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
      }
      const placementA = curriculumA.subjects[0];

      // Create Roles & Grants for admin, registrar, program_head, faculty
      const adminRole = await transaction.role.findUnique({ where: { slug: "administrator" } });
      const registrarRole = await transaction.role.findUnique({ where: { slug: "registrar" } });
      const phRole = await transaction.role.findUnique({ where: { slug: "program_head" } });
      const facultyRole = await transaction.role.findUnique({ where: { slug: "faculty" } });

      assert.ok(adminRole && registrarRole && phRole && facultyRole, "System roles must exist");

      // Create Admin User
      const adminPassword = "AdminUser123!";
      const adminPasswordHash = await hashPassword(adminPassword, config.scrypt);
      const adminUser = await transaction.user.create({
        data: {
          id: newId(),
          username: `admin_${suffix}`,
          usernameNormalized: normalizeIdentifier(`admin_${suffix}`),
          email: `admin_${suffix}@cjc.edu.ph`,
          emailNormalized: normalizeIdentifier(`admin_${suffix}@cjc.edu.ph`),
          displayName: "System Administrator",
          passwordHash: adminPasswordHash,
          status: "ACTIVE",
          mustChangePassword: false,
          userRoles: {
            create: { roleId: adminRole.id, isPrimary: true }
          }
        }
      });

      // Create Registrar User
      const regPassword = "RegistrarUser123!";
      const regPasswordHash = await hashPassword(regPassword, config.scrypt);
      const registrarUser = await transaction.user.create({
        data: {
          id: newId(),
          username: `registrar_${suffix}`,
          usernameNormalized: normalizeIdentifier(`registrar_${suffix}`),
          email: `registrar_${suffix}@cjc.edu.ph`,
          emailNormalized: normalizeIdentifier(`registrar_${suffix}@cjc.edu.ph`),
          displayName: "Official Registrar",
          passwordHash: regPasswordHash,
          status: "ACTIVE",
          mustChangePassword: false,
          userRoles: {
            create: { roleId: registrarRole.id, isPrimary: true }
          }
        }
      });

      // Create Program Head User for Program A
      const phPassword = "ProgramHead123!";
      const phPasswordHash = await hashPassword(phPassword, config.scrypt);
      const phUser = await transaction.user.create({
        data: {
          id: newId(),
          username: `ph_${suffix}`,
          usernameNormalized: normalizeIdentifier(`ph_${suffix}`),
          email: `ph_${suffix}@cjc.edu.ph`,
          emailNormalized: normalizeIdentifier(`ph_${suffix}@cjc.edu.ph`),
          displayName: "Head Program A",
          passwordHash: phPasswordHash,
          status: "ACTIVE",
          mustChangePassword: false,
          userRoles: {
            create: { roleId: phRole.id, isPrimary: true }
          }
        }
      });
      await transaction.userProgramAssignment.create({
        data: {
          id: newId(),
          userId: phUser.id,
          programId: programA.id
        }
      });

      // Launch test API server
      const app = await createApp({ config, database });
      const server = createServer(app.handler);
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const port = server.address().port;
      const baseUrl = `http://127.0.0.1:${port}`;

      try {
        const adminClient = new TestApiClient(baseUrl);
        const loginRes = await adminClient.login(adminUser.username, adminPassword);
        assert.equal(loginRes.response.status, 200, "Admin login should succeed");

        // ------------------------------------------------------------------
        // TEST 1: Administrator creates a new Faculty account
        // ------------------------------------------------------------------
        console.log("\n[TEST 1] Administrator creates a new Faculty account...");
        const empNumA = `EMP-A-${suffix}`;
        const facultyEmailA = `prof.a.${suffix}@cjc.edu.ph`;
        const facultyPassA = `FacultySecure123!`;

        const createResA = await adminClient.request("/api/v1/admin/faculty", {
          method: "POST",
          json: {
            firstName: "Alan",
            lastName: "Turing",
            employeeNumber: empNumA,
            email: facultyEmailA,
            collegeId: collegeA.id,
            password: facultyPassA
          }
        });

        assert.equal(createResA.response.status, 201, "Faculty creation should return 201 Created");
        const createdFacultyA = createResA.payload.data;
        assert.ok(createdFacultyA.id, "Faculty ID must be returned");
        assert.equal(createdFacultyA.employeeNumber, empNumA);
        assert.equal(createdFacultyA.college.id, collegeA.id);
        console.log(`✓ Faculty A created under College A (${collegeA.name}): ${createdFacultyA.fullName}`);

        // Also create Faculty B under College B
        const empNumB = `EMP-B-${suffix}`;
        const facultyEmailB = `prof.b.${suffix}@cjc.edu.ph`;
        const facultyPassB = `FacultySecure123!`;

        const createResB = await adminClient.request("/api/v1/admin/faculty", {
          method: "POST",
          json: {
            firstName: "Ada",
            lastName: "Lovelace",
            employeeNumber: empNumB,
            email: facultyEmailB,
            collegeId: collegeB.id,
            password: facultyPassB
          }
        });
        assert.equal(createResB.response.status, 201);
        const createdFacultyB = createResB.payload.data;
        console.log(`✓ Faculty B created under College B (${collegeB.name}): ${createdFacultyB.fullName}`);

        // ------------------------------------------------------------------
        // TEST 2: Administrator verifies Faculty ownership and College assignment
        // ------------------------------------------------------------------
        console.log("\n[TEST 2] Verifying Faculty accounts in database and Admin API...");
        const listRes = await adminClient.request("/api/v1/admin/faculty");
        assert.equal(listRes.response.status, 200);
        const list = listRes.payload.data.faculty;
        const foundA = list.find((f) => f.employeeNumber === empNumA);
        const foundB = list.find((f) => f.employeeNumber === empNumB);
        assert.ok(foundA && foundB, "Both faculty accounts must appear in the admin list");
        assert.equal(foundA.college.id, collegeA.id);
        assert.equal(foundB.college.id, collegeB.id);
        console.log("✓ Faculty accounts verified with correct College ownership");

        // ------------------------------------------------------------------
        // TEST 3: Assign faculty to a subject offering under the SAME College -> Allowed
        // ------------------------------------------------------------------
        console.log("\n[TEST 3] Assigning Faculty A to Program A offering (Same College)...");
        const regClient = new TestApiClient(baseUrl);
        await regClient.login(registrarUser.username, regPassword);

        const offeringRes1 = await regClient.request("/api/v1/registrar/offerings", {
          method: "POST",
          json: {
            academicTermId: activeTerm.id,
            programId: programA.id,
            curriculumId: curriculumA.id,
            subjectId: placementA.subjectId,
            sectionCode: `SEC-1-${suffix}`,
            offeringCode: `OFF-1-${suffix}`,
            capacity: 35,
            facultyId: createdFacultyA.id,
            status: "OPEN"
          }
        });

        assert.equal(offeringRes1.response.status, 201, "Same-college faculty assignment should succeed");
        const offering1 = offeringRes1.payload.data.offering;
        assert.equal(offering1.offeringCode, `OFF-1-${suffix}`);
        console.log(`✓ Offering created with same-college faculty: ${offering1.offeringCode}`);

        // ------------------------------------------------------------------
        // TEST 4: Program Head assigns faculty from a DIFFERENT College -> Blocked
        // ------------------------------------------------------------------
        console.log("\n[TEST 4] Program Head attempts cross-college faculty assignment...");
        const phClient = new TestApiClient(baseUrl);
        await phClient.login(phUser.username, phPassword);

        const crossCollegeRes = await phClient.request("/api/v1/program-head/offerings", {
          method: "POST",
          json: {
            academicTermId: activeTerm.id,
            curriculumId: curriculumA.id,
            subjectId: placementA.subjectId,
            sectionCode: `SEC-CROSS-${suffix}`,
            offeringCode: `OFF-CROSS-${suffix}`,
            capacity: 30,
            facultyId: createdFacultyB.id // Faculty B belongs to College B, while Program A is College A
          }
        });

        assert.equal(crossCollegeRes.response.status, 403, "Program Head must be blocked with 403");
        assert.equal(crossCollegeRes.payload.error.code, "CROSS_COLLEGE_FACULTY_FORBIDDEN");
        console.log("✓ Program Head correctly blocked with 403 CROSS_COLLEGE_FACULTY_FORBIDDEN");

        // ------------------------------------------------------------------
        // TEST 5: Registrar assigns faculty with cross-college override and overrideReason
        // ------------------------------------------------------------------
        console.log("\n[TEST 5] Registrar assigns cross-college faculty with overrideReason...");
        // 5a: Missing override reason -> 422
        const noReasonRes = await regClient.request("/api/v1/registrar/offerings", {
          method: "POST",
          json: {
            academicTermId: activeTerm.id,
            programId: programA.id,
            curriculumId: curriculumA.id,
            subjectId: placementA.subjectId,
            sectionCode: `SEC-REG-CROSS-${suffix}`,
            offeringCode: `OFF-REG-CROSS-${suffix}`,
            capacity: 30,
            facultyId: createdFacultyB.id
            // No overrideReason
          }
        });
        assert.equal(noReasonRes.response.status, 422, "Registrar must provide overrideReason");
        assert.equal(noReasonRes.payload.error.code, "CROSS_COLLEGE_OVERRIDE_REQUIRED");
        console.log("✓ Cross-college without reason correctly rejected with 422 CROSS_COLLEGE_OVERRIDE_REQUIRED");

        // 5b: With override reason -> 201 and audit logged
        const overrideReason = "Specialized inter-departmental expertise approved by Dean";
        const withReasonRes = await regClient.request("/api/v1/registrar/offerings", {
          method: "POST",
          json: {
            academicTermId: activeTerm.id,
            programId: programA.id,
            curriculumId: curriculumA.id,
            subjectId: placementA.subjectId,
            sectionCode: `SEC-OVERRIDE-${suffix}`,
            offeringCode: `OFF-OVERRIDE-${suffix}`,
            capacity: 30,
            facultyId: createdFacultyB.id,
            overrideReason
          }
        });
        assert.equal(withReasonRes.response.status, 201, "Cross-college with overrideReason should succeed");
        const offering2 = withReasonRes.payload.data.offering;
        console.log(`✓ Registrar successfully assigned cross-college faculty with override: ${offering2.offeringCode}`);

        // Verify audit log
        const auditLog = await database.auditLog.findFirst({
          where: {
            eventType: "faculty.cross_college_override",
            actorUserId: registrarUser.id
          }
        });
        assert.ok(auditLog, "faculty.cross_college_override audit event must be logged");
        console.log("✓ faculty.cross_college_override verified in AuditLog");

        // ------------------------------------------------------------------
        // TEST 6: Teacher logs in -> Only assigned classes are returned
        // ------------------------------------------------------------------
        console.log("\n[TEST 6] Teacher A logs in and checks assigned classes...");
        // Set mustChangePassword: false for testing direct login
        await database.user.update({
          where: { id: createdFacultyA.userId },
          data: { mustChangePassword: false }
        });

        const teacherClientA = new TestApiClient(baseUrl);
        const tLoginRes = await teacherClientA.login(createdFacultyA.username, facultyPassA);
        assert.equal(tLoginRes.response.status, 200, "Teacher A login should succeed");

        const classesResA = await teacherClientA.request("/api/v1/faculty/classes");
        assert.equal(classesResA.response.status, 200);
        const classesA = classesResA.payload.data.classes;

        // Teacher A should only see Offering 1 (assigned to Faculty A)
        assert.equal(classesA.length, 1, "Teacher A must only see their assigned class");
        assert.equal(classesA[0].offeringId, offering1.id);
        console.log(`✓ Teacher A only sees their assigned offering: ${classesA[0].offeringCode}`);

        // ------------------------------------------------------------------
        // TEST 7: Teacher opens class list -> Only officially enrolled students appear
        // ------------------------------------------------------------------
        console.log("\n[TEST 7] Enrolling a student and checking Teacher class roster...");
        // Create student and enrollment
        const studentUser = await transaction.user.create({
          data: {
            id: newId(),
            username: `student_${suffix}`,
            usernameNormalized: normalizeIdentifier(`student_${suffix}`),
            email: `student_${suffix}@cjc.edu.ph`,
            emailNormalized: normalizeIdentifier(`student_${suffix}@cjc.edu.ph`),
            displayName: "Test Student",
            passwordHash: adminPasswordHash,
            status: "ACTIVE",
            studentProfile: {
              create: {
                id: newId(),
                studentNumber: `SN-${suffix}`,
                studentNumberNormalized: normalizeIdentifier(`SN-${suffix}`),
                firstName: "Grace",
                lastName: "Hopper",
                program: { connect: { id: programA.id } },
                currentYearLevel: 1,
                status: "ACTIVE",
                admissionYear: 2026
              }
            }
          },
          include: { studentProfile: true }
        });
        const student = studentUser.studentProfile;

        // Create enrollment and enrollment item
        const enrollment = await transaction.enrollment.create({
          data: {
            id: newId(),
            studentId: student.id,
            academicTermId: activeTerm.id,
            programId: programA.id,
            curriculumId: curriculumA.id,
            yearLevel: 1,
            status: "ENROLLED",
            items: {
              create: {
                id: newId(),
                courseOfferingId: offering1.id,
                status: "ENROLLED"
              }
            }
          },
          include: { items: true }
        });
        const enrolledItem = enrollment.items[0];

        // Fetch roster via Teacher API
        const rosterRes = await teacherClientA.request(`/api/v1/faculty/classes/${offering1.id}/students`);
        assert.equal(rosterRes.response.status, 200);
        const rosterData = rosterRes.payload.data;
        assert.equal(rosterData.students.length, 1, "Roster must show 1 enrolled student");
        assert.equal(rosterData.students[0].studentNumber, student.studentNumber);
        assert.equal(rosterData.students[0].firstName, "Grace");
        console.log(`✓ Roster verified: Student ${rosterData.students[0].fullName} (${rosterData.students[0].studentNumber})`);

        // ------------------------------------------------------------------
        // TEST 8: Teacher encodes and submits grades -> Registrar approves -> POSTED
        // ------------------------------------------------------------------
        console.log("\n[TEST 8] Grade encoding workflow (DRAFT -> SUBMITTED -> POSTED)...");
        // 8a: Save draft
        const saveDraftRes = await teacherClientA.request(`/api/v1/faculty/classes/${offering1.id}/grades`, {
          method: "POST",
          json: {
            grades: [
              {
                enrollmentItemId: enrolledItem.id,
                gradingPeriodId: gradingPeriod.id,
                numericGrade: 88.5,
                remarks: "Good performance"
              }
            ]
          }
        });
        assert.equal(saveDraftRes.response.status, 200);
        assert.equal(saveDraftRes.payload.data.status, "DRAFT");
        assert.equal(Number(saveDraftRes.payload.data.grades[0].numericGrade), 88.5);
        console.log("✓ Grade saved as DRAFT (88.5)");

        // 8b: Submit grades to Registrar
        const submitRes = await teacherClientA.request(`/api/v1/faculty/classes/${offering1.id}/grades/submit`, {
          method: "POST",
          json: {
            grades: [
              {
                enrollmentItemId: enrolledItem.id,
                gradingPeriodId: gradingPeriod.id,
                numericGrade: 89.0,
                remarks: "Final project submitted"
              }
            ]
          }
        });
        assert.equal(submitRes.response.status, 200);
        assert.equal(submitRes.payload.data.status, "SUBMITTED");
        console.log("✓ Grade submitted to Registrar as SUBMITTED (89.0)");

        // 8c: Registrar views submissions and approves
        const submissionsRes = await regClient.request("/api/v1/registrar/grades/submissions");
        assert.equal(submissionsRes.response.status, 200);
        const subList = submissionsRes.payload.data.submissions;
        const subOffering = subList.find((s) => s.offeringId === offering1.id);
        assert.ok(subOffering, "Offering 1 must appear in Registrar pending grade submissions");
        assert.equal(subOffering.submittedGradeCount, 1);
        console.log(`✓ Registrar sees pending submission for ${subOffering.offeringCode}`);

        // Registrar approves grades
        const approveRes = await regClient.request(`/api/v1/registrar/offerings/${offering1.id}/grades/approve`, {
          method: "POST",
          json: {}
        });
        assert.equal(approveRes.response.status, 200);
        assert.equal(approveRes.payload.data.status, "POSTED");
        console.log("✓ Registrar approved grades -> status is now POSTED");

        // Verify grade is POSTED and locked in DB
        const finalGrade = await database.grade.findUnique({
          where: {
            enrollmentItemId_gradingPeriodId: {
              enrollmentItemId: enrolledItem.id,
              gradingPeriodId: gradingPeriod.id
            }
          }
        });
        assert.equal(finalGrade.status, "POSTED");
        assert.equal(Number(finalGrade.numericGrade), 89.0);
        assert.equal(finalGrade.isPassing, true);
        assert.equal(finalGrade.approvedByUserId, registrarUser.id);
        console.log("✓ Grade permanently locked and posted in database");

        // Attempting to modify POSTED grade must fail
        const modifyRes = await teacherClientA.request(`/api/v1/faculty/classes/${offering1.id}/grades`, {
          method: "POST",
          json: {
            grades: [{ enrollmentItemId: enrolledItem.id, gradingPeriodId: gradingPeriod.id, numericGrade: 95 }]
          }
        });
        assert.equal(modifyRes.response.status, 409, "Teacher cannot modify POSTED grades");
        console.log("✓ Modification of POSTED grade rejected with 409 GRADE_ALREADY_POSTED");

        // ------------------------------------------------------------------
        // TEST 9: Teacher attempts to access another teacher's class -> 403
        // ------------------------------------------------------------------
        console.log("\n[TEST 9] Verifying teacher isolation (accessing another teacher's class)...");
        // Teacher A attempts to access Offering 2 (assigned to Faculty B)
        const unauthRosterRes = await teacherClientA.request(`/api/v1/faculty/classes/${offering2.id}/students`);
        assert.equal(unauthRosterRes.response.status, 403, "Teacher accessing unassigned class must return 403");
        assert.equal(unauthRosterRes.payload.error.code, "UNAUTHORIZED_CLASS_ACCESS");
        console.log("✓ Access denied with 403 UNAUTHORIZED_CLASS_ACCESS");

        console.log("\n=======================================================");
        console.log("ALL 9 FACULTY MANAGEMENT WORKFLOW TESTS PASSED!");
        console.log("=======================================================\n");

      } finally {
        await new Promise((resolve) => server.close(resolve));
      }

      throw rollback;
    });
  } catch (caught) {
    if (caught !== rollback) throw caught;
  }
});
