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

test("Prisma authentication supports login, session validation, logout, and admin authorization", { timeout: 60_000 }, async () => {
  const prisma = createDatabase();
  const rollback = new Error("ROLLBACK_AUTH_INTEGRATION_TEST");
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
      const student = await createTestUser(transaction, config, "student", `test.student.${suffix}`, password);
      const administrator = await createTestUser(transaction, config, "administrator", `test.admin.${suffix}`, password);
      await transaction.student.create({
        data: {
          userId: student.id,
          studentNumber: `TEST-${suffix}`,
          studentNumberNormalized: `test-${suffix}`,
          firstName: "Student",
          lastName: "Integration Test",
          admissionYear: 2026,
          currentYearLevel: 1,
          status: "ACTIVE"
        }
      });
      const app = await createApp({ config, database: transaction });
      const server = createServer(app.handler);
      await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
      const address = server.address();
      const baseUrl = `http://127.0.0.1:${address.port}`;

      try {
        const studentClient = new Client(baseUrl);
        const login = await studentClient.login(student.email, student.password);
        assert.equal(login.response.status, 200, "student login");
        assert.match(studentClient.lastSetCookie, /HttpOnly/i);
        assert.match(studentClient.lastSetCookie, /SameSite=Lax/i);

        const session = await studentClient.request("/api/v1/auth/session");
        assert.equal(session.response.status, 200, "session validation");
        assert.equal(session.payload.data.authenticated, true);
        assert.equal(session.payload.data.user.id, student.id);

        const dashboard = await studentClient.request("/api/v1/student/dashboard");
        assert.equal(dashboard.response.status, 200, "student dashboard authorization");
        assert.equal(dashboard.payload.data.dashboard.linked, true);
        assert.equal(dashboard.payload.data.dashboard.student.studentNumber, `TEST-${suffix}`);
        assert.deepEqual(dashboard.payload.data.dashboard.schedule, []);

        const denied = await studentClient.request("/api/v1/admin/users");
        assert.equal(denied.response.status, 403, "student admin denial");
        assert.equal(denied.payload.error.code, "FORBIDDEN");
        const studentHealthDenied = await studentClient.request("/api/v1/admin/monitoring/health");
        assert.equal(studentHealthDenied.response.status, 403, "student monitoring denial");

        const logout = await studentClient.request("/api/v1/auth/logout", { method: "POST", json: {} });
        assert.equal(logout.response.status, 200, "logout");
        const staleSession = await studentClient.request("/api/v1/auth/me");
        assert.equal(staleSession.response.status, 401, "revoked session rejection");

        const adminClient = new Client(baseUrl);
        const adminLogin = await adminClient.login(administrator.username, administrator.password);
        assert.equal(adminLogin.response.status, 200, "administrator login");
        const authorized = await adminClient.request("/api/v1/admin/users");
        assert.equal(authorized.response.status, 200, "administrator authorization");
        assert.ok(Array.isArray(authorized.payload.data.users));
        const health = await adminClient.request("/api/v1/admin/monitoring/health");
        assert.equal(health.response.status, 200, "administrator monitoring authorization");
        assert.equal(health.payload.data.status, "healthy");
        assert.equal(health.payload.data.database.status, "available");
        assert.ok(Number.isInteger(health.payload.data.performance.requestsTotal));
        const selfDelete = await adminClient.request(`/api/v1/admin/users/${administrator.id}`, { method: "DELETE", json: {} });
        assert.equal(selfDelete.response.status, 409, "administrator self-deletion protection");
        assert.equal(selfDelete.payload.error.code, "SELF_DELETION_FORBIDDEN");
        const deletedStudent = await adminClient.request(`/api/v1/admin/users/${student.id}`, { method: "DELETE", json: {} });
        assert.equal(deletedStudent.response.status, 200, `administrator account deletion: ${JSON.stringify(deletedStudent.payload)}`);
        assert.equal(deletedStudent.payload.data.success, true);
        const usersAfterDelete = await adminClient.request("/api/v1/admin/users");
        assert.equal(usersAfterDelete.response.status, 200);
        assert.equal(usersAfterDelete.payload.data.users.some((user) => user.id === student.id), false);
        const adminStudentDashboard = await adminClient.request("/api/v1/student/dashboard");
        assert.equal(adminStudentDashboard.response.status, 403, "administrator student-dashboard denial");
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
