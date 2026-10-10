import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createDatabase } from "../server/db.mjs";
import { createConfig } from "../server/config.mjs";
import { newId, normalizeIdentifier, tokenHash, hashPassword } from "../server/security.mjs";
import { createApp } from "../server/app.mjs";
import { RegistrarStore } from "../server/registrar-store.mjs";
import { ProgramHeadStore } from "../server/program-head-store.mjs";

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

test("Registrar Subject Offering: Institution-wide access, multi-program creation, validation, and REST API", async () => {
  const rollback = new Error("ROLLBACK_TEST_TRANSACTION");
  try {
    await prisma.$transaction(async (transaction) => {
      const database = nestedTransactionClient(transaction);
      const suffix = newId().slice(0, 8);

      // Find or create active academic term
      let activeTerm = await transaction.academicTerm.findFirst({
        where: { status: { notIn: ["CLOSED", "ARCHIVED"] } },
        include: { academicYear: true }
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
          include: { academicYear: true }
        });
      }
      assert.ok(activeTerm, "Active academic term must exist");

      // Find two programs with active/draft curricula and subjects
      const curricula = await transaction.curriculum.findMany({
        where: {
          status: { in: ["ACTIVE", "DRAFT"] },
          subjects: { some: {} },
          program: { isActive: true }
        },
        include: {
          program: { include: { department: true } },
          subjects: true
        }
      });
      assert.ok(curricula.length >= 2, "At least two curricula with subjects must exist");

      const bseceCurriculum = curricula.find((c) => c.program.code === "BSECE") || curricula[0];
      const otherCurriculum = curricula.find((c) => c.programId !== bseceCurriculum.programId);
      assert.ok(otherCurriculum, "Another curriculum from a different program must exist");

      const bseceProgram = bseceCurriculum.program;
      const otherProgram = otherCurriculum.program;

      const bsecePlacement = bseceCurriculum.subjects[0];
      const otherPlacement = otherCurriculum.subjects[0];

      // Create test faculty and room
      const faculty = await transaction.faculty.create({
        data: {
          id: newId(),
          employeeNumber: `FAC-${suffix}`,
          employeeNumberNormalized: normalizeIdentifier(`FAC-${suffix}`),
          firstName: "John",
          lastName: `Professor-${suffix}`,
          departmentId: bseceProgram.departmentId,
          status: "ACTIVE"
        }
      });

      const room = await transaction.room.create({
        data: {
          id: newId(),
          code: `RM-${suffix}`,
          name: `Test Room ${suffix}`,
          building: "Science Hall",
          capacity: 45,
          isActive: true
        }
      });

      // Create Registrar user
      const config = createConfig({
        nodeEnv: "test",
        appOrigin: expectedOrigin,
        auditPepper: "registrar-test-pepper",
        scryptN: 1 << 10
      });
      const rawPassword = "Correct horse battery 2026";
      const passwordHash = await hashPassword(rawPassword, config.scrypt);

      const registrarRole = await transaction.role.findFirst({ where: { slug: "registrar" } });
      assert.ok(registrarRole, "Registrar role must exist");
      const registrarUser = await transaction.user.create({
        data: {
          id: newId(),
          username: `reg.${suffix}`,
          usernameNormalized: normalizeIdentifier(`reg.${suffix}`),
          email: `reg.${suffix}@example.test`,
          emailNormalized: normalizeIdentifier(`reg.${suffix}@example.test`),
          displayName: `Registrar ${suffix}`,
          passwordHash,
          status: "ACTIVE",
          mustChangePassword: false,
          userRoles: { create: { roleId: registrarRole.id, isPrimary: true } }
        }
      });

      // Create Program Head for BSECE
      const phRole = await transaction.role.findFirst({ where: { slug: "program_head" } });
      const phUser = await transaction.user.create({
        data: {
          id: newId(),
          username: `ph.${suffix}`,
          usernameNormalized: normalizeIdentifier(`ph.${suffix}`),
          email: `ph.${suffix}@example.test`,
          emailNormalized: normalizeIdentifier(`ph.${suffix}@example.test`),
          displayName: `PH ${suffix}`,
          passwordHash,
          status: "ACTIVE",
          mustChangePassword: false,
          userRoles: { create: { roleId: phRole.id, isPrimary: true } }
        }
      });
      await transaction.userProgramAssignment.create({
        data: {
          id: newId(),
          userId: phUser.id,
          programId: bseceProgram.id
        }
      });

      const registrarStore = new RegistrarStore(database);
      const programHeadStore = new ProgramHeadStore(database);

      // ----------------------------------------------------
      // TEST 1: Registrar lists all subjects across all programs
      // ----------------------------------------------------
      console.log("[Test 1] Registrar lists all subjects across all programs...");
      const allSubjects = await registrarStore.listSubjects();
      assert.ok(allSubjects.length > 0, "Registrar subject catalog must return subjects");

      const hasBseceSubject = allSubjects.some((s) => s.programId === bseceProgram.id);
      const hasOtherSubject = allSubjects.some((s) => s.programId === otherProgram.id);
      assert.ok(hasBseceSubject, "Subject catalog must include BSECE subjects");
      assert.ok(hasOtherSubject, "Subject catalog must include other program subjects");

      const sampleSubject = allSubjects[0];
      assert.ok(sampleSubject.subjectCode, "Must have subjectCode");
      assert.ok(sampleSubject.subjectTitle, "Must have subjectTitle");
      assert.ok(sampleSubject.creditUnits, "Must have creditUnits");
      assert.ok(sampleSubject.programCode, "Must have programCode");
      assert.ok(sampleSubject.curriculumCode, "Must have curriculumCode");
      assert.ok(sampleSubject.yearLevel, "Must have yearLevel");
      assert.ok(sampleSubject.termNumber, "Must have termNumber");
      console.log(`✓ Verified institution-wide subject catalog: Total ${allSubjects.length} subjects found across programs`);

      // Filter by program
      const bseceOnlySubjects = await registrarStore.listSubjects({ programId: bseceProgram.id });
      assert.ok(bseceOnlySubjects.every((s) => s.programId === bseceProgram.id), "Program filter must correctly isolate BSECE subjects");
      console.log(`✓ Verified program filtering: ${bseceOnlySubjects.length} subjects in ${bseceProgram.code}`);

      // ----------------------------------------------------
      // TEST 2: Registrar creates class offerings for multiple programs
      // ----------------------------------------------------
      console.log(`\n[Test 2] Registrar creates class offerings for ${bseceProgram.code} and ${otherProgram.code}...`);
      const bseceOffering = await registrarStore.createOffering({
        academicTermId: activeTerm.id,
        programId: bseceProgram.id,
        curriculumId: bseceCurriculum.id,
        subjectId: bsecePlacement.subjectId,
        sectionCode: `ECE-SEC-${suffix}`,
        offeringCode: `ECE-OFF-${suffix}`,
        capacity: 40,
        facultyId: faculty.id,
        weekday: "MONDAY",
        startsAt: "08:00",
        endsAt: "10:00",
        roomId: room.id,
        status: "OPEN"
      }, registrarUser.id);

      assert.ok(bseceOffering.id, "BSECE offering created successfully");
      assert.equal(bseceOffering.offeringCode, `ECE-OFF-${suffix}`);
      assert.equal(bseceOffering.classSection.programId, bseceProgram.id);
      console.log(`✓ Registrar created ${bseceProgram.code} offering: ${bseceOffering.offeringCode}`);

      // Now Registrar creates offering for other program (different program!)
      const otherOffering = await registrarStore.createOffering({
        academicTermId: activeTerm.id,
        programId: otherProgram.id,
        curriculumId: otherCurriculum.id,
        subjectId: otherPlacement.subjectId,
        sectionCode: `OTH-SEC-${suffix}`,
        offeringCode: `OTH-OFF-${suffix}`,
        capacity: 45,
        status: "OPEN"
      }, registrarUser.id);

      assert.ok(otherOffering.id, "Other offering created successfully");
      assert.equal(otherOffering.offeringCode, `OTH-OFF-${suffix}`);
      assert.equal(otherOffering.classSection.programId, otherProgram.id);
      console.log(`✓ Registrar created ${otherProgram.code} offering: ${otherOffering.offeringCode}`);

      // ----------------------------------------------------
      // TEST 3: Program Head isolation preserved
      // ----------------------------------------------------
      console.log("\n[Test 3] Verifying Program Head cannot create offering for another program...");
      await assert.rejects(
        () => programHeadStore.createOffering(phUser.id, {
          academicTermId: activeTerm.id,
          curriculumId: otherCurriculum.id,
          subjectId: otherPlacement.subjectId,
          sectionCode: `FAIL-SEC-${suffix}`,
          offeringCode: `FAIL-OFF-${suffix}`,
          capacity: 30
        }),
        /CURRICULUM_NOT_FOUND/,
        "Program Head must be rejected when attempting to create an offering outside their assigned program"
      );
      console.log(`✓ Program Head restriction preserved: rejected when attempting to offer ${otherProgram.code} curriculum`);

      // ----------------------------------------------------
      // TEST 4: Offering Validations
      // ----------------------------------------------------
      console.log("\n[Test 4] Validating conflict prevention and constraints...");

      // Duplicate offering code
      await assert.rejects(
        () => registrarStore.createOffering({
          academicTermId: activeTerm.id,
          curriculumId: bseceCurriculum.id,
          subjectId: bsecePlacement.subjectId,
          sectionCode: `DUP-SEC-${suffix}`,
          offeringCode: `ECE-OFF-${suffix}`,
          capacity: 30
        }, registrarUser.id),
        /OFFERING_DUPLICATE/,
        "Duplicate offeringCode in the same academic term must be rejected"
      );
      console.log("✓ Duplicate offeringCode rejected with OFFERING_DUPLICATE");

      // Instructor schedule conflict
      await assert.rejects(
        () => registrarStore.createOffering({
          academicTermId: activeTerm.id,
          curriculumId: otherCurriculum.id,
          subjectId: otherPlacement.subjectId,
          sectionCode: `CONF-SEC1-${suffix}`,
          offeringCode: `CONF-OFF1-${suffix}`,
          capacity: 30,
          facultyId: faculty.id,
          overrideReason: "Cross-college schedule conflict test",
          weekday: "MONDAY",
          startsAt: "09:00",
          endsAt: "11:00"
        }, registrarUser.id),
        /SCHEDULE_CONFLICT/,
        "Overlapping faculty schedule must be rejected with SCHEDULE_CONFLICT"
      );
      console.log("✓ Instructor schedule conflict rejected with SCHEDULE_CONFLICT");

      // Room schedule conflict
      await assert.rejects(
        () => registrarStore.createOffering({
          academicTermId: activeTerm.id,
          curriculumId: otherCurriculum.id,
          subjectId: otherPlacement.subjectId,
          sectionCode: `CONF-SEC2-${suffix}`,
          offeringCode: `CONF-OFF2-${suffix}`,
          capacity: 30,
          roomId: room.id,
          weekday: "MONDAY",
          startsAt: "08:30",
          endsAt: "09:30"
        }, registrarUser.id),
        /SCHEDULE_CONFLICT/,
        "Overlapping room schedule must be rejected with SCHEDULE_CONFLICT"
      );
      console.log("✓ Room schedule conflict rejected with SCHEDULE_CONFLICT");

      // Capacity validation
      await assert.rejects(
        () => registrarStore.createOffering({
          academicTermId: activeTerm.id,
          curriculumId: bseceCurriculum.id,
          subjectId: bsecePlacement.subjectId,
          sectionCode: `CAP-SEC-${suffix}`,
          offeringCode: `CAP-OFF-${suffix}`,
          capacity: -5
        }, registrarUser.id),
        /OFFERING_INVALID/,
        "Non-positive capacity must be rejected with OFFERING_INVALID"
      );
      console.log("✓ Invalid capacity rejected with OFFERING_INVALID");

      // ----------------------------------------------------
      // TEST 5: Offering Lifecycle (Update, Close, Delete)
      // ----------------------------------------------------
      console.log("\n[Test 5] Testing Offering Lifecycle (Update, Close, Delete)...");

      // Update offering capacity
      const updated = await registrarStore.updateOffering(bseceOffering.id, {
        capacity: 55
      }, registrarUser.id);
      assert.equal(updated.capacity, 55, "Capacity must be updated");
      console.log("✓ Updated offering capacity to 55");

      // Close offering
      const closed = await registrarStore.closeOffering(bseceOffering.id, registrarUser.id);
      assert.equal(closed.status, "CLOSED", "Offering status must be CLOSED");
      console.log("✓ Closed offering status confirmed as CLOSED");

      // Delete offering without enrollments
      const deleted = await registrarStore.deleteOffering(otherOffering.id, registrarUser.id);
      assert.equal(deleted.deleted, true);
      const checkDeleted = await database.courseOffering.findUnique({ where: { id: otherOffering.id } });
      assert.equal(checkDeleted, null, "Deleted offering must no longer exist");
      console.log("✓ Deleted unreferenced offering successfully");

      // ----------------------------------------------------
      // TEST 6: HTTP REST API Endpoints for Registrar Subject Offerings
      // ----------------------------------------------------
      console.log("\n[Test 6] Testing HTTP REST API Endpoints...");
      const app = await createApp({ config, database });
      const server = createServer(app.handler);
      await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
      const address = server.address();
      const baseUrl = `http://127.0.0.1:${address.port}`;

      try {
        const client = new TestApiClient(baseUrl);
        const loginRes = await client.login(registrarUser.username, rawPassword);
        assert.equal(loginRes.response.status, 200, "Registrar user logs in successfully");

        // 1. GET /api/v1/registrar/offering-options
        const optRes = await client.request("/api/v1/registrar/offering-options");
        assert.equal(optRes.response.status, 200, "Options endpoint returns 200");
        assert.ok(optRes.payload.data.academicTerms?.length > 0, "Options include academicTerms");
        assert.ok(optRes.payload.data.programs?.length > 0, "Options include programs");
        console.log("✓ GET /api/v1/registrar/offering-options returned valid options");

        // 2. GET /api/v1/registrar/subjects
        const subjRes = await client.request(`/api/v1/registrar/subjects?programId=${bseceProgram.id}`);
        assert.equal(subjRes.response.status, 200, "Subjects endpoint returns 200");
        assert.ok(subjRes.payload.data.subjects?.length > 0, "Subjects list returned");
        console.log(`✓ GET /api/v1/registrar/subjects returned ${subjRes.payload.data.subjects.length} subjects`);

        // 3. GET /api/v1/registrar/offerings
        const offRes = await client.request(`/api/v1/registrar/offerings?academicTermId=${activeTerm.id}`);
        assert.equal(offRes.response.status, 200, "Offerings endpoint returns 200");
        assert.ok(Array.isArray(offRes.payload.data.offerings), "Offerings array returned");
        console.log(`✓ GET /api/v1/registrar/offerings returned ${offRes.payload.data.offerings.length} offerings`);

        // 4. POST /api/v1/registrar/offerings
        const createRes = await client.request("/api/v1/registrar/offerings", {
          method: "POST",
          json: {
            academicTermId: activeTerm.id,
            programId: bseceProgram.id,
            curriculumId: bseceCurriculum.id,
            subjectId: bsecePlacement.subjectId,
            sectionCode: `API-SEC-${suffix}`,
            offeringCode: `API-OFF-${suffix}`,
            capacity: 35,
            status: "OPEN"
          }
        });
        assert.equal(createRes.response.status, 201, "Offering created via API with 201");
        const createdOfferingId = createRes.payload.data.offering.id;
        assert.ok(createdOfferingId, "Created offering ID present");
        console.log(`✓ POST /api/v1/registrar/offerings created offering: API-OFF-${suffix}`);

        // 5. POST /api/v1/registrar/offerings/:id/close
        const closeRes = await client.request(`/api/v1/registrar/offerings/${createdOfferingId}/close`, {
          method: "POST"
        });
        assert.equal(closeRes.response.status, 200, "Offering closed via API with 200");
        assert.equal(closeRes.payload.data.offering.status, "CLOSED", "Offering status is CLOSED");
        console.log("✓ POST /api/v1/registrar/offerings/:id/close closed offering");

        // 6. PATCH /api/v1/registrar/offerings/:id (Registrar override offeringCode & status)
        const regUpdateRes = await client.request(`/api/v1/registrar/offerings/${createdOfferingId}`, {
          method: "PATCH",
          json: {
            offeringCode: `OVERRIDE-OFF-${suffix}`,
            capacity: 42,
            status: "OPEN"
          }
        });
        assert.equal(regUpdateRes.response.status, 200, "Registrar can override offeringCode and status");
        assert.equal(regUpdateRes.payload.data.offering.offeringCode, `OVERRIDE-OFF-${suffix}`);
        assert.equal(regUpdateRes.payload.data.offering.capacity, 42);
        assert.equal(regUpdateRes.payload.data.offering.status, "OPEN");
        console.log("✓ PATCH /api/v1/registrar/offerings/:id override offeringCode and status verified");

        // 7. POST /api/v1/registrar/offerings/:id/archive & unarchive
        const regArchiveRes = await client.request(`/api/v1/registrar/offerings/${createdOfferingId}/archive`, {
          method: "POST"
        });
        assert.equal(regArchiveRes.response.status, 200, "Offering archived via Registrar API");
        assert.equal(regArchiveRes.payload.data.offering.status, "ARCHIVED");
        console.log("✓ POST /api/v1/registrar/offerings/:id/archive archived offering");

        const regUnarchiveRes = await client.request(`/api/v1/registrar/offerings/${createdOfferingId}/unarchive`, {
          method: "POST"
        });
        assert.equal(regUnarchiveRes.response.status, 200, "Offering unarchived via Registrar API");
        assert.equal(regUnarchiveRes.payload.data.offering.status, "OPEN");
        console.log("✓ POST /api/v1/registrar/offerings/:id/unarchive unarchived offering");

        // 8. Search and Sort via Registrar API
        const regSearchRes = await client.request(`/api/v1/registrar/offerings?search=OVERRIDE-OFF&status=ACTIVE`);
        assert.equal(regSearchRes.response.status, 200);
        assert.ok(regSearchRes.payload.data.offerings.some((o) => o.offeringCode === `OVERRIDE-OFF-${suffix}`));
        console.log("✓ GET /api/v1/registrar/offerings with search and ACTIVE filter verified");

        // ----------------------------------------------------
        // TEST 7: Program Head Offerings, Scope Isolation & Field Whitelisting
        // ----------------------------------------------------
        console.log("\n[Test 7] Testing Program Head Offerings, Scope Isolation, and Editing...");
        // Create an offering belonging to other program to test isolation
        const otherOffering2 = await registrarStore.createOffering({
          academicTermId: activeTerm.id,
          programId: otherProgram.id,
          curriculumId: otherCurriculum.id,
          subjectId: otherPlacement.subjectId,
          sectionCode: `OTH2-SEC-${suffix}`,
          offeringCode: `OTH2-OFF-${suffix}`,
          capacity: 30,
          status: "OPEN"
        }, registrarUser.id);

        const phClient = new TestApiClient(baseUrl);
        const phLoginRes = await phClient.login(phUser.username, rawPassword);
        assert.equal(phLoginRes.response.status, 200, "Program Head logged in successfully");

        // 9. GET /api/v1/program-head/offerings (Program scope isolation)
        const phOfferingsRes = await phClient.request(`/api/v1/program-head/offerings?academicTermId=${activeTerm.id}`);
        assert.equal(phOfferingsRes.response.status, 200);
        const phOfferings = phOfferingsRes.payload.data.offerings;
        assert.ok(phOfferings.length > 0, "PH receives offerings for BSECE");
        assert.ok(phOfferings.every((o) => o.classSection.programId === bseceProgram.id), "PH must only receive offerings for their assigned program");
        assert.ok(!phOfferings.some((o) => o.id === otherOffering2.id), "PH offerings must NOT contain other program offerings");
        console.log("✓ GET /api/v1/program-head/offerings strictly isolates to assigned program");

        // 10. PATCH /api/v1/program-head/offerings/:id (Allowed fields edited, catalog locked)
        const phEditRes = await phClient.request(`/api/v1/program-head/offerings/${bseceOffering.id}`, {
          method: "PATCH",
          json: {
            sectionCode: `PH-EDITED-SEC-${suffix}`,
            capacity: 44,
            offeringCode: `HACKED-CODE-${suffix}`, // Attempt to change offeringCode (should be ignored/locked!)
            status: "OPEN"
          }
        });
        assert.equal(phEditRes.response.status, 200, "PH can edit section & capacity");
        assert.equal(phEditRes.payload.data.offering.capacity, 44, "Capacity updated");
        assert.equal(phEditRes.payload.data.offering.classSection.code, `PH-EDITED-SEC-${suffix}`, "Section code updated");
        assert.equal(phEditRes.payload.data.offering.offeringCode, `ECE-OFF-${suffix}`, "Offering code locked for Program Head");
        console.log("✓ PATCH /api/v1/program-head/offerings/:id successfully edited section/capacity and preserved locked offeringCode");

        // 11. Cross-program authorization failure
        const phUnauthorizedEdit = await phClient.request(`/api/v1/program-head/offerings/${otherOffering2.id}`, {
          method: "PATCH",
          json: { capacity: 99 }
        });
        assert.equal(phUnauthorizedEdit.response.status, 403, "PH cannot edit offerings outside their program (403)");
        console.log("✓ Program Head cross-program edit correctly rejected with 403 UNAUTHORIZED_OFFERING_ACCESS");

        // 12. Program Head Archive & Restore Lifecycle
        const phArchiveRes = await phClient.request(`/api/v1/program-head/offerings/${bseceOffering.id}/archive`, {
          method: "POST"
        });
        assert.equal(phArchiveRes.response.status, 200);
        assert.equal(phArchiveRes.payload.data.offering.status, "ARCHIVED");
        console.log("✓ POST /api/v1/program-head/offerings/:id/archive archived successfully");

        // Verify active filter excludes archived
        const phActiveList = await phClient.request(`/api/v1/program-head/offerings?academicTermId=${activeTerm.id}&status=ACTIVE`);
        assert.ok(!phActiveList.payload.data.offerings.some((o) => o.id === bseceOffering.id), "Archived offering excluded from ACTIVE list");
        console.log("✓ Archived offering hidden from ACTIVE filter to keep view clean");

        // Verify archived list includes it
        const phArchivedList = await phClient.request(`/api/v1/program-head/offerings?academicTermId=${activeTerm.id}&status=ARCHIVED`);
        assert.ok(phArchivedList.payload.data.offerings.some((o) => o.id === bseceOffering.id), "Archived offering present in ARCHIVED list");
        console.log("✓ Archived offering returned when filter is ARCHIVED");

        // Unarchive
        const phUnarchiveRes = await phClient.request(`/api/v1/program-head/offerings/${bseceOffering.id}/unarchive`, {
          method: "POST"
        });
        assert.equal(phUnarchiveRes.response.status, 200);
        assert.equal(phUnarchiveRes.payload.data.offering.status, "OPEN");
        console.log("✓ POST /api/v1/program-head/offerings/:id/unarchive unarchived successfully (status OPEN)");
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
