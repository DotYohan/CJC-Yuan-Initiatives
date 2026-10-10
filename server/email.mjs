/**
 * Transactional email service using Brevo API v3.
 */

function escapeHtml(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parseEmailSender(senderString) {
  if (!senderString) return { email: "no-reply@cjc.edu.ph", name: "CJC Portal" };
  const match = senderString.match(/^(?:"?([^"]*)"?\s+)?<([^>]+)>$/);
  if (match) {
    return { name: match[1]?.trim() || "CJC Portal", email: match[2]?.trim() };
  }
  return { name: "CJC Portal", email: senderString.trim() };
}

export function buildPasswordResetHtml({ displayName, resetUrl }) {
  const safeName = escapeHtml(displayName || "User");
  const safeUrl = escapeHtml(resetUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your CJC SMS password</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f5f7; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f5f7; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color:#ffffff; border-radius:12px; border:1px solid #e2e8f0; overflow:hidden; box-shadow:0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color:#93162d; padding:28px 32px; text-align:left;">
              <h1 style="margin:0; color:#ffffff; font-size:20px; font-weight:700; letter-spacing:-0.02em;">Cor Jesu College</h1>
              <p style="margin:4px 0 0; color:rgba(255,255,255,0.85); font-size:13px; text-transform:uppercase; letter-spacing:0.05em; font-weight:600;">Student Management System</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px; font-size:18px; color:#0f172a; font-weight:600;">Password Reset Request</h2>
              <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#334155;">
                Hello <strong>${safeName}</strong>,
              </p>
              <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#334155;">
                We received a request to reset your password for your CJC Portal account. Click the button below to proceed:
              </p>
              <!-- Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 28px;">
                <tr>
                  <td style="border-radius:8px; background-color:#93162d;">
                    <a href="${safeUrl}" target="_blank" style="display:inline-block; padding:14px 28px; color:#ffffff; text-decoration:none; font-weight:600; font-size:15px; border-radius:8px;">Reset Password</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px; font-size:13px; line-height:1.5; color:#64748b;">
                <strong>Notice:</strong> This reset link expires in 30 minutes and can only be used once.
              </p>
              <p style="margin:0; font-size:13px; line-height:1.5; color:#64748b;">
                If you did not request a password reset, you can safely ignore this email. Your account remains secure and your password will not be changed.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc; padding:20px 32px; border-top:1px solid #e2e8f0; text-align:center; font-size:12px; color:#94a3b8;">
              <p style="margin:0 0 4px;">Cor Jesu College, Inc. · Digos City, Davao del Sur</p>
              <p style="margin:0;">This is an automated system notification. Please do not reply directly to this message.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendPasswordResetEmail({ user, resetUrl, config }) {
  const apiKey = config.brevoApiKey;
  const toEmail = user?.email;

  if (!toEmail) {
    throw new Error("User has no primary email address on file.");
  }

  if (!apiKey) {
    if (config.nodeEnv === "development") {
      process.stderr.write(`[DEV] Brevo API key missing. Reset link for ${toEmail}: ${resetUrl}\n`);
      return { status: "DEV_LOGGED" };
    }
    throw new Error("BREVO_API_KEY environment variable is not configured.");
  }

  const sender = parseEmailSender(config.emailFrom);
  const htmlContent = buildPasswordResetHtml({
    displayName: user.displayName || user.username || "User",
    resetUrl
  });

  const payload = {
    sender,
    to: [{ email: toEmail, name: user.displayName || user.username || toEmail }],
    subject: "Reset your CJC SMS password",
    htmlContent
  };

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      "accept": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Brevo email API returned HTTP ${response.status}: ${errorText.slice(0, 200)}`);
  }

  return response.json().catch(() => ({ status: "SUCCESS" }));
}
