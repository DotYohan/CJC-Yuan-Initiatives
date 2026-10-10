import { spawn } from "node:child_process";

const testDatabaseUrl = String(process.env.TEST_DATABASE_URL || "").trim();
const sourceDatabaseUrl = String(process.env.DATABASE_URL || "").trim();
const alphaDatabaseUrl = String(process.env.ALPHA_DATABASE_URL || "").trim();

if (!testDatabaseUrl) {
  console.error("TEST_DATABASE_URL is required; refusing to run tests against the application database.");
  process.exit(2);
}

if (testDatabaseUrl === sourceDatabaseUrl || testDatabaseUrl === alphaDatabaseUrl) {
  console.error("TEST_DATABASE_URL must differ from DATABASE_URL and ALPHA_DATABASE_URL.");
  process.exit(2);
}

const testFiles = [
  "tests/auth-client.test.mjs",
  "tests/auth.test.mjs",
  "tests/admission.test.mjs",
  "tests/registrar.test.mjs",
  "tests/program-head.test.mjs",
  "tests/prerequisite.test.mjs",
  "tests/monitoring.test.mjs",
  "tests/student-program-workflow.test.mjs",
  "tests/registrar-subject-offering.test.mjs",
  "tests/student-assistant.test.mjs",
  "tests/club-environment.test.mjs",
  "tests/dean-workflow.test.mjs",
  "tests/academic-import.test.mjs"
];

const child = spawn(process.execPath, ["--test", "--test-concurrency=1", ...testFiles], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: testDatabaseUrl }
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
