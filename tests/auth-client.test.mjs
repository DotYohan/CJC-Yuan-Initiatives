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
    console,
    fetch: async (input) => {
      const path = new URL(String(input), "http://portal.test").pathname;
      const payload = responseByPath.get(path);
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
