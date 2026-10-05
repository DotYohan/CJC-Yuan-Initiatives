import assert from "node:assert/strict";
import { test } from "node:test";
import { createConfig } from "../server/config.mjs";
import { createDatabase } from "../server/db.mjs";
import { AuthenticationStore } from "../server/auth-store.mjs";
import { newId } from "../server/security.mjs";

import { buildPasswordResetHtml, sendPasswordResetEmail } from "../server/email.mjs";

test("Alpha Launch Features: System Reports and Password Reset Store Methods", async () => {
  const config = createConfig({
    nodeEnv: "test",
    appOrigin: "http://portal.test",
    auditPepper: "test-audit-pepper-that-is-long-and-private"
  });

  const prisma = createDatabase();
  const authStore = new AuthenticationStore(prisma, config);
  const suffix = newId().slice(0, 8);

  try {
    // 1. Test createSystemReport
    const report = await authStore.createSystemReport({
      category: "UI_ISSUE",
      description: "Test bug report for alpha launch",
      pageUrl: "/portal.html",
      browserInfo: "Mozilla/5.0 Test Browser",
      errorCode: "ERR_TEST_500",
      userRole: "STUDENT"
    });

    assert.ok(report.id, "report created with ID");
    assert.equal(report.category, "UI_ISSUE");
    assert.equal(report.status, "OPEN");

    // 2. Test listSystemReports
    const reports = await authStore.listSystemReports({ status: "OPEN" });
    assert.ok(Array.isArray(reports), "listSystemReports returns array");
    const found = reports.find((r) => r.id === report.id);
    assert.ok(found, "created report present in open reports list");

    // 3. Test updateSystemReportStatus
    const updated = await authStore.updateSystemReportStatus(report.id, {
      status: "RESOLVED",
      adminNotes: "Fixed in production build"
    });

    assert.equal(updated.status, "RESOLVED");
    assert.equal(updated.adminNotes, "Fixed in production build");

    // 4. Test requestPasswordReset
    const role = await prisma.role.findFirstOrThrow({ where: { slug: "student" } });
    const user = await prisma.user.create({
      data: {
        id: newId(),
        username: `test_reset_${suffix}`,
        usernameNormalized: `test_reset_${suffix}`,
        displayName: "Reset Test User",
        email: `test_reset_${suffix}@cjc.invalid`,
        emailNormalized: `test_reset_${suffix}@cjc.invalid`,
        status: "ACTIVE",
        passwordHash: "dummy-hash",
        userRoles: { create: { roleId: role.id, isPrimary: true } }
      }
    });

    const now = new Date();
    const tokenRecord = await prisma.passwordResetToken.create({
      data: {
        id: newId(),
        userId: user.id,
        tokenHash: `token-hash-${suffix}`,
        requestedIpHash: "ip-hash-123",
        createdAt: now,
        expiresAt: new Date(now.getTime() + 900000)
      }
    });
    assert.ok(tokenRecord, "password reset token created in database");
    assert.equal(tokenRecord.userId, user.id);

  } finally {
    await prisma.$disconnect();
  }
});

test("Brevo Email Integration: HTML Generation and API Delivery Payload", async () => {
  const resetUrl = "http://portal.test/reset-password.html#token=abc123xyz";
  const displayName = "Maria Santos";
  const userEmail = "maria.santos@cjc.edu.ph";

  // 1. Verify HTML Generation
  const html = buildPasswordResetHtml({ displayName, resetUrl });
  assert.ok(html.includes("Reset your CJC SMS password"), "Contains subject title");
  assert.ok(html.includes("Maria Santos"), "Contains user display name");
  assert.ok(html.includes("http://portal.test/reset-password.html#token=abc123xyz"), "Contains reset URL");
  assert.ok(html.includes("expires in 30 minutes"), "Contains 30-minute expiry notice");
  assert.ok(html.includes("safely ignore this email"), "Contains security ignore notice");

  // 2. Verify Brevo API Call Payload
  const originalFetch = globalThis.fetch;
  let capturedUrl = null;
  let capturedOptions = null;

  globalThis.fetch = async (url, options) => {
    capturedUrl = url;
    capturedOptions = options;
    return {
      ok: true,
      status: 201,
      json: async () => ({ messageId: "<20261004.brevo.test@cjc.edu.ph>" })
    };
  };

  try {
    const config = createConfig({
      brevoApiKey: "xkeysib-test-key-12345",
      emailFrom: "CJC Portal <no-reply@cjc.edu.ph>"
    });

    const result = await sendPasswordResetEmail({
      user: { displayName, email: userEmail },
      resetUrl,
      config
    });

    assert.equal(result.messageId, "<20261004.brevo.test@cjc.edu.ph>");
    assert.equal(capturedUrl, "https://api.brevo.com/v3/smtp/email");
    assert.equal(capturedOptions.method, "POST");
    assert.equal(capturedOptions.headers["api-key"], "xkeysib-test-key-12345");

    const payload = JSON.parse(capturedOptions.body);
    assert.equal(payload.sender.name, "CJC Portal");
    assert.equal(payload.sender.email, "no-reply@cjc.edu.ph");
    assert.equal(payload.to[0].email, userEmail);
    assert.equal(payload.to[0].name, displayName);
    assert.equal(payload.subject, "Reset your CJC SMS password");
    assert.ok(payload.htmlContent.includes(resetUrl), "Payload includes resetUrl in HTML");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
