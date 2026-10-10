import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import { createDatabase } from "../server/db.mjs";
import { createConfig } from "../server/config.mjs";
import { createApp } from "../server/app.mjs";
import { AuthenticationStore } from "../server/auth-store.mjs";
import { AdmissionStore } from "../server/admission-store.mjs";
import { ClubStore } from "../server/club-store.mjs";
import { StudentStore } from "../server/student-store.mjs";
import { hashPassword, newId, normalizeIdentifier } from "../server/security.mjs";

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

test("Club Environment Module: SSC governance, Club AOR isolation, 3-club limit, dynamic portal views, clearance authority and audit", { timeout: 60_000 }, async () => {
  const prisma = createDatabase();
  const rollback = new Error("ROLLBACK_CLUB_TEST");

  try {
    await prisma.$transaction(async (transaction) => {
      const database = nestedTransactionClient(transaction);
      const admissionStore = new AdmissionStore(database);
      const clubStore = new ClubStore(database);
      const studentStore = new StudentStore(database);

      const config = createConfig({
        nodeEnv: "test",
        auditPepper: "test-audit-pepper-that-is-long-and-private",
        scryptN: 1 << 10
      });

      const suffix = newId().slice(0, 8);

      // ── 1. Create SSC Account by Admin
      const sscRole = await database.role.findFirst({ where: { slug: "ssc" } });
      assert.ok(sscRole, "SSC role must exist in catalog");

      const sscPassword = "SscPassword2026!";
      const sscPasswordHash = await hashPassword(sscPassword, config.scrypt);

      const sscUser = await database.user.create({
        data: {
          id: newId(),
          username: `ssc_officer_${suffix}`,
          usernameNormalized: normalizeIdentifier(`ssc_officer_${suffix}`),
          email: `ssc_${suffix}@example.test`,
          emailNormalized: normalizeIdentifier(`ssc_${suffix}@example.test`),
          displayName: `Student Services Officer ${suffix}`,
          passwordHash: sscPasswordHash,
          status: "ACTIVE",
          mustChangePassword: false,
          userRoles: {
            create: { roleId: sscRole.id, isPrimary: true }
          }
        }
      });
      assert.ok(sscUser, "SSC user created");

      // ── 2. Register 4 Students for Membership & Officer Roles
      const studentPassword = "StudentPass123!";
      const createTestStudent = async (prefix) => {
        const reg = await admissionStore.registerStudent({
          firstName: prefix,
          middleName: "Club",
          lastName: `Student_${suffix}`,
          birthDate: "2006-05-15",
          personalEmail: `${prefix.toLowerCase()}_${suffix}@example.test`,
          mobileNumber: "09171234567",
          admissionYear: 2026,
          password: studentPassword,
          confirmPassword: studentPassword
        }, config);

        const st = await database.student.findUnique({
          where: { studentNumberNormalized: normalizeIdentifier(reg.studentNumber) },
          include: { user: true }
        });
        return st;
      };

      const studentLeader = await createTestStudent("Leader");
      const studentOfficer = await createTestStudent("Officer");
      const studentMember = await createTestStudent("Member");
      const studentExtra = await createTestStudent("Extra");

      assert.ok(studentLeader && studentOfficer && studentMember && studentExtra);

      // ── 3. SSC Charters Clubs
      const now = new Date();
      const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const pastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Club 1: Active Academic Club (e.g. JPCS)
      const res1 = await clubStore.createClub(sscUser.id, {
        code: `JPCS-${suffix}`,
        name: `Junior Philippine Computer Society ${suffix}`,
        category: "ACADEMIC",
        adviser: "Prof. Alan Turing",
        description: "Official computer science and IT student chapter.",
        username: `jpcs_${suffix}`,
        password: "ClubPassword123!",
        effectivityStartDate: now.toISOString(),
        effectivityEndDate: nextMonth.toISOString()
      });

      const club1 = res1.club;
      assert.ok(club1.id);
      assert.equal(club1.status, "ACTIVE");
      assert.ok(res1.account);
      assert.equal(res1.account.username, `jpcs_${suffix}`);

      // Club 2: Active Non-Academic Club (e.g. ACES)
      const res2 = await clubStore.createClub(sscUser.id, {
        code: `ACES-${suffix}`,
        name: `Civil Engineering Society ${suffix}`,
        category: "NON_ACADEMIC",
        adviser: "Engr. Isambard Brunel",
        username: `aces_${suffix}`,
        password: "ClubPassword123!",
        effectivityStartDate: now.toISOString(),
        effectivityEndDate: nextMonth.toISOString()
      });
      const club2 = res2.club;

      // Club 3: Active Sports Club
      const res3 = await clubStore.createClub(sscUser.id, {
        code: `SPORTS-${suffix}`,
        name: `Varsity Sports Guild ${suffix}`,
        category: "NON_ACADEMIC",
        adviser: "Coach John Wooden",
        username: `sports_${suffix}`,
        password: "ClubPassword123!",
        effectivityStartDate: now.toISOString(),
        effectivityEndDate: nextMonth.toISOString()
      });
      const club3 = res3.club;

      // Club 4: Active Cultural Club
      const res4 = await clubStore.createClub(sscUser.id, {
        code: `CULT-${suffix}`,
        name: `Cultural Arts Guild ${suffix}`,
        category: "NON_ACADEMIC",
        adviser: "Prof. Leonardo Da Vinci",
        username: `cult_${suffix}`,
        password: "ClubPassword123!",
        effectivityStartDate: now.toISOString(),
        effectivityEndDate: nextMonth.toISOString()
      });
      const club4 = res4.club;

      // Club 5: Expired Club (dates in past)
      const resExpired = await clubStore.createClub(sscUser.id, {
        code: `OLD-${suffix}`,
        name: `Historical Society ${suffix}`,
        category: "ACADEMIC",
        adviser: "Prof. Herodotus",
        username: `old_${suffix}`,
        password: "ClubPassword123!",
        effectivityStartDate: pastMonth.toISOString(),
        effectivityEndDate: yesterday.toISOString()
      });
      const clubExpired = resExpired.club;

      // ── 4. SSC List & Filter Clubs
      const allClubs = await clubStore.listClubsForSsc("ALL");
      assert.ok(allClubs.clubs.some((c) => c.id === club1.id));
      assert.ok(allClubs.clubs.some((c) => c.id === clubExpired.id));

      const activeClubs = await clubStore.listClubsForSsc("ACTIVE");
      assert.ok(activeClubs.clubs.some((c) => c.id === club1.id));
      assert.ok(!activeClubs.clubs.some((c) => c.id === clubExpired.id), "Expired club should not be in ACTIVE filter");

      const expiredClubs = await clubStore.listClubsForSsc("EXPIRED");
      assert.ok(expiredClubs.clubs.some((c) => c.id === clubExpired.id), "Expired club should be in EXPIRED filter");

      // SSC updates status: Deactivate Club 2
      await clubStore.updateClubStatus(sscUser.id, club2.id, "INACTIVE");
      const updatedClub2 = await database.club.findUnique({ where: { id: club2.id } });
      assert.equal(updatedClub2.status, "INACTIVE");

      // SSC updates effectivity dates of Club 1
      const extendedDate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      await clubStore.updateClubEffectivity(sscUser.id, club1.id, {
        effectivityStartDate: now.toISOString(),
        effectivityEndDate: extendedDate.toISOString()
      });
      const updatedClub1 = await database.club.findUnique({ where: { id: club1.id } });
      assert.equal(new Date(updatedClub1.effectivityEndDate).getTime(), extendedDate.getTime());

      // ── 5. Club Account Operations & Exact Student ID Validation
      const club1AccountId = res1.account.id;

      // Validate student by exact ID number
      const validatedStudent = await clubStore.validateStudentForOfficer(club1AccountId, studentLeader.studentNumber);
      assert.equal(validatedStudent.id, studentLeader.id);
      assert.equal(validatedStudent.studentNumber, studentLeader.studentNumber);

      // Appointing invalid student ID throws error
      await assert.rejects(
        () => clubStore.validateStudentForOfficer(club1AccountId, "INVALID-NONEXISTENT-ID"),
        /STUDENT_NOT_FOUND/
      );

      // Appoint studentLeader as President WITH clearance authority
      const officer1 = await clubStore.assignOfficer(club1AccountId, {
        studentId: studentLeader.id,
        position: "President",
        canClearClearance: true
      });
      assert.equal(officer1.position, "President");
      assert.equal(officer1.canClearClearance, true);

      // Appoint studentOfficer as Secretary WITHOUT clearance authority
      const officer2 = await clubStore.assignOfficer(club1AccountId, {
        studentId: studentOfficer.id,
        position: "Secretary",
        canClearClearance: false
      });
      assert.equal(officer2.position, "Secretary");
      assert.equal(officer2.canClearClearance, false);

      // Verify officers are in club dashboard
      const club1Dashboard = await clubStore.getClubDashboard(club1AccountId);
      assert.equal(club1Dashboard.officers.length, 2);

      // ── 6. Club Announcements & Classified Documents
      const announcement = await clubStore.createAnnouncement(club1AccountId, {
        title: "Annual General Assembly 2026",
        content: "All computer science majors are cordially invited to attend."
      });
      assert.equal(announcement.title, "Annual General Assembly 2026");

      const announcements = await clubStore.listAnnouncements(club1AccountId);
      assert.equal(announcements.length, 1);

      // Archive classified document
      const doc = await clubStore.createDocument(club1AccountId, {
        title: "Constitution and By-Laws",
        category: "CONSTITUTION_BYLAWS",
        description: "Official club charter document",
        fileUrl: `/documents/clubs/${club1.code}/cbl.pdf`,
        fileName: "cbl.pdf"
      });
      assert.equal(doc.category, "CONSTITUTION_BYLAWS");

      // ── 7. Area of Responsibility (AOR) Isolation
      // Club 3 account cannot view Club 1's dashboard or members
      const club3AccountId = res3.account.id;
      const club3Dashboard = await clubStore.getClubDashboard(club3AccountId);
      assert.equal(club3Dashboard.club.id, club3.id);
      assert.equal(club3Dashboard.officers.length, 0, "Club 3 should have 0 officers");
      assert.equal(club3Dashboard.metrics.announcementCount, 0, "Club 3 should have 0 announcements");

      // ── 8. Student Available Clubs & 3-Club Limit Rule
      const availableForMember = await clubStore.listAvailableClubs(studentMember.userId);
      // Available must include active clubs (Club 1, 3, 4), and exclude inactive (Club 2) and expired (Club Expired)
      assert.ok(availableForMember.some((c) => c.id === club1.id));
      assert.ok(availableForMember.some((c) => c.id === club3.id));
      assert.ok(availableForMember.some((c) => c.id === club4.id));
      assert.ok(!availableForMember.some((c) => c.id === club2.id), "Inactive club must not be available");
      assert.ok(!availableForMember.some((c) => c.id === clubExpired.id), "Expired club must not be available");

      // studentMember joins Club 1
      const membership1 = await clubStore.joinClub(studentMember.userId, club1.id);
      assert.equal(membership1.clubId, club1.id);

      // studentMember joins Club 3
      const membership2 = await clubStore.joinClub(studentMember.userId, club3.id);
      assert.equal(membership2.clubId, club3.id);

      // studentMember joins Club 4
      const membership3 = await clubStore.joinClub(studentMember.userId, club4.id);
      assert.equal(membership3.clubId, club4.id);

      // studentMember tries to join Club 4 again (already joined)
      await assert.rejects(
        () => clubStore.joinClub(studentMember.userId, club4.id),
        /ALREADY_CLUB_MEMBER/
      );

      // studentMember tries to join a 4th active club -> must be rejected
      const res5 = await clubStore.createClub(sscUser.id, {
        code: `CLUB5-${suffix}`,
        name: `Fifth Club ${suffix}`,
        category: "ACADEMIC",
        adviser: "Prof. Ada Lovelace",
        username: `club5_${suffix}`,
        password: "ClubPassword123!",
        effectivityStartDate: now.toISOString(),
        effectivityEndDate: nextMonth.toISOString()
      });

      await assert.rejects(
        () => clubStore.joinClub(studentMember.userId, res5.club.id),
        /MAXIMUM_ACTIVE_CLUBS_REACHED/
      );

      // Joining an expired club must be rejected
      await assert.rejects(
        () => clubStore.joinClub(studentExtra.userId, clubExpired.id),
        /CLUB_NOT_AVAILABLE/
      );

      // ── 9. Dynamic Club Portal Dashboard Types
      // Type 1: Officer WITH clearance authority (studentLeader)
      const portalType1 = await clubStore.getStudentClubPortal(studentLeader.userId, club1.id);
      assert.equal(portalType1.dashboardType, "OFFICER_WITH_CLEARANCE");
      assert.ok(portalType1.members, "Type 1 must receive members list for evaluation");
      assert.ok(portalType1.officers.length >= 2);
      assert.ok(portalType1.announcements.length >= 1);
      assert.ok(portalType1.documents.length >= 1);

      // Type 2: Officer WITHOUT clearance authority (studentOfficer)
      const portalType2 = await clubStore.getStudentClubPortal(studentOfficer.userId, club1.id);
      assert.equal(portalType2.dashboardType, "OFFICER_WITHOUT_CLEARANCE");
      assert.equal(portalType2.members, undefined, "Type 2 must not receive clearance evaluation member list");

      // Type 3: Normal Member (studentMember)
      const portalType3 = await clubStore.getStudentClubPortal(studentMember.userId, club1.id);
      assert.equal(portalType3.dashboardType, "NORMAL_MEMBER");
      assert.equal(portalType3.members, undefined, "Type 3 must not receive clearance evaluation member list");
      assert.equal(portalType3.myClearance.status, "PENDING");

      // ── 10. Clearance Evaluation & Immutable Audit Trail
      // President evaluates studentMember's clearance -> CLEARED
      const clearanceResult = await clubStore.evaluateClearance(
        studentLeader.userId,
        club1.id,
        {
          targetStudentId: studentMember.id,
          status: "CLEARED",
          remarks: "Attended general assembly and settled 1st sem dues."
        }
      );
      assert.equal(clearanceResult.status, "CLEARED");
      assert.equal(clearanceResult.clearedByUserId, studentLeader.userId);

      // Verify audit record exists
      const auditLog = await database.clubClearanceAudit.findFirst({
        where: {
          clubId: club1.id,
          studentId: studentMember.id
        }
      });
      assert.ok(auditLog, "ClubClearanceAudit record must exist");
      assert.equal(auditLog.performedByUserId, studentLeader.userId);
      assert.equal(auditLog.action, "CLEARED");
      assert.equal(auditLog.remarks, "Attended general assembly and settled 1st sem dues.");

      // Check studentMember's portal now shows CLEARED
      const updatedPortalMember = await clubStore.getStudentClubPortal(studentMember.userId, club1.id);
      assert.equal(updatedPortalMember.myClearance.status, "CLEARED");

      // Verify that cleared status is reflected in the official Student Clearance Form
      const memberDashboard = await studentStore.forUser(studentMember.userId);
      assert.ok(memberDashboard.clearance, "Clearance form must be available on student dashboard");
      const club1Item = memberDashboard.clearance.items.find((it) => it.code === `CLUB-${club1.code}`);
      assert.ok(club1Item, "Clearance form must list Club 1 requirement");
      assert.equal(club1Item.status, "APPROVED");
      assert.ok(club1Item.remarks.includes("Attended general assembly and settled 1st sem dues."));
      assert.ok(club1Item.remarks.includes(studentLeader.user.displayName));
      assert.equal(memberDashboard.clearance.clubClearances.length, 3, "Member joined 3 clubs");
      const clearedClub = memberDashboard.clearance.clubClearances.find((c) => c.clubId === club1.id);
      assert.equal(clearedClub.status, "CLEARED");
      assert.equal(clearedClub.clearedBy, studentLeader.user.displayName);

      // President clears self -> Allowed!
      const selfClearance = await clubStore.evaluateClearance(
        studentLeader.userId,
        club1.id,
        {
          targetStudentId: studentLeader.id,
          status: "CLEARED",
          remarks: "Executive clearance fulfilled."
        }
      );
      assert.equal(selfClearance.status, "CLEARED");

      // Regular member attempts to evaluate clearance -> Rejected (403)
      await assert.rejects(
        () => clubStore.evaluateClearance(
          studentMember.userId,
          club1.id,
          {
            targetStudentId: studentOfficer.id,
            status: "CLEARED",
            remarks: "Attempt by regular member"
          }
        ),
        /CLEARANCE_AUTHORITY_REQUIRED/
      );

      // Secretary (officer without clearance authority) attempts to evaluate clearance -> Rejected (403)
      await assert.rejects(
        () => clubStore.evaluateClearance(
          studentOfficer.userId,
          club1.id,
          {
            targetStudentId: studentMember.id,
            status: "PENDING",
            remarks: "Attempt by unauthorized officer"
          }
        ),
        /CLEARANCE_AUTHORITY_REQUIRED/
      );

      // Cross-club evaluation attempt: President of Club 1 tries to clear member in Club 3 -> Rejected
      await assert.rejects(
        () => clubStore.evaluateClearance(
          studentLeader.userId,
          club3.id,
          {
            targetStudentId: studentMember.id,
            status: "CLEARED",
            remarks: "Cross club unauthorized"
          }
        ),
        /CLEARANCE_AUTHORITY_REQUIRED/
      );

      // Rollback so DB remains clean
      throw rollback;
    });
  } catch (err) {
    if (err !== rollback) throw err;
  }
});

test("Club HTTP Endpoints: SSC role security boundary, Admin SSC creation, and Student API verification", { timeout: 60_000 }, async () => {
  const prisma = createDatabase();
  const rollback = new Error("ROLLBACK_HTTP_TEST");
  const expectedOrigin = "http://portal.test";
  const config = createConfig({
    nodeEnv: "test",
    appOrigin: expectedOrigin,
    scryptN: 1 << 10
  });

  try {
    await prisma.$transaction(async (transaction) => {
      const database = nestedTransactionClient(transaction);
      const app = await createApp({ database, config });
      const server = createServer(app.handler);
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const port = server.address().port;
      const baseUrl = `http://127.0.0.1:${port}`;

      const client = {
        async getCsrf() {
          const res = await fetch(`${baseUrl}/api/v1/auth/csrf`);
          const data = await res.json();
          const cookie = res.headers.get("set-cookie");
          return { csrfToken: data.data.csrfToken, cookie };
        },
        async post(path, body = {}, headers = {}) {
          const res = await fetch(`${baseUrl}${path}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Origin: expectedOrigin,
              ...headers
            },
            body: JSON.stringify(body)
          });
          const text = await res.text();
          let json = null;
          try { json = JSON.parse(text); } catch {}
          return { status: res.status, headers: res.headers, body: json, text };
        },
        async get(path, headers = {}) {
          const res = await fetch(`${baseUrl}${path}`, {
            method: "GET",
            headers: {
              Origin: expectedOrigin,
              ...headers
            }
          });
          const text = await res.text();
          let json = null;
          try { json = JSON.parse(text); } catch {}
          return { status: res.status, headers: res.headers, body: json, text };
        }
      };

      try {
        const suffix = newId().slice(0, 8);

        // 1. Admin logs in
        const adminRole = await database.role.findFirst({ where: { slug: "administrator" } });
        const adminPassword = "AdminPassword2026!";
        const adminPasswordHash = await hashPassword(adminPassword, config.scrypt);
        const adminUser = await database.user.create({
          data: {
            id: newId(),
            username: `admin_${suffix}`,
            usernameNormalized: normalizeIdentifier(`admin_${suffix}`),
            displayName: `Admin ${suffix}`,
            passwordHash: adminPasswordHash,
            status: "ACTIVE",
            mustChangePassword: false,
            userRoles: { create: { roleId: adminRole.id, isPrimary: true } }
          }
        });

        const csrfAdmin = await client.getCsrf();
        const adminLogin = await client.post("/api/v1/auth/login", {
          identifier: adminUser.username,
          password: adminPassword
        }, {
          "X-CSRF-Token": csrfAdmin.csrfToken,
          Cookie: csrfAdmin.cookie
        });
        assert.equal(adminLogin.status, 200);
        const adminSessionCookie = adminLogin.headers.get("set-cookie");
        const adminHeaders = {
          Cookie: adminSessionCookie,
          "X-CSRF-Token": adminLogin.body.data.csrfToken
        };

        // 2. Admin creates SSC user via API
        const createSscRes = await client.post("/api/v1/admin/users", {
          username: `ssc_created_${suffix}`,
          displayName: `SSC Officer ${suffix}`,
          role: "ssc",
          password: "InitialPassword123!",
          mustChangePassword: false
        }, adminHeaders);
        assert.equal(createSscRes.status, 201, `Admin should create SSC user: ${createSscRes.text}`);
        assert.equal(createSscRes.body.data.user.primaryRole, "ssc");

        // 3. SSC user logs in
        const csrfSsc = await client.getCsrf();
        const sscLogin = await client.post("/api/v1/auth/login", {
          identifier: `ssc_created_${suffix}`,
          password: "InitialPassword123!"
        }, {
          "X-CSRF-Token": csrfSsc.csrfToken,
          Cookie: csrfSsc.cookie
        });
        assert.equal(sscLogin.status, 200);
        const sscSessionCookie = sscLogin.headers.get("set-cookie");
        const sscHeaders = {
          Cookie: sscSessionCookie,
          "X-CSRF-Token": sscLogin.body.data.csrfToken
        };

        // 4. SSC user creates Club via API
        const now = new Date();
        const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const createClubRes = await client.post("/api/v1/ssc/clubs", {
          code: `HTTP-${suffix}`,
          name: `HTTP Test Club ${suffix}`,
          category: "ACADEMIC",
          adviser: "Prof. Ada Lovelace",
          description: "Test club created via HTTP API",
          username: `httpclub_${suffix}`,
          password: "ClubPassword123!",
          effectivityStartDate: now.toISOString(),
          effectivityEndDate: nextMonth.toISOString()
        }, sscHeaders);

        assert.equal(createClubRes.status, 201, `SSC should create club: ${createClubRes.text}`);
        assert.equal(createClubRes.body.data.club.code, `HTTP-${suffix.toUpperCase()}`);

        // 5. SSC lists clubs via API
        const listClubsRes = await client.get("/api/v1/ssc/clubs?filter=ALL", sscHeaders);
        assert.equal(listClubsRes.status, 200);
        assert.ok(listClubsRes.body.data.clubs.some((c) => c.code === `HTTP-${suffix.toUpperCase()}`));

        // 6. Security Boundary Check: SSC attempts to access Registrar endpoints
        const forbiddenRes = await client.get("/api/v1/registrar/applications", sscHeaders);
        assert.equal(forbiddenRes.status, 403, "SSC must be forbidden from registrar applications");

        // Security Boundary Check: SSC attempts to access Student endpoints
        const forbiddenStudentRes = await client.get("/api/v1/student/clubs/available", sscHeaders);
        assert.equal(forbiddenStudentRes.status, 403, "SSC must be forbidden from student endpoints");

        // 7. Club user logs in
        const csrfClub = await client.getCsrf();
        const clubLogin = await client.post("/api/v1/auth/login", {
          identifier: `httpclub_${suffix}`,
          password: "ClubPassword123!"
        }, {
          "X-CSRF-Token": csrfClub.csrfToken,
          Cookie: csrfClub.cookie
        });
        assert.equal(clubLogin.status, 200);
        const clubSessionCookie = clubLogin.headers.get("set-cookie");
        const clubHeaders = {
          Cookie: clubSessionCookie,
          "X-CSRF-Token": clubLogin.body.data.csrfToken
        };

        // Club accesses dashboard
        const clubDashboardRes = await client.get("/api/v1/club/dashboard", clubHeaders);
        assert.equal(clubDashboardRes.status, 200);
        assert.equal(clubDashboardRes.body.data.club.code, `HTTP-${suffix}`.toUpperCase());
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }

      throw rollback;
    });
  } catch (err) {
    if (err !== rollback) throw err;
  }
});
