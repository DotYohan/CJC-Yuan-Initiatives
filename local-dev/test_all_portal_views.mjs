import { createDatabase } from "../server/db.mjs";
import { createApp } from "../server/app.mjs";
import { createConfig } from "../server/config.mjs";
import crypto from "crypto";

const db = createDatabase();
const config = createConfig({ nodeEnv: "test", auditPepper: "test-audit-pepper-that-is-long-and-private" });
const app = createApp({ database: db, config });

async function makeRequest(path, roleSlug) {
  const user = await db.user.findFirst({
    where: { userRoles: { some: { role: { slug: { in: [roleSlug, roleSlug === "admin" ? "administrator" : roleSlug] } } } } }
  });
  if (!user) return { path, role: roleSlug, status: "NO_USER", body: "" };

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const session = await db.session.create({
    data: {
      tokenHash,
      csrfHash: crypto.createHash("sha256").update("test-csrf").digest("hex"),
      user: { connect: { id: user.id } },
      lastSeenAt: new Date(),
      idleExpiresAt: new Date(Date.now() + 1800000),
      absoluteExpiresAt: new Date(Date.now() + 86400000)
    }
  });

  const res = await fetch(`http://localhost:3000${path}`, {
    method: "GET",
    headers: {
      cookie: `cjc_session=${rawToken}`
    }
  });

  const bodyText = await res.text();
  await db.session.delete({ where: { tokenHash } });
  return { path, role: roleSlug, status: res.status, body: bodyText.slice(0, 100) };
}

async function main() {
  console.log("=== TESTING ALL ROLE PORTAL ENDPOINTS ===");

  const roles = await db.role.findMany();
  console.log("Available roles:", roles.map(r => r.slug).join(", "));

  // 1. Admin endpoints
  const adminEndpoints = [
    "/api/v1/admin/users",
    "/api/v1/admin/roles",
    "/api/v1/admin/system-logs",
    "/api/v1/admin/monitoring/health",
    "/api/v1/admin/faculty"
  ];
  for (const ep of adminEndpoints) {
    const r = await makeRequest(ep, "administrator");
    console.log(`[Admin] ${ep} -> ${r.status} ${r.status === 200 ? "OK" : "FAILED: " + r.body}`);
  }

  // 2. Registrar endpoints
  const registrarEndpoints = [
    "/api/v1/registrar/overview",
    "/api/v1/registrar/applications",
    "/api/v1/registrar/offerings",
    "/api/v1/registrar/offering-options",
    "/api/v1/registrar/subjects",
    "/api/v1/registrar/grades/submissions"
  ];
  for (const ep of registrarEndpoints) {
    const r = await makeRequest(ep, "registrar");
    console.log(`[Registrar] ${ep} -> ${r.status} ${r.status === 200 ? "OK" : "FAILED: " + r.body}`);
  }

  // 3. Program Head endpoints
  const phEndpoints = [
    "/api/v1/program-head/overview",
    "/api/v1/program-head/curricula",
    "/api/v1/program-head/offerings"
  ];
  for (const ep of phEndpoints) {
    const r = await makeRequest(ep, "program_head");
    console.log(`[Program Head] ${ep} -> ${r.status} ${r.status === 200 ? "OK" : "FAILED: " + r.body}`);
  }

  // 4. Faculty endpoints
  const facultyEndpoints = [
    "/api/v1/faculty/classes"
  ];
  for (const ep of facultyEndpoints) {
    const r = await makeRequest(ep, "faculty");
    console.log(`[Faculty] ${ep} -> ${r.status} ${r.status === 200 ? "OK" : "FAILED: " + r.body}`);
  }

  // 5. Student endpoints
  const studentEndpoints = [
    "/api/v1/student/profile",
    "/api/v1/student/obligations",
    "/api/v1/student/enrollment/application",
    "/api/v1/student/enrollment/options"
  ];
  for (const ep of studentEndpoints) {
    const r = await makeRequest(ep, "student");
    console.log(`[Student] ${ep} -> ${r.status} ${r.status === 200 ? "OK" : "FAILED: " + r.body}`);
  }
}

main().catch(console.error).finally(async () => {
  await db.$disconnect();
});
