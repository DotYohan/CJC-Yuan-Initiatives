import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function loadAuthClient(responseByPath) {
  const source = await readFile(resolve(projectRoot, "auth-client.js"), "utf8");
  const context = vm.createContext({
    AbortController,
    FormData,
    Headers,
    Response,
    URL,
    URLSearchParams,
    console,
    fetch: async (input, init = {}) => {
      const url = new URL(String(input), "http://portal.test");
      const key = `${init.method || "GET"} ${url.pathname}${url.search}`;
      const pathKey = `${init.method || "GET"} ${url.pathname}`;
      const payload = responseByPath.get(key) || responseByPath.get(pathKey) || responseByPath.get(url.pathname);
      if (!payload) return new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: "Missing test response." } }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    },
    window: { location: { origin: "http://portal.test" } }
  });
  vm.runInContext(source, context, { filename: "auth-client.js" });
  return context.window.CJCAuth;
}

test("Program Head API client unwraps dashboard, student, and evaluation entities", async () => {
  const programId = "736c0502-8016-4c26-9d64-1049afab4158";
  const client = await loadAuthClient(new Map([
    ["/api/v1/program-head/dashboard", { data: { dashboard: { program: { id: programId, code: "BSECE" }, curricula: [{ id: "curriculum-1", programId }] } } }],
    ["/api/v1/program-head/students/student-1", { data: { student: { id: "student-1", name: "Student One" } } }],
    ["/api/v1/program-head/enrollments/enrollment-1/evaluation", { data: { evaluation: { enrollment: { id: "enrollment-1" }, canApprove: true } } }]
  ]));

  const dashboard = await client.getProgramHeadDashboard();
  assert.equal(dashboard.program.code, "BSECE");
  assert.equal(dashboard.curricula[0].programId, programId);

  const student = await client.getProgramHeadStudent("student-1");
  assert.equal(student.name, "Student One");

  const evaluation = await client.getProgramHeadEnrollmentEvaluation("enrollment-1");
  assert.equal(evaluation.enrollment.id, "enrollment-1");
  assert.equal(evaluation.canApprove, true);
});

test("Admin system logs and monitoring client methods unwrap data and pass query filters", async () => {
  const logId = "a1b2c3d4-0000-0000-0000-000000000001";
  const client = await loadAuthClient(new Map([
    ["GET /api/v1/auth/csrf", { data: { csrfToken: "mock-csrf" } }],
    ["GET /api/v1/admin/system-logs", { data: { entries: [{ id: logId, severity: "LOW", status: "OPEN" }] } }],
    ["GET /api/v1/admin/system-logs?severity=HIGH", { data: { entries: [{ id: logId, severity: "HIGH", status: "OPEN" }] } }],
    [`PATCH /api/v1/admin/system-logs/${logId}/status`, { data: { log: { id: logId, status: "RESOLVED" } } }],
    ["GET /api/v1/admin/monitoring/health", { data: { status: "healthy", database: { status: "available" } } }]
  ]));

  // Unfiltered system logs unwrap data.entries
  const allLogs = await client.getSystemLogs();
  assert.ok(Array.isArray(allLogs.entries));
  assert.equal(allLogs.entries[0].severity, "LOW");

  // Filtered system logs with query
  const filtered = await client.getSystemLogs({ severity: "HIGH" });
  assert.ok(Array.isArray(filtered.entries));
  assert.equal(filtered.entries[0].severity, "HIGH");

  // Status update
  const updated = await client.updateSystemLogStatus(logId, "RESOLVED");
  assert.equal(updated.log.status, "RESOLVED");

  // Monitoring health unwrap
  const health = await client.getMonitoringHealth();
  assert.equal(health.status, "healthy");
  assert.equal(health.database.status, "available");
});

test("Google Workspace client methods call appropriate endpoints and pass payloads", async () => {
  const client = await loadAuthClient(new Map([
    ["GET /api/v1/auth/csrf", { data: { csrfToken: "mock-csrf-google" } }],
    ["GET /api/v1/auth/google/config", { data: { enabled: true, clientId: "test-id", allowedDomains: ["g.cjc.edu.ph", "cjc.edu.ph"] } }],
    ["POST /api/v1/auth/google/verify", { data: { status: "LOGGED_IN", user: { id: "u-1", email: "student@g.cjc.edu.ph" } } }],
    ["POST /api/v1/auth/google/register-student", { data: { status: "LOGGED_IN", studentNumber: "001-2026-00001" } }]
  ]));

  const config = await client.getGoogleAuthConfig();
  assert.equal(config.enabled, true);
  assert.equal(config.clientId, "test-id");
  assert.deepEqual(config.allowedDomains, ["g.cjc.edu.ph", "cjc.edu.ph"]);

  const verifyResult = await client.googleAuthVerify("mock-id-token");
  assert.equal(verifyResult.status, "LOGGED_IN");
  assert.equal(verifyResult.user.email, "student@g.cjc.edu.ph");

  const regResult = await client.googleRegisterStudent({
    registrationToken: "reg-token-abc",
    birthDate: "2005-01-01",
    mobileNumber: "09123456789"
  });
  assert.equal(regResult.status, "LOGGED_IN");
  assert.equal(regResult.studentNumber, "001-2026-00001");
});

