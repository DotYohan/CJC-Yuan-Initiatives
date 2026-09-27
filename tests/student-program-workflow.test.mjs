import assert from "node:assert/strict";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
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

class TestClient {
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

test("unassigned new student can view all active programs and select program during enrollment", { timeout: 60_000 }, async () => {
  const prisma = createDatabase();
  const rollback = new Error("ROLLBACK_WORKFLOW_INTEGRATION_TEST");

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
      const database = nestedTransactionClient(transaction);
      const app = await createApp({
        config,
        database
      });
      const server = createServer(app.handler);
      await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
      const baseUrl = `http://127.0.0.1:${server.address().port}`;

      try {
        const client = new TestClient(baseUrl);
        await client.session();

        // 1. Register a new student
        const suffix = newId().slice(0, 8);
        const regResponse = await client.request("/api/v1/admission/register", {
          method: "POST",
          json: {
            firstName: "Workflow",
            middleName: "Student",
            lastName: `Test${suffix}`,
            birthDate: "2007-03-20",
            personalEmail: `workflow.${suffix}@example.test`,
            mobileNumber: "09181234567",
            password: "Correct horse battery 2026",
            confirmPassword: "Correct horse battery 2026"
          }
        });
        assert.equal(regResponse.response.status, 201, JSON.stringify(regResponse.payload));
        const { schoolEmail } = regResponse.payload.data;

        // 2. Login as newly registered student
        const studentClient = new TestClient(baseUrl);
        const loginRes = await studentClient.login(schoolEmail, "Correct horse battery 2026");
        assert.equal(loginRes.response.status, 200, JSON.stringify(loginRes.payload));

        // 3. Request enrollment options
        const optionsRes = await studentClient.request("/api/v1/student/enrollment/options");
        assert.equal(optionsRes.response.status, 200, JSON.stringify(optionsRes.payload));
        const { programs, studentContext, curriculumSubjects } = optionsRes.payload.data;

        // Ensure newly registered student sees available programs
        assert.equal(studentContext.programId, null);
        assert.ok(Array.isArray(programs) && programs.length > 0, "Programs list should not be empty for unassigned student");
        assert.ok(programs.some((p) => p.code === "BSIT" || p.code === "BSECE"), "Expected active program codes in options");
        assert.ok(Array.isArray(curriculumSubjects) && curriculumSubjects.length > 0, "Curriculum subjects should be returned");

        // 4. Save draft enrollment with chosen program
        const selectedProgram = programs[0];
        const openTerm = optionsRes.payload.data.terms.find((t) => t.enrollmentOpen);
        assert.ok(openTerm, "An open academic term must exist for enrollment");

        const matchingSubjects = curriculumSubjects.filter(
          (s) => s.programId === selectedProgram.id && s.academicTermId === openTerm.id && s.yearLevel === 1
        );

        const draftRes = await studentClient.request("/api/v1/student/enrollment", {
          method: "PUT",
          json: {
            programId: selectedProgram.id,
            academicTermId: openTerm.id,
            yearLevel: "1",
            selectedSubjectIds: matchingSubjects.slice(0, 2).map((s) => s.id),
            formData: {
              personal: {
                fullName: `Workflow Student Test${suffix}`,
                birthday: "2007-03-20"
              }
            }
          }
        });
        assert.equal(draftRes.response.status, 200, JSON.stringify(draftRes.payload));
        assert.equal(draftRes.payload.data.application.programId, selectedProgram.id);
        assert.equal(draftRes.payload.data.application.status, "DRAFT");
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
