import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import { createDatabase } from "../server/db.mjs";
import { createConfig } from "../server/config.mjs";
import { createApp } from "../server/app.mjs";
import { AuthenticationStore } from "../server/auth-store.mjs";
import { AdmissionStore } from "../server/admission-store.mjs";
import { hashPassword, newId, normalizeIdentifier } from "../server/security.mjs";
import {
  createMockGoogleIdToken,
  verifyGoogleCredential,
  createRegistrationToken,
  verifyRegistrationToken
} from "../server/google-auth-service.mjs";

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

test("Google Workspace Authentication: Domain guardrails, token integrity, universal account linking, and student onboarding", { timeout: 60_000 }, async () => {
  const prisma = createDatabase();
  const rollback = new Error("ROLLBACK_GOOGLE_AUTH_TEST");

  try {
    await prisma.$transaction(async (transaction) => {
      const database = nestedTransactionClient(transaction);
      const config = createConfig({
        nodeEnv: "test",
        auditPepper: "test-google-audit-pepper-at-least-32-chars-long",
        scryptN: 1 << 10,
        googleAllowedDomains: "g.cjc.edu.ph,cjc.edu.ph"
      });

      const admissionStore = new AdmissionStore(database);
      const authStore = new AuthenticationStore(database, config);
      const suffix = newId().slice(0, 8);

      // ── 1. Domain Validation & Token Integrity Guardrails
      // Unauthorized domain (@gmail.com) -> must throw DOMAIN_UNAUTHORIZED
      const personalGmailToken = createMockGoogleIdToken(
        { email: `personal_${suffix}@gmail.com`, sub: `sub-gmail-${suffix}` },
        config
      );
      await assert.rejects(
        () => verifyGoogleCredential(personalGmailToken, config),
        (err) => {
          assert.equal(err.code, "DOMAIN_UNAUTHORIZED");
          assert.equal(err.status, 403);
          return true;
        }
      );

      // Other university domain (@up.edu.ph) -> must throw DOMAIN_UNAUTHORIZED
      const otherUnivToken = createMockGoogleIdToken(
        { email: `student_${suffix}@up.edu.ph`, sub: `sub-up-${suffix}` },
        config
      );
      await assert.rejects(
        () => verifyGoogleCredential(otherUnivToken, config),
        (err) => {
          assert.equal(err.code, "DOMAIN_UNAUTHORIZED");
          return true;
        }
      );

      // Valid CJC Workspace domains (@g.cjc.edu.ph and @cjc.edu.ph) -> Accepted
      const validStudentToken = createMockGoogleIdToken(
        {
          email: `student_${suffix}@g.cjc.edu.ph`,
          sub: `sub-cjc-student-${suffix}`,
          given_name: "Juan",
          family_name: "Dela Cruz"
        },
        config
      );
      const verifiedStudent = await verifyGoogleCredential(validStudentToken, config);
      assert.equal(verifiedStudent.email, `student_${suffix}@g.cjc.edu.ph`);
      assert.equal(verifiedStudent.googleSub, `sub-cjc-student-${suffix}`);
      assert.equal(verifiedStudent.givenName, "Juan");
      assert.equal(verifiedStudent.familyName, "Dela Cruz");

      const validFacultyToken = createMockGoogleIdToken(
        {
          email: `professor_${suffix}@cjc.edu.ph`,
          sub: `sub-cjc-faculty-${suffix}`,
          name: "Dr. Alan Turing"
        },
        config
      );
      const verifiedFaculty = await verifyGoogleCredential(validFacultyToken, config);
      assert.equal(verifiedFaculty.email, `professor_${suffix}@cjc.edu.ph`);

      // Token Security: Invalid issuer must be rejected
      const badIssuerToken = createMockGoogleIdToken(
        { iss: "https://unauthorized-idp.example.com", email: `user_${suffix}@g.cjc.edu.ph` },
        config
      );
      await assert.rejects(
        () => verifyGoogleCredential(badIssuerToken, config),
        (err) => err.code === "INVALID_ISSUER"
      );

      // Token Security: Mismatched audience must be rejected
      const configWithAud = { ...config, googleClientId: "expected-client-id-xyz" };
      const badAudToken = createMockGoogleIdToken(
        { aud: "wrong-client-id", email: `user_${suffix}@g.cjc.edu.ph` },
        configWithAud
      );
      await assert.rejects(
        () => verifyGoogleCredential(badAudToken, configWithAud),
        (err) => err.code === "INVALID_AUDIENCE"
      );

      // Token Security: Expired token must be rejected
      const expiredToken = createMockGoogleIdToken(
        { exp: Math.floor(Date.now() / 1000) - 100, email: `user_${suffix}@g.cjc.edu.ph` },
        config
      );
      await assert.rejects(
        () => verifyGoogleCredential(expiredToken, config),
        (err) => err.code === "TOKEN_EXPIRED"
      );

      // Token Security: Unverified email must be rejected
      const unverifiedToken = createMockGoogleIdToken(
        { email_verified: false, email: `user_${suffix}@g.cjc.edu.ph` },
        config
      );
      await assert.rejects(
        () => verifyGoogleCredential(unverifiedToken, config),
        (err) => err.code === "EMAIL_NOT_VERIFIED"
      );

      // Token Security: Unauthorized hosted domain (hd) must be rejected
      const badHdToken = createMockGoogleIdToken(
        { hd: "evil.domain.com", email: `user_${suffix}@g.cjc.edu.ph` },
        config
      );
      await assert.rejects(
        () => verifyGoogleCredential(badHdToken, config),
        (err) => err.code === "DOMAIN_UNAUTHORIZED"
      );

      // ── 2. Registration Token Signing & Tamper Resistance
      const testProfile = {
        googleSub: `sub-tamper-${suffix}`,
        email: `candidate_${suffix}@g.cjc.edu.ph`,
        givenName: "Alice",
        familyName: "Smith",
        name: "Alice Smith"
      };
      const signedRegToken = createRegistrationToken(testProfile, config);
      const verifiedReg = verifyRegistrationToken(signedRegToken, config);
      assert.equal(verifiedReg.email, `candidate_${suffix}@g.cjc.edu.ph`);

      // Tampered token must be rejected
      const [dataPart, sigPart] = signedRegToken.split(".");
      const tamperedToken = `${dataPart}Tampered.${sigPart}`;
      assert.throws(
        () => verifyRegistrationToken(tamperedToken, config),
        (err) => err.code === "REGISTRATION_TOKEN_TAMPERED" || /verification failed/i.test(err.message)
      );

      // ── 3. Universal Account Linking Across Existing Roles
      // Helper to create an SMS account
      const createRoleUser = async (roleSlug, email, displayName) => {
        const role = await database.role.findFirst({ where: { slug: roleSlug } });
        assert.ok(role, `Role ${roleSlug} must exist`);
        const passwordHash = await hashPassword("SecurePassword123!", config.scrypt);
        return database.user.create({
          data: {
            id: newId(),
            username: email,
            usernameNormalized: normalizeIdentifier(email),
            displayName,
            email,
            emailNormalized: normalizeIdentifier(email),
            passwordHash,
            status: "ACTIVE",
            mustChangePassword: false,
            userRoles: { create: { roleId: role.id, isPrimary: true } }
          }
        });
      };

      // Test Linking for: Registrar
      const registrarEmail = `registrar_${suffix}@cjc.edu.ph`;
      const registrarUser = await createRoleUser("registrar", registrarEmail, `Registrar User ${suffix}`);
      const registrarGoogleSub = `googlesub-reg-${suffix}`;
      
      const foundRegistrar = await authStore.findUserForGoogleAuth(registrarGoogleSub, registrarEmail);
      assert.ok(foundRegistrar, "Registrar must be found by email");
      assert.equal(foundRegistrar.id, registrarUser.id);
      assert.equal(foundRegistrar.roles[0].slug, "registrar", "Existing role must be preserved");

      await authStore.linkGoogleAuth(foundRegistrar.id, {
        googleSub: registrarGoogleSub,
        email: registrarEmail,
        picture: "https://example.com/reg-avatar.jpg"
      });

      // Subsequent search by googleSub must find the linked user
      const foundBySub = await authStore.findUserForGoogleAuth(registrarGoogleSub, "different.email@cjc.edu.ph");
      assert.ok(foundBySub, "Must find user by linked googleSub");
      assert.equal(foundBySub.id, registrarUser.id);

      // Test Linking for: Program Head
      const phEmail = `proghead_${suffix}@cjc.edu.ph`;
      const phUser = await createRoleUser("program_head", phEmail, `Program Head ${suffix}`);
      const phGoogleSub = `googlesub-ph-${suffix}`;
      const foundPh = await authStore.findUserForGoogleAuth(phGoogleSub, phEmail);
      assert.ok(foundPh);
      assert.equal(foundPh.id, phUser.id);
      assert.equal(foundPh.roles[0].slug, "program_head");

      // Test Linking for: SSC
      const sscEmail = `ssc_${suffix}@g.cjc.edu.ph`;
      const sscUser = await createRoleUser("ssc", sscEmail, `SSC Officer ${suffix}`);
      const sscGoogleSub = `googlesub-ssc-${suffix}`;
      const foundSsc = await authStore.findUserForGoogleAuth(sscGoogleSub, sscEmail);
      assert.ok(foundSsc);
      assert.equal(foundSsc.id, sscUser.id);
      assert.equal(foundSsc.roles[0].slug, "ssc");

      // Test Linking for: Administrator
      const adminEmail = `admin_${suffix}@cjc.edu.ph`;
      const adminUser = await createRoleUser("administrator", adminEmail, `Admin User ${suffix}`);
      const adminGoogleSub = `googlesub-admin-${suffix}`;
      const foundAdmin = await authStore.findUserForGoogleAuth(adminGoogleSub, adminEmail);
      assert.ok(foundAdmin);
      assert.equal(foundAdmin.id, adminUser.id);
      assert.equal(foundAdmin.roles[0].slug, "administrator");

      // ── 4. Student Self-Registration via Google Onboarding Flow
      const newStudentGoogleSub = `googlesub-newstudent-${suffix}`;
      const newStudentEmail = `newstudent_${suffix}@g.cjc.edu.ph`;

      // 1. Initial search should find no account
      const notFound = await authStore.findUserForGoogleAuth(newStudentGoogleSub, newStudentEmail);
      assert.equal(notFound, null, "Unregistered user must not be found");

      // 2. Register new student using verified Google profile
      const newStudentProfile = {
        googleSub: newStudentGoogleSub,
        email: newStudentEmail,
        givenName: "Grace",
        familyName: "Hopper",
        name: "Grace Hopper",
        picture: "https://example.com/grace.jpg"
      };

      const regResult = await admissionStore.registerStudent({
        firstName: newStudentProfile.givenName,
        middleName: "Brewster",
        lastName: newStudentProfile.familyName,
        birthDate: "2005-12-09",
        institutionalEmail: newStudentProfile.email,
        personalEmail: `grace.personal_${suffix}@example.test`,
        mobileNumber: "09181234567",
        admissionYear: 2026,
        googleProfile: newStudentProfile
      }, config);

      assert.ok(regResult.studentNumber, "Student number must be issued");
      assert.equal(regResult.schoolEmail, newStudentEmail);
      assert.ok(regResult.userId, "userId must be returned");

      // 3. User is now linked and has role: student
      const registeredUser = await authStore.findUserForGoogleAuth(newStudentGoogleSub, newStudentEmail);
      assert.ok(registeredUser, "Newly registered student must be found by Google auth");
      assert.equal(registeredUser.roles.length, 1);
      assert.equal(registeredUser.roles[0].slug, "student");
      assert.equal(registeredUser.roles[0].landing_path, "/portal/student");

      // Verify GoogleAuth record in DB
      const googleAuthRecord = await database.userGoogleAuth.findUnique({
        where: { userId: registeredUser.id }
      });
      assert.ok(googleAuthRecord);
      assert.equal(googleAuthRecord.googleSub, newStudentGoogleSub);
      assert.equal(googleAuthRecord.email, newStudentEmail);

      // Verify Student record
      const studentRec = await database.student.findUnique({
        where: { userId: registeredUser.id }
      });
      assert.ok(studentRec);
      assert.equal(studentRec.firstName, "Grace");
      assert.equal(studentRec.lastName, "Hopper");
      assert.equal(studentRec.institutionalEmail, newStudentEmail);

      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
});

test("Google Workspace HTTP Endpoints: /config, /verify, account linking session, and student registration", { timeout: 60_000 }, async () => {
  const prisma = createDatabase();
  const rollback = new Error("ROLLBACK_GOOGLE_HTTP_TEST");

  try {
    await prisma.$transaction(async (transaction) => {
      const database = nestedTransactionClient(transaction);
      
      const dummyServer = createServer();
      await new Promise((resolve) => dummyServer.listen(0, "127.0.0.1", resolve));
      const port = dummyServer.address().port;
      await new Promise((resolve) => dummyServer.close(resolve));

      const origin = `http://127.0.0.1:${port}`;
      const config = createConfig({
        nodeEnv: "test",
        appOrigin: origin,
        auditPepper: "test-google-http-pepper-at-least-32-chars-long",
        scryptN: 1 << 10,
        googleAllowedDomains: "g.cjc.edu.ph,cjc.edu.ph"
      });

      const app = await createApp({ database, config });
      const server = createServer(app.handler);
      await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));

      try {
        let cookie = "";
        let csrfToken = "";

        const clientHeaders = () => ({
          "Content-Type": "application/json",
          Accept: "application/json",
          Origin: origin,
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
          ...(cookie ? { Cookie: cookie } : {})
        });

        // 1. Fetch initial session, CSRF token, and verify Content-Security-Policy for Google Identity Services
        const sessionRes = await fetch(`${origin}/api/v1/auth/session`, {
          headers: { Accept: "application/json" }
        });
        const csp = sessionRes.headers.get("content-security-policy");
        assert.ok(csp, "Response must include Content-Security-Policy header");
        assert.ok(csp.includes("script-src 'self' https://accounts.google.com/gsi/client"), "CSP must allow GIS client script");
        assert.ok(csp.includes("connect-src 'self' https://accounts.google.com/gsi/"), "CSP must allow GIS connect endpoint");
        assert.ok(csp.includes("frame-src 'self' https://accounts.google.com/gsi/"), "CSP must allow GIS frames");
        assert.ok(csp.includes("style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style"), "CSP must allow GIS styles");

        const sessionData = await sessionRes.json();
        csrfToken = sessionData.data.csrfToken;
        const setCookie = sessionRes.headers.get("set-cookie");
        if (setCookie) {
          cookie = setCookie.split(";")[0];
        }

        // 2. GET /api/v1/auth/google/config
        const configRes = await fetch(`${origin}/api/v1/auth/google/config`, {
          headers: clientHeaders()
        });
        assert.equal(configRes.status, 200);
        const configData = await configRes.json();
        assert.equal(configData.data.enabled, true);
        assert.ok(configData.data.allowedDomains.includes("g.cjc.edu.ph"));

        // 3. POST /api/v1/auth/google/verify with unauthorized domain (@gmail.com) -> 403 DOMAIN_UNAUTHORIZED
        const suffix = newId().slice(0, 8);
        const badToken = createMockGoogleIdToken(
          { email: `attacker_${suffix}@gmail.com`, sub: `bad-sub-${suffix}` },
          config
        );
        const badRes = await fetch(`${origin}/api/v1/auth/google/verify`, {
          method: "POST",
          headers: clientHeaders(),
          body: JSON.stringify({ credential: badToken })
        });
        assert.equal(badRes.status, 403);
        const badData = await badRes.json();
        assert.equal(badData.error.code, "DOMAIN_UNAUTHORIZED");

        // 4. POST /api/v1/auth/google/verify for unknown user -> 200 ACCOUNT_NOT_FOUND + registrationToken
        const newEmail = `freshstudent_${suffix}@g.cjc.edu.ph`;
        const newGoogleSub = `sub-new-http-${suffix}`;
        const unknownUserToken = createMockGoogleIdToken(
          {
            email: newEmail,
            sub: newGoogleSub,
            given_name: "Rosalind",
            family_name: "Franklin"
          },
          config
        );
        const verifyNotFoundRes = await fetch(`${origin}/api/v1/auth/google/verify`, {
          method: "POST",
          headers: clientHeaders(),
          body: JSON.stringify({ credential: unknownUserToken })
        });
        assert.equal(verifyNotFoundRes.status, 200);
        const notFoundData = await verifyNotFoundRes.json();
        assert.equal(notFoundData.data.status, "ACCOUNT_NOT_FOUND");
        assert.ok(notFoundData.data.registrationToken, "Must return signed registrationToken");
        assert.equal(notFoundData.data.profile.email, newEmail);
        assert.equal(notFoundData.data.profile.givenName, "Rosalind");
        assert.equal(notFoundData.data.profile.familyName, "Franklin");

        const registrationToken = notFoundData.data.registrationToken;

        // 5. POST /api/v1/auth/google/register-student without birthday -> 422 BIRTH_DATE_INVALID
        const invalidRegRes = await fetch(`${origin}/api/v1/auth/google/register-student`, {
          method: "POST",
          headers: clientHeaders(),
          body: JSON.stringify({
            registrationToken,
            mobileNumber: "09191234567"
          })
        });
        assert.equal(invalidRegRes.status, 422);
        const invalidRegData = await invalidRegRes.json();
        assert.equal(invalidRegData.error.code, "BIRTH_DATE_INVALID");

        // 6. POST /api/v1/auth/google/register-student with valid inputs -> 201 Created & Logged in
        const validRegRes = await fetch(`${origin}/api/v1/auth/google/register-student`, {
          method: "POST",
          headers: clientHeaders(),
          body: JSON.stringify({
            registrationToken,
            birthDate: "2004-07-25",
            mobileNumber: "09191234567"
          })
        });
        assert.equal(validRegRes.status, 201);
        const validRegData = await validRegRes.json();
        assert.equal(validRegData.data.status, "LOGGED_IN");
        assert.ok(validRegData.data.studentNumber);
        assert.equal(validRegData.data.user.email, newEmail);
        assert.equal(validRegData.data.landingPath, "/portal/student");

        // Update cookie & csrfToken after login
        const newAuthCookie = validRegRes.headers.get("set-cookie")?.split(";")[0] || "";
        assert.ok(newAuthCookie.includes("cjc.sid"));
        cookie = newAuthCookie;
        if (validRegData.data.csrfToken) {
          csrfToken = validRegData.data.csrfToken;
        }

        // 7. Re-signing in with that same Google account -> 200 LOGGED_IN directly
        const reLoginRes = await fetch(`${origin}/api/v1/auth/google/verify`, {
          method: "POST",
          headers: clientHeaders(),
          body: JSON.stringify({ credential: unknownUserToken })
        });
        assert.equal(reLoginRes.status, 200);
        const reLoginData = await reLoginRes.json();
        assert.equal(reLoginData.data.status, "LOGGED_IN");
        assert.equal(reLoginData.data.user.email, newEmail);
        assert.equal(reLoginData.data.landingPath, "/portal/student");

        // 8. Test Linking an existing Faculty member via Google login
        const facultyRole = await database.role.findFirst({ where: { slug: "faculty" } });
        const facultyEmail = `prof_${suffix}@cjc.edu.ph`;
        await database.user.create({
          data: {
            id: newId(),
            username: facultyEmail,
            usernameNormalized: normalizeIdentifier(facultyEmail),
            displayName: `Prof. Marie Curie ${suffix}`,
            email: facultyEmail,
            emailNormalized: normalizeIdentifier(facultyEmail),
            passwordHash: await hashPassword("FacultySecret2026!", config.scrypt),
            status: "ACTIVE",
            mustChangePassword: false,
            userRoles: { create: { roleId: facultyRole.id, isPrimary: true } }
          }
        });

        // Fresh session for faculty login
        const facultySessionRes = await fetch(`${origin}/api/v1/auth/session`, {
          headers: { Accept: "application/json" }
        });
        const facultySessionData = await facultySessionRes.json();
        csrfToken = facultySessionData.data.csrfToken;
        cookie = facultySessionRes.headers.get("set-cookie")?.split(";")[0] || "";

        const facultyGoogleToken = createMockGoogleIdToken(
          {
            email: facultyEmail,
            sub: `sub-faculty-${suffix}`,
            name: "Marie Curie"
          },
          config
        );

        const facultyLoginRes = await fetch(`${origin}/api/v1/auth/google/verify`, {
          method: "POST",
          headers: clientHeaders(),
          body: JSON.stringify({ credential: facultyGoogleToken })
        });
        assert.equal(facultyLoginRes.status, 200);
        const facultyLoginData = await facultyLoginRes.json();
        assert.equal(facultyLoginData.data.status, "LOGGED_IN");
        assert.equal(facultyLoginData.data.user.primaryRole, "faculty");
        assert.equal(facultyLoginData.data.user.roles[0], "faculty");
        assert.equal(facultyLoginData.data.landingPath, "/portal/faculty");
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }

      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
});
