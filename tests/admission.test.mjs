import assert from "node:assert/strict";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { AdmissionStore } from "../server/admission-store.mjs";
import { createApp } from "../server/app.mjs";
import { createConfig } from "../server/config.mjs";
import { createDatabase } from "../server/db.mjs";
import { newId } from "../server/security.mjs";

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

test("student self-registration commits every required record and returns 201", { timeout: 60_000 }, async () => {
  const prisma = createDatabase();
  const rollback = new Error("ROLLBACK_ADMISSION_INTEGRATION_TEST");
  try {
    await prisma.$transaction(async (transaction) => {
      const initialRegistrationAuditCount = await transaction.auditLog.count({
        where: { eventType: "admission.student_registered", outcome: "success" }
      });
      const config = createConfig({
        nodeEnv: "test",
        appOrigin: expectedOrigin,
        publicRoot: projectRoot,
        auditPepper: "test-audit-pepper-that-is-long-and-private",
        scryptN: 1 << 10,
        cleanupIntervalMs: 60_000
      });
      const database = nestedTransactionClient(transaction);
      const app = await createApp({
        config,
        database: transaction,
        admissionStore: new AdmissionStore(database)
      });
      const server = createServer(app.handler);
      await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
      const address = server.address();
      const baseUrl = `http://127.0.0.1:${address.port}`;

      try {
        const sessionResponse = await fetch(`${baseUrl}/api/v1/auth/session`);
        const session = await sessionResponse.json();
        const cookie = sessionResponse.headers.get("set-cookie")?.split(";", 1)[0] || "";
        const suffix = newId().slice(0, 8);
        const response = await fetch(`${baseUrl}/api/v1/admission/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Origin": expectedOrigin,
            "Cookie": cookie,
            "X-CSRF-Token": session.data.csrfToken
          },
          body: JSON.stringify({
            firstName: "Admission",
            middleName: "Integration",
            lastName: `Test${suffix}`,
            birthDate: "2007-01-15",
            personalEmail: `admission.${suffix}@example.test`,
            mobileNumber: "09171234567",
            password: "Correct horse battery 2026",
            confirmPassword: "Correct horse battery 2026"
          })
        });
        const payload = await response.json();

        assert.equal(response.status, 201, JSON.stringify(payload));
        assert.match(payload.data.studentNumber, /^001-\d{4}-\d{5}$/);
        assert.match(payload.data.schoolEmail, /@g\.cjc\.edu\.ph$/);
        assert.match(payload.data.applicationNumber, /^APP-\d{4}-\d{5}$/);

        const user = await transaction.user.findUniqueOrThrow({
          where: { emailNormalized: payload.data.schoolEmail.toLowerCase() },
          include: { studentProfile: { include: { obligations: true } } }
        });
        assert.equal(user.mustChangePassword, false);
        assert.equal(user.studentProfile.status, "APPLICANT");
        assert.equal(user.studentProfile.programId, null);
        assert.equal(user.studentProfile.obligations.length, 1);
        assert.equal(user.studentProfile.obligations[0].status, "UNPAID");
        assert.equal(await transaction.auditLog.count({
          where: { eventType: "admission.student_registered", outcome: "success" }
        }), initialRegistrationAuditCount + 1);
      } finally {
        await new Promise((resolveClose) => server.close(resolveClose));
        await app.close();
      }
      throw rollback;
    }, { timeout: 45_000, maxWait: 10_000 });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    await prisma.$disconnect();
  }
});
