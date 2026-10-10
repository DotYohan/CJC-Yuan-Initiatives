import assert from "node:assert/strict";
import { test } from "node:test";
import { RequestMonitor } from "../server/monitoring.mjs";

test("request monitor tracks latency, errors, slow requests, and runtime health", () => {
  let wallClock = Date.parse("2026-09-27T04:00:00.000Z");
  let monotonic = 100;
  const monitor = new RequestMonitor({
    now: () => wallClock,
    monotonicNow: () => monotonic,
    slowRequestThresholdMs: 50
  });

  const first = monitor.begin();
  monotonic += 25;
  assert.deepEqual(monitor.finish(first, 200), { durationMs: 25, slow: false });

  const second = monitor.begin();
  monotonic += 75;
  assert.deepEqual(monitor.finish(second, 503), { durationMs: 75, slow: true });
  wallClock += 2_000;

  const snapshot = monitor.snapshot();
  assert.equal(snapshot.requestsTotal, 2);
  assert.equal(snapshot.serverErrorsTotal, 1);
  assert.equal(snapshot.clientErrorsTotal, 0);
  assert.equal(snapshot.slowRequestsTotal, 1);
  assert.equal(snapshot.averageDurationMs, 50);
  assert.equal(snapshot.maxDurationMs, 75);
  assert.equal(snapshot.uptimeSeconds, 2);
  assert.equal(snapshot.slowRequestThresholdMs, 50);
  assert.ok(snapshot.memory.rssMb >= 0);
});

test("admin system logs API returns entries and supports filtering and status update", async () => {
  const { createServer } = await import("node:http");
  const { createDatabase } = await import("../server/db.mjs");
  const { createConfig } = await import("../server/config.mjs");
  const { createApp } = await import("../server/app.mjs");
  const { hashPassword, newId, normalizeIdentifier } = await import("../server/security.mjs");

  const prisma = createDatabase();
  const rollback = new Error("ROLLBACK_TEST_TRANSACTION");
  const expectedOrigin = "http://portal.test";
  const config = createConfig({
    nodeEnv: "test",
    appOrigin: expectedOrigin,
    scryptN: 1 << 10
  });

  try {
    await prisma.$transaction(async (transaction) => {
      const suffix = newId().slice(0, 8);
      const rawPassword = "Correct horse battery 2026";
      const passwordHash = await hashPassword(rawPassword, config.scrypt);

      const adminRole = await transaction.role.findFirst({ where: { slug: "administrator" } });
      assert.ok(adminRole, "Administrator role must exist");

      const adminUser = await transaction.user.create({
        data: {
          id: newId(),
          username: `admin.${suffix}`,
          usernameNormalized: normalizeIdentifier(`admin.${suffix}`),
          email: `admin.${suffix}@example.test`,
          emailNormalized: normalizeIdentifier(`admin.${suffix}@example.test`),
          displayName: `Admin ${suffix}`,
          passwordHash,
          status: "ACTIVE",
          mustChangePassword: false,
          userRoles: { create: { roleId: adminRole.id, isPrimary: true } }
        }
      });

      const testLog = await transaction.systemLog.create({
        data: {
          id: newId(),
          severity: "HIGH",
          category: "APPLICATION",
          message: `Test error log ${suffix}`,
          technicalDetail: "Details for test log",
          status: "OPEN"
        }
      });

      const nestedTransactionClient = (tx) => {
        let client;
        client = new Proxy(tx, {
          get(target, property, receiver) {
            if (property === "$transaction") return async (callback) => callback(client);
            const value = Reflect.get(target, property, receiver);
            return typeof value === "function" ? value.bind(target) : value;
          }
        });
        return client;
      };

      const database = nestedTransactionClient(transaction);
      const app = await createApp({ config, database });
      const server = createServer(app.handler);
      await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
      const address = server.address();
      const baseUrl = `http://127.0.0.1:${address.port}`;

      try {
        const csrfRes = await fetch(`${baseUrl}/api/v1/auth/csrf`);
        const csrfPayload = await csrfRes.json();
        const csrfToken = csrfPayload.data.csrfToken;
        const cookie = csrfRes.headers.get("set-cookie");

        const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
            "Cookie": cookie,
            "Origin": expectedOrigin
          },
          body: JSON.stringify({ identifier: adminUser.username, password: rawPassword })
        });
        assert.equal(loginRes.status, 200, "Admin login succeeds");
        const sessionCookie = loginRes.headers.get("set-cookie");

        // 1. GET /api/v1/admin/system-logs
        const logsRes = await fetch(`${baseUrl}/api/v1/admin/system-logs`, {
          headers: { Cookie: sessionCookie }
        });
        assert.equal(logsRes.status, 200);
        const logsPayload = await logsRes.json();
        assert.ok(Array.isArray(logsPayload.data.entries), "Payload data.entries must be an array");
        const found = logsPayload.data.entries.find((l) => l.id === testLog.id);
        assert.ok(found, "Created test log must be returned");
        assert.equal(found.severity, "HIGH");

        // 2. GET /api/v1/admin/system-logs?severity=HIGH
        const highRes = await fetch(`${baseUrl}/api/v1/admin/system-logs?severity=HIGH`, {
          headers: { Cookie: sessionCookie }
        });
        assert.equal(highRes.status, 200);
        const highPayload = await highRes.json();
        assert.ok(highPayload.data.entries.every((l) => l.severity === "HIGH"), "Filtered entries must be HIGH");

        // 3. PATCH /api/v1/admin/system-logs/:id/status
        const patchRes = await fetch(`${baseUrl}/api/v1/admin/system-logs/${testLog.id}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
            "Cookie": sessionCookie,
            "Origin": expectedOrigin
          },
          body: JSON.stringify({ status: "RESOLVED" })
        });
        assert.equal(patchRes.status, 200);
        const patchPayload = await patchRes.json();
        assert.equal(patchPayload.data.log.status, "RESOLVED");

        // 4. GET /api/v1/admin/monitoring/health
        const healthRes = await fetch(`${baseUrl}/api/v1/admin/monitoring/health`, {
          headers: { Cookie: sessionCookie }
        });
        assert.equal(healthRes.status, 200);
        const healthPayload = await healthRes.json();
        assert.ok(healthPayload.data.database, "Health includes database status");
        assert.ok(healthPayload.data.performance, "Health includes performance metrics");
        assert.ok(healthPayload.data.incidents, "Health includes incident counters");
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
