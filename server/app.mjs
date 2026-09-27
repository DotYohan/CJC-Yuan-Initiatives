import { readFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { createConfig } from "./config.mjs";
import { AuthenticationStore, isUniqueConstraint } from "./auth-store.mjs";
import { createDatabase, ROLE_DEFINITIONS } from "./db.mjs";
import { StudentDashboardStore } from "./student-store.mjs";
import { AdmissionStore } from "./admission-store.mjs";
import { EnrollmentApplicationStore } from "./enrollment-store.mjs";
import { RegistrarStore } from "./registrar-store.mjs";
import { ProgramHeadStore } from "./program-head-store.mjs";
import { DocumentStorageService } from "./document-storage.mjs";
import { DocumentStore } from "./document-store.mjs";
import { FinancialService } from "./modules/financial/services/financialService.mjs";
import { PaymentService } from "./modules/financial/services/paymentService.mjs";
import { VerificationService } from "./modules/financial/services/verificationService.mjs";
import {
  auditHash,
  hashPassword,
  newId,
  normalizeIdentifier,
  passwordHashNeedsUpgrade,
  randomToken,
  safeHashEqual,
  tokenHash,
  validatePassword,
  verifyPassword
} from "./security.mjs";

const STATIC_FILES = new Map([
  ["/", { relativePath: "index.html", type: "text/html; charset=utf-8" }],
  ["/index.html", { relativePath: "index.html", type: "text/html; charset=utf-8" }],
  ["/style.css", { relativePath: "style.css", type: "text/css; charset=utf-8" }],
  ["/script.js", { relativePath: "script.js", type: "text/javascript; charset=utf-8" }],
  ["/auth-client.js", { relativePath: "auth-client.js", type: "text/javascript; charset=utf-8" }],
  ["/portal.css", { relativePath: "portal.css", type: "text/css; charset=utf-8" }],
  ["/portal.js", { relativePath: "portal.js", type: "text/javascript; charset=utf-8" }],
  ["/signup.html", { relativePath: "signup.html", type: "text/html; charset=utf-8" }],
  ["/signup.css", { relativePath: "signup.css", type: "text/css; charset=utf-8" }],
  ["/signup.js", { relativePath: "signup.js", type: "text/javascript; charset=utf-8" }],
  [
    "/reset-password.html",
    { relativePath: "reset-password.html", type: "text/html; charset=utf-8" }
  ],
  [
    "/reset-password.js",
    { relativePath: "reset-password.js", type: "text/javascript; charset=utf-8" }
  ],
  [
    "/assets/images/cjc-student-portal-hero.jpg",
    { relativePath: "assets/images/cjc-student-portal-hero.jpg", type: "image/jpeg", cache: true }
  ],
  [
    "/assets/images/cjc-student-portal-hero.png",
    { relativePath: "assets/images/cjc-student-portal-hero.png", type: "image/png", cache: true }
  ],
  [
    "/assets/images/cor-jesu-college-seal.png",
    { relativePath: "assets/images/cor-jesu-college-seal.png", type: "image/png", cache: true }
  ]
]);

const DOCUMENT_CONTENT_TYPES = new Map([
  [".pdf", "application/pdf"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"]
]);

const ROLE_BY_PORTAL_PATH = new Map(ROLE_DEFINITIONS.map((role) => [role.path, role]));
const ROLE_BY_API_SEGMENT = new Map(
  ROLE_DEFINITIONS.map((role) => [role.path.slice("/portal/".length), role])
);
const ACCOUNT_CREATION_ROLES = new Set(["administrator", "registrar", "program_head", "cashier", "student"]);

class HttpError extends Error {
  constructor(status, code, message, details, headers = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.headers = headers;
  }
}

const error = (status, code, message, details, headers) => {
  throw new HttpError(status, code, message, details, headers);
};

function setSecurityHeaders(response, requestId) {
  response.setHeader("X-Request-Id", requestId);
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
  );
}

function sendJson(response, status, payload, additionalHeaders = {}) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    ...additionalHeaders
  });
  response.end(body);
}

function acceptsBrowserHtml(request) {
  const accept = typeof request.headers.accept === "string" ? request.headers.accept.toLowerCase() : "";
  if (accept.includes("application/json")) return false;
  return accept.split(",").some((range) => {
    const [mediaType, ...parameters] = range.split(";");
    if (mediaType.trim() !== "text/html") return false;
    const quality = parameters
      .map((parameter) => parameter.trim())
      .find((parameter) => parameter.startsWith("q="));
    return quality ? Number(quality.slice(2)) > 0 : true;
  });
}

function sendPortalSigninRedirect(response, pathname) {
  const location = `/index.html?signin=1&returnTo=${encodeURIComponent(pathname)}`;
  response.writeHead(302, {
    Location: location,
    "Cache-Control": "no-store",
    Pragma: "no-cache",
    "Content-Length": "0"
  });
  response.end();
}

function parseCookies(header) {
  const cookies = new Map();
  if (typeof header !== "string") return cookies;
  for (const item of header.split(";")) {
    const separator = item.indexOf("=");
    if (separator < 1) continue;
    cookies.set(item.slice(0, separator).trim(), item.slice(separator + 1).trim());
  }
  return cookies;
}

function sessionCookie(config, token, remember, clear = false) {
  const attributes = [
    `${config.cookieName}=${clear ? "" : token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax"
  ];
  if (config.secureCookies) attributes.push("Secure");
  if (clear) attributes.push("Max-Age=0");
  else if (remember) attributes.push(`Max-Age=${Math.floor(config.rememberedAbsoluteMs / 1000)}`);
  return attributes.join("; ");
}

async function readJson(request, limit) {
  const contentType = String(request.headers["content-type"] ?? "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    error(415, "JSON_REQUIRED", "This endpoint accepts application/json only.");
  }
  const declaredLength = Number(request.headers["content-length"] ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > limit) {
    error(413, "BODY_TOO_LARGE", "The request body is too large.");
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) {
      request.resume();
      error(413, "BODY_TOO_LARGE", "The request body is too large.");
    }
    chunks.push(chunk);
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("not an object");
    return body;
  } catch {
    error(400, "INVALID_JSON", "The request body must be a valid JSON object.");
  }
}

function cleanText(value, maximum = 256) {
  return typeof value === "string" ? value.replace(/[\r\n\u0000]/g, " ").slice(0, maximum) : "";
}

export async function createApp(options = {}) {
  const config = options.config ?? createConfig(options);
  const database = options.prisma ?? options.database ?? createDatabase();
  const ownsDatabase = !options.prisma && !options.database;
  const store = options.store ?? new AuthenticationStore(database);
  const studentStore = options.studentStore ?? new StudentDashboardStore(database);
  const admissionStore = options.admissionStore ?? new AdmissionStore(database);
  const enrollmentApplicationStore = options.enrollmentApplicationStore ?? new EnrollmentApplicationStore(database);
  const registrarStore = options.registrarStore ?? new RegistrarStore(database);
  const programHeadStore = options.programHeadStore ?? new ProgramHeadStore(database);
  const documentStorage = options.documentStorage ?? new DocumentStorageService(config.documentRoot);
  await documentStorage.initialize();
  const documentStore = options.documentStore ?? new DocumentStore(database, documentStorage);
  const financialService = new FinancialService(database);
  const paymentService = new PaymentService(database);
  const verificationService = new VerificationService(database);
  verificationService.paymentService = paymentService;
  const dummyPasswordHash = await hashPassword(randomToken(24), config.scrypt);
  const onPasswordReset =
    options.onPasswordReset ??
    (async ({ resetUrl }) => {
      if (config.nodeEnv === "development") {
        process.stderr.write(`Development password reset link: ${resetUrl}\n`);
      }
    });

  function requestContext(request, pathname) {
    const address = request.socket?.remoteAddress ?? "unknown";
    return {
      requestId: newId(),
      pathname,
      ipHash: auditHash(address, config.auditPepper),
      sessionLoaded: false,
      session: null
    };
  }

  async function audit(context, request, eventType, outcome, fields = {}) {
    const metadata = fields.metadata && typeof fields.metadata === "object" ? fields.metadata : {};
    await store.insertAudit({
      eventType,
      outcome,
      actorUserId: fields.actorUserId ?? null,
      targetUserId: fields.targetUserId ?? null,
      identifierHash: fields.identifierHash ?? null,
      requestId: context.requestId,
      ipHash: context.ipHash,
      method: cleanText(request.method, 12),
      path: cleanText(context.pathname, 256),
      metadata,
      createdAt: config.now()
    });
  }

  let nextCleanupAt = config.now();

  async function pruneSecurityState() {
    const now = config.now();
    if (now < nextCleanupAt) return;
    nextCleanupAt = now + config.cleanupIntervalMs;
    await store.pruneSecurityState(now, config);
  }

  async function consumeRateLimit(scopeKey, limit, windowMs) {
    const now = config.now();
    const retention = Math.max(config.loginWindowMs, config.resetWindowMs, config.resetAttemptWindowMs, config.changePasswordWindowMs) * 2;
    return store.consumeRateLimit(scopeKey, limit, windowMs, now, now - retention, config.cleanupBatchSize);
  }

  async function createSession(user = null, remember = false) {
    const now = config.now();
    const token = randomToken();
    const csrfToken = auditHash(`csrf:${token}`, config.auditPepper);
    const absoluteDuration = user
      ? remember
        ? config.rememberedAbsoluteMs
        : config.sessionAbsoluteMs
      : config.anonymousSessionMs;
    const idleDuration = user
      ? remember
        ? config.rememberedIdleMs
        : config.sessionIdleMs
      : config.anonymousSessionMs;
    const absoluteExpiresAt = now + absoluteDuration;
    await store.insertSession({
      tokenHash: tokenHash(token),
      userId: user?.id ?? null,
      csrfHash: tokenHash(csrfToken),
      authorizationVersion: user?.authorization_version ?? null,
      remember,
      createdAt: now,
      lastSeenAt: now,
      idleExpiresAt: Math.min(now + idleDuration, absoluteExpiresAt),
      absoluteExpiresAt
    });
    return { token, csrfToken, remember, tokenHash: tokenHash(token) };
  }

  async function loadSession(request, context) {
    if (context.sessionLoaded) return context.session;
    context.sessionLoaded = true;
    const rawToken = parseCookies(request.headers.cookie).get(config.cookieName);
    if (!rawToken || !/^[A-Za-z0-9_-]{40,64}$/.test(rawToken)) return null;
    const hashed = tokenHash(rawToken);
    const session = await store.sessionByHash(hashed);
    if (!session || session.revoked_at) return null;
    const now = config.now();
    if (session.idle_expires_at <= now || session.absolute_expires_at <= now) {
      await store.revokeSession(hashed, now);
      return null;
    }

    let user = null;
    if (session.user_id) {
      user = await store.userById(session.user_id);
      if (!user || user.status !== "active" || user.authorization_version !== session.authorization_version) {
        await store.revokeSession(hashed, now);
        return null;
      }
    }

    const idleDuration = user
      ? session.remember_me
        ? config.rememberedIdleMs
        : config.sessionIdleMs
      : config.anonymousSessionMs;
    const idleExpiresAt = Math.min(now + idleDuration, session.absolute_expires_at);
    await store.touchSession(hashed, now, idleExpiresAt);
    context.session = { ...session, idle_expires_at: idleExpiresAt, rawToken, tokenHash: hashed, user };
    return context.session;
  }

  async function freshCsrf(session) {
    const csrfToken = auditHash(`csrf:${session.rawToken}`, config.auditPepper);
    await store.rotateCsrf(session.tokenHash, tokenHash(csrfToken));
    session.csrf_hash = tokenHash(csrfToken);
    return csrfToken;
  }

  async function ensureExactOrigin(request, context) {
    const suppliedOrigin = request.headers.origin;
    if (typeof suppliedOrigin !== "string" || suppliedOrigin !== config.appOrigin) {
      await audit(context, request, "security.origin", "failure");
      error(403, "ORIGIN_MISMATCH", "The request origin was rejected.");
    }
  }

  async function requireCsrf(request, context) {
    await ensureExactOrigin(request, context);
    const session = await loadSession(request, context);
    const supplied = request.headers["x-csrf-token"];
    if (!session || typeof supplied !== "string" || !safeHashEqual(tokenHash(supplied), session.csrf_hash)) {
      await audit(context, request, "security.csrf", "failure", { actorUserId: session?.user?.id });
      error(403, "CSRF_INVALID", "The security token is missing or invalid.");
    }
    return session;
  }

  function publicUser(user) {
    const roles = store.rolesForUser(user);
    const primary = roles.find((role) => role.is_primary === 1) ?? roles[0] ?? null;
    return {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      email: user.email,
      status: user.status,
      mustChangePassword: user.must_change_password === 1,
      roles: roles.map((role) => role.slug),
      primaryRole: primary?.slug ?? null,
      landingPath: primary?.landing_path ?? null,
      assignedProgram: user.assigned_program ?? null,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      lastLoginAt: user.last_login_at
    };
  }

  async function requireAuthentication(request, context, { allowMustChange = false } = {}) {
    const session = await loadSession(request, context);
    if (!session?.user) {
      await audit(context, request, "authentication.session", "failure");
      error(401, "AUTHENTICATION_REQUIRED", "Please sign in to continue.");
    }
    if (!allowMustChange && session.user.must_change_password === 1) {
      error(403, "PASSWORD_CHANGE_REQUIRED", "Change the temporary password before continuing.");
    }
    return session;
  }

  async function requirePermission(request, context, permission, optionsValue) {
    const session = await requireAuthentication(request, context, optionsValue);
    const permissions = new Set((await store.permissionsForUser(session.user.id)).map((entry) => entry.slug));
    if (!permissions.has(permission)) {
      await audit(context, request, "authorization.denied", "failure", {
        actorUserId: session.user.id,
        metadata: { permission }
      });
      error(403, "FORBIDDEN", "Your account does not have permission to perform this action.");
    }
    return session;
  }

  async function requireStateAuthentication(request, context, optionsValue = {}) {
    const csrfSession = await requireCsrf(request, context);
    const session = await requireAuthentication(request, context, optionsValue);
    if (csrfSession.tokenHash !== session.tokenHash) error(403, "CSRF_INVALID", "The security token is invalid.");
    return session;
  }

  async function requireStatePermission(request, context, permission) {
    await requireCsrf(request, context);
    return requirePermission(request, context, permission);
  }

  async function authSession(request, response, context, requireUser = false) {
    let session = await loadSession(request, context);
    let cookie;
    if (!session) {
      if (requireUser) {
        await audit(context, request, "authentication.session", "failure");
        error(401, "AUTHENTICATION_REQUIRED", "Please sign in to continue.");
      }
      const created = await createSession();
      session = await store.sessionByHash(created.tokenHash);
      session.tokenHash = created.tokenHash;
      session.rawToken = created.token;
      context.session = session;
      context.sessionLoaded = true;
      cookie = sessionCookie(config, created.token, false);
    }
    if (requireUser && !session.user) {
      await audit(context, request, "authentication.session", "failure");
      error(401, "AUTHENTICATION_REQUIRED", "Please sign in to continue.");
    }
    const csrfToken = await freshCsrf(session);
    const userData = session.user ? publicUser(session.user) : null;
    const data = {
      authenticated: Boolean(userData),
      ...(userData ? { user: userData, landingPath: userData.landingPath } : {}),
      csrfToken
    };
    sendJson(response, 200, { data }, cookie ? { "Set-Cookie": cookie } : {});
  }

  async function login(request, response, context) {
    const anonymousSession = await requireCsrf(request, context);
    const body = await readJson(request, config.bodyLimitBytes);
    const identifier = normalizeIdentifier(body.identifier);
    const password = typeof body.password === "string" ? body.password : "";
    const remember = body.remember === true;
    const identifierHash = auditHash(identifier || "empty", config.auditPepper);
    const now = config.now();
    const cutoff = now - config.loginWindowMs;
    const ipRateKey = `login-ip:${context.ipHash}`;
    if (!(await consumeRateLimit(ipRateKey, config.loginIpLimit, config.loginWindowMs))) {
      await audit(context, request, "authentication.login", "rate_limited", { identifierHash });
      error(
        429,
        "AUTHENTICATION_RATE_LIMITED",
        "Unable to sign in. Please try again later.",
        undefined,
        { "Retry-After": String(Math.ceil(config.loginWindowMs / 1000)) }
      );
    }

    const originalUser = identifier ? await store.userByIdentifier(identifier) : null;
    const verified = await verifyPassword(password, originalUser?.password_hash ?? dummyPasswordHash);
    const upgradedHash =
      originalUser && verified && passwordHashNeedsUpgrade(originalUser.password_hash, config.scrypt)
        ? await hashPassword(password, config.scrypt)
        : null;
    const currentUser = originalUser ? await store.userById(originalUser.id) : null;
    const passwordRecordUnchanged = Boolean(currentUser && originalUser && currentUser.password_hash === originalUser.password_hash);
    const locked = Boolean(currentUser?.lock_until && currentUser.lock_until > now);
    const valid = Boolean(currentUser && currentUser.status === "active" && !locked && verified && passwordRecordUnchanged);
    let outcome = "failure";
    const attempt = { userId: currentUser?.id ?? null, identifierHash, ipHash: context.ipHash, outcome, createdAt: now };
    let refreshedUser = null;
    if (valid) {
      outcome = "success";
      attempt.outcome = outcome;
      refreshedUser = await store.recordSuccessfulLogin(
        currentUser.id,
        originalUser.password_hash,
        upgradedHash ?? currentUser.password_hash,
        now,
        ipRateKey,
        attempt
      );
    } else {
      if (locked) outcome = "locked";
      const withinWindow = currentUser?.last_failed_at && currentUser.last_failed_at >= cutoff;
      const failures = currentUser?.status === "active" && !locked
        ? (withinWindow ? currentUser.failed_login_count + 1 : 1)
        : currentUser?.failed_login_count ?? 0;
      const exponent = Math.max(0, failures - config.accountFailureLimit);
      const lockDuration = failures >= config.accountFailureLimit
        ? Math.min(config.lockBaseMs * 2 ** exponent, config.lockMaxMs)
        : 0;
      attempt.outcome = outcome;
      await store.recordFailedLogin(currentUser?.status === "active" && !locked ? currentUser : null, {
        failures,
        lockUntil: lockDuration ? now + lockDuration : null,
        now,
        attempt
      });
    }

    if (!refreshedUser) {
      await audit(context, request, "authentication.login", outcome, {
        targetUserId: originalUser?.id,
        identifierHash
      });
      error(401, "INVALID_CREDENTIALS", "The username/email or password is incorrect.");
    }

    await store.revokeSession(anonymousSession.tokenHash, now);
    const created = await createSession(refreshedUser, remember);
    await audit(context, request, "authentication.login", "success", {
      actorUserId: refreshedUser.id,
      targetUserId: refreshedUser.id,
      identifierHash,
      metadata: { remember }
    });
    const userData = publicUser(refreshedUser);
    sendJson(
      response,
      200,
      { data: { user: userData, landingPath: userData.landingPath, csrfToken: created.csrfToken } },
      { "Set-Cookie": sessionCookie(config, created.token, remember) }
    );
  }

  async function logout(request, response, context) {
    const session = await requireCsrf(request, context);
    await readJson(request, config.bodyLimitBytes);
    const now = config.now();
    await store.revokeSession(session.tokenHash, now);
    if (session.user) {
      await audit(context, request, "authentication.logout", "success", {
        actorUserId: session.user.id,
        targetUserId: session.user.id
      });
    }
    sendJson(response, 200, { data: { loggedOut: true } }, {
      "Set-Cookie": sessionCookie(config, "", false, true)
    });
  }

  async function forgotPassword(request, response, context) {
    const responseStarted = performance.now();
    await requireCsrf(request, context);
    const body = await readJson(request, config.bodyLimitBytes);
    const identifier = normalizeIdentifier(body.identifier);
    const identifierHash = auditHash(identifier || "empty", config.auditPepper);
    const now = config.now();
    const ipAllowed = await consumeRateLimit(
      `password-reset-ip:${context.ipHash}`,
      config.resetRequestLimit,
      config.resetWindowMs
    );
    const identifierAllowed = ipAllowed
      ? await consumeRateLimit(
          `password-reset-account:${identifierHash}`,
          config.resetRequestLimit,
          config.resetWindowMs
        )
      : false;
    if (ipAllowed) await store.insertResetRequest(identifierHash, context.ipHash, now);
    const user = identifier ? await store.userByIdentifier(identifier) : null;

    if (ipAllowed && identifierAllowed && user?.status === "active") {
      const rawToken = randomToken();
      await store.insertResetToken({
        id: newId(), userId: user.id, tokenHash: tokenHash(rawToken),
        requestedIpHash: context.ipHash, createdAt: now, expiresAt: now + config.resetTokenMs
      });
      const resetUrl = `${config.appOrigin}/reset-password.html#token=${encodeURIComponent(rawToken)}`;
      try {
        await onPasswordReset({ user: publicUser(user), resetUrl, token: rawToken });
        await audit(context, request, "password_reset.requested", "queued", {
          targetUserId: user.id,
          identifierHash
        });
      } catch {
        await audit(context, request, "password_reset.requested", "delivery_failed", {
          targetUserId: user.id,
          identifierHash
        });
      }
    } else {
      await audit(context, request, "password_reset.requested", "ignored", {
        targetUserId: user?.id,
        identifierHash
      });
    }

    const remainingDelay = config.forgotResponseFloorMs - (performance.now() - responseStarted);
    if (remainingDelay > 0) await new Promise((resolveDelay) => setTimeout(resolveDelay, remainingDelay));
    sendJson(response, 202, {
      data: {
        message: "If an eligible account matches that identifier, password-reset instructions will be sent."
      }
    });
  }

  async function resetPassword(request, response, context) {
    const anonymousSession = await requireCsrf(request, context);
    const body = await readJson(request, config.bodyLimitBytes);
    const resetRateKey = `password-reset-attempt:${context.ipHash}`;
    if (!(await consumeRateLimit(resetRateKey, config.resetAttemptLimit, config.resetAttemptWindowMs))) {
      await audit(context, request, "password_reset.completed", "rate_limited");
      error(
        429,
        "RESET_RATE_LIMITED",
        "Too many reset attempts. Please try again later.",
        undefined,
        { "Retry-After": String(Math.ceil(config.resetAttemptWindowMs / 1000)) }
      );
    }
    const rawToken = typeof body.token === "string" ? body.token : "";
    const resetRecord = /^[A-Za-z0-9_-]{40,64}$/.test(rawToken)
      ? await store.resetTokenByHash(tokenHash(rawToken))
      : null;
    const now = config.now();
    if (!resetRecord || resetRecord.used_at || resetRecord.expires_at <= now || resetRecord.status !== "active") {
      await audit(context, request, "password_reset.completed", "failure");
      error(400, "RESET_TOKEN_INVALID", "The reset link is invalid or has expired.");
    }
    const passwordError = validatePassword(body.newPassword, config);
    if (passwordError) error(422, "PASSWORD_POLICY", passwordError);

    const encoded = await hashPassword(body.newPassword, config.scrypt);
    const completed = await store.completePasswordReset({
      resetRecord, encoded, now, anonymousTokenHash: anonymousSession.tokenHash, resetRateKey
    });
    if (!completed) error(400, "RESET_TOKEN_INVALID", "The reset link is invalid or has expired.");
    await audit(context, request, "password_reset.completed", "success", {
      targetUserId: resetRecord.user_id
    });
    const created = await createSession();
    sendJson(
      response,
      200,
      {
        data: {
          message: "Password updated. Sign in with the new password.",
          csrfToken: created.csrfToken
        }
      },
      { "Set-Cookie": sessionCookie(config, created.token, false) }
    );
  }

  async function changePassword(request, response, context) {
    const session = await requireStateAuthentication(request, context, { allowMustChange: true });
    const body = await readJson(request, config.bodyLimitBytes);
    const passwordError = validatePassword(body.newPassword, config);
    if (passwordError) error(422, "PASSWORD_POLICY", passwordError);
    if (typeof body.currentPassword !== "string") {
      error(400, "CURRENT_PASSWORD_INVALID", "The current password is incorrect.");
    }
    const userRateKey = `password-change-user:${session.user.id}`;
    const ipRateKey = `password-change-ip:${context.ipHash}`;
    const ipAllowed = await consumeRateLimit(
      ipRateKey,
      config.changePasswordIpLimit,
      config.changePasswordWindowMs
    );
    const userAllowed = ipAllowed
      ? await consumeRateLimit(
          userRateKey,
          config.changePasswordUserLimit,
          config.changePasswordWindowMs
        )
      : false;
    if (!ipAllowed || !userAllowed) {
      await audit(context, request, "password.changed", "rate_limited", {
        actorUserId: session.user.id,
        targetUserId: session.user.id,
        metadata: { scope: ipAllowed ? "account" : "ip" }
      });
      error(
        429,
        "PASSWORD_CHANGE_RATE_LIMITED",
        "Too many password-change attempts. Please try again later.",
        undefined,
        { "Retry-After": String(Math.ceil(config.changePasswordWindowMs / 1000)) }
      );
    }
    const currentMatches = await verifyPassword(body.currentPassword, session.user.password_hash);
    if (!currentMatches) {
      await audit(context, request, "password.changed", "failure", {
        actorUserId: session.user.id,
        targetUserId: session.user.id
      });
      error(400, "CURRENT_PASSWORD_INVALID", "The current password is incorrect.");
    }
    if (await verifyPassword(body.newPassword, session.user.password_hash)) {
      error(422, "PASSWORD_REUSED", "Choose a password different from the current password.");
    }

    const now = config.now();
    const encoded = await hashPassword(body.newPassword, config.scrypt);
    const refreshed = await store.changePassword({ user: session.user, encoded, now, userRateKey, ipRateKey });
    if (!refreshed) error(409, "SESSION_STALE", "The account changed during this request. Please sign in again.");
    const created = await createSession(refreshed, session.remember_me === 1);
    await audit(context, request, "password.changed", "success", {
      actorUserId: session.user.id,
      targetUserId: session.user.id
    });
    const userData = publicUser(refreshed);
    sendJson(
      response,
      200,
      { data: { user: userData, landingPath: userData.landingPath, csrfToken: created.csrfToken } },
      { "Set-Cookie": sessionCookie(config, created.token, created.remember) }
    );
  }

  function validateUsername(value) {
    if (typeof value !== "string" || !/^[A-Za-z0-9._-]{3,64}$/.test(value)) {
      error(422, "USERNAME_INVALID", "Username must be 3–64 letters, numbers, periods, underscores, or hyphens.");
    }
    return value;
  }

  function validateEmail(value) {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value !== "string" || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      error(422, "EMAIL_INVALID", "Enter a valid email address.");
    }
    return value.trim();
  }

  function validateRequiredText(value, field, maximum = 100) {
    if (typeof value !== "string") error(422, `${field.toUpperCase()}_REQUIRED`, `${field} is required.`);
    const normalized = value.normalize("NFKC").trim();
    if (!normalized || normalized.length > maximum || /[\u0000-\u001f\u007f]/.test(normalized)) {
      error(422, `${field.toUpperCase()}_INVALID`, `${field} is invalid.`);
    }
    return normalized;
  }

  async function listAdmissionPrograms(request, response) {
    sendJson(response, 200, { data: { programs: await admissionStore.listPrograms() } });
  }

  async function registerStudent(request, response, context) {
    await requireCsrf(request, context);
    const body = await readJson(request, config.bodyLimitBytes);
    const firstName = validateRequiredText(body.firstName, "first name");
    const middleName = body.middleName ? validateRequiredText(body.middleName, "middle name") : null;
    const lastName = validateRequiredText(body.lastName, "last name");
    const birthDate = typeof body.birthDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.birthDate)
      ? body.birthDate
      : null;
    if (!birthDate) error(422, "BIRTH_DATE_INVALID", "Enter a valid birthday.");
    const personalEmail = validateEmail(body.personalEmail);
    if (!personalEmail) error(422, "EMAIL_REQUIRED", "Personal email is required.");
    const mobileNumber = validateRequiredText(body.mobileNumber, "mobile number", 32);
    const password = typeof body.password === "string" ? body.password : "";
    if (password !== body.confirmPassword) error(422, "PASSWORD_MISMATCH", "Passwords do not match.");
    const passwordError = validatePassword(password, config);
    if (passwordError) error(422, "PASSWORD_POLICY", passwordError);

    try {
      const result = await admissionStore.registerStudent({
        firstName, middleName, lastName, birthDate, personalEmail, mobileNumber,
        password, admissionYear: new Date(config.now()).getUTCFullYear()
      }, config);
      await audit(context, request, "admission.student_registered", "success", {
        metadata: { applicationNumber: result.applicationNumber, studentNumber: result.studentNumber }
      });
      sendJson(response, 201, { data: result });
    } catch (caught) {
      if (caught.message === "PROGRAM_INVALID") error(422, "PROGRAM_INVALID", "Select an active program.");
      if (caught.message === "ACADEMIC_TERM_MISSING") error(503, "ACADEMIC_TERM_MISSING", "The academic catalog has no available term yet.");
      if (caught.message === "ENTRANCE_FEE_NOT_CONFIGURED") error(503, "ENTRANCE_FEE_NOT_CONFIGURED", "The entrance fee is not configured.");
      if (caught.code === "P2002") error(409, "ACCOUNT_EXISTS", "That email or generated school identity already exists.");
      throw caught;
    }
  }

  function validateDisplayName(value) {
    if (typeof value !== "string") error(422, "DISPLAY_NAME_INVALID", "Display name is required.");
    const normalized = value.normalize("NFKC").trim().replace(/\s+/g, " ");
    const length = [...normalized].length;
    if (length < 2 || length > 120 || /[\u0000-\u001f\u007f]/.test(normalized)) {
      error(422, "DISPLAY_NAME_INVALID", "Display name must contain 2–120 valid characters.");
    }
    return normalized;
  }

  async function createUser(request, response, context) {
    const adminSession = await requireStatePermission(request, context, "users.manage");
    const body = await readJson(request, config.bodyLimitBytes);
    const username = validateUsername(body.username);
    const displayName = validateDisplayName(body.displayName);
    const email = validateEmail(body.email);
    const passwordError = validatePassword(body.password, config);
    if (passwordError) error(422, "PASSWORD_POLICY", passwordError);
    const role = (await store.listRoles()).find((candidate) => candidate.slug === body.role);
    if (!role || !ACCOUNT_CREATION_ROLES.has(role.slug)) {
      error(422, "ROLE_INVALID", "Select Admin, Registrar, Program Head, Cashier, or Student.");
    }
    let programId = null;
    if (role.slug === "program_head") {
      programId = typeof body.programId === "string" ? body.programId.trim() : "";
      if (!programId) error(422, "PROGRAM_REQUIRED", "Select the program assigned to this Program Head.");
      const program = (await store.listPrograms()).find((candidate) => candidate.id === programId);
      if (!program) error(422, "PROGRAM_INVALID", "Select an active program.");
    }
    const encoded = await hashPassword(body.password, config.scrypt);
    const now = config.now();
    const userId = newId();
    try {
      await store.createUser({
        id: userId,
        username,
        usernameNormalized: normalizeIdentifier(username),
        displayName,
        email,
        emailNormalized: email ? normalizeIdentifier(email) : null,
        passwordHash: encoded,
        mustChangePassword: body.mustChangePassword !== false,
        roleSlug: role.slug,
        programId,
        programAssignmentId: role.slug === "program_head" ? newId() : null,
        assignedByUserId: adminSession.user.id,
        now
      });
    } catch (caught) {
      if (isUniqueConstraint(caught)) error(409, "ACCOUNT_EXISTS", "That username or email is already in use.");
      if (caught.message === "PROGRAM_REQUIRED") error(422, "PROGRAM_REQUIRED", "Select the program assigned to this Program Head.");
      if (caught.message === "PROGRAM_INVALID") error(422, "PROGRAM_INVALID", "Select an active program.");
      throw caught;
    }
    await audit(context, request, "account.created", "success", {
      actorUserId: adminSession.user.id,
      targetUserId: userId,
      metadata: { role: role.slug, programId }
    });
    sendJson(response, 201, { data: { user: publicUser(await store.userById(userId)) } });
  }

  async function listUsers(request, response, context) {
    await requirePermission(request, context, "users.manage");
    const users = (await store.listUsers()).map(publicUser);
    sendJson(response, 200, { data: { users } });
  }

  async function listRoles(request, response, context) {
    await requirePermission(request, context, "users.manage");
    const roles = await store.listRoles();
    sendJson(response, 200, { data: { roles } });
  }

  async function listAdminPrograms(request, response, context) {
    await requirePermission(request, context, "users.manage");
    const programs = await store.listPrograms();
    sendJson(response, 200, { data: { programs } });
  }

  async function updateStatus(request, response, context, userId) {
    const adminSession = await requireStatePermission(request, context, "users.manage");
    const body = await readJson(request, config.bodyLimitBytes);
    if (!new Set(["active", "disabled"]).has(body.status)) {
      error(422, "STATUS_INVALID", "Status must be active or disabled.");
    }
    if (adminSession.user.id === userId && body.status === "disabled") {
      error(409, "SELF_DISABLE_FORBIDDEN", "Administrators cannot disable their current account.");
    }
    const now = config.now();
    const updatedUser = await store.updateStatus(userId, body.status, now);
    if (!updatedUser) error(404, "ACCOUNT_NOT_FOUND", "Account not found.");
    await audit(context, request, "account.status_changed", "success", {
      actorUserId: adminSession.user.id,
      targetUserId: userId,
      metadata: { status: body.status }
    });
    sendJson(response, 200, { data: { user: publicUser(updatedUser) } });
  }

  async function updateRoles(request, response, context, userId) {
    const adminSession = await requireStatePermission(request, context, "users.manage");
    const body = await readJson(request, config.bodyLimitBytes);
    const roles = Array.isArray(body.roles) ? [...new Set(body.roles)] : [];
    const availableRoles = new Set((await store.listRoles()).map((role) => role.slug));
    if (roles.length === 0 || roles.some((slug) => !availableRoles.has(slug))) {
      error(422, "ROLE_INVALID", "Provide one or more recognized roles.");
    }
    const primaryRole = typeof body.primaryRole === "string" ? body.primaryRole : roles[0];
    if (!roles.includes(primaryRole)) error(422, "PRIMARY_ROLE_INVALID", "The primary role must be assigned to the user.");
    if (adminSession.user.id === userId && !roles.includes("administrator")) {
      error(409, "SELF_ROLE_CHANGE_FORBIDDEN", "Administrators cannot remove their own administrator role.");
    }
    const now = config.now();
    const updatedUser = await store.updateRoles(userId, roles, primaryRole, adminSession.user.id, now);
    if (updatedUser === null) error(404, "ACCOUNT_NOT_FOUND", "Account not found.");
    if (updatedUser === false) error(422, "ROLE_INVALID", "Provide one or more recognized roles.");
    await audit(context, request, "account.roles_changed", "success", {
      actorUserId: adminSession.user.id,
      targetUserId: userId,
      metadata: { roles, primaryRole }
    });
    sendJson(response, 200, { data: { user: publicUser(updatedUser) } });
  }

    async function deleteUser(request, response, context, userId) {
      const adminSession = await requireStatePermission(request, context, "users.manage");
      if (adminSession.user.id === userId) {
        error(409, "SELF_DELETION_FORBIDDEN", "Administrators cannot delete their own account.");
      }
      const success = await store.deleteUser(userId);
      if (!success) error(404, "ACCOUNT_NOT_FOUND", "Account not found.");
      
      await audit(context, request, "account.deleted", "success", {
        actorUserId: adminSession.user.id,
        targetUserId: userId
      });
      sendJson(response, 200, { data: { success: true } });
    }

  async function listAudit(request, response, context, url) {
    await requirePermission(request, context, "audit.read");
    const requestedLimit = Number(url.searchParams.get("limit") ?? 50);
    const limit = Number.isSafeInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 200) : 50;
    const entries = await store.listAudit(limit);
    sendJson(response, 200, { data: { entries } });
  }

  async function registrarDashboard(request, response, context) {
    await requirePermission(request, context, "VIEW_ENROLLMENT_PERIOD");
    sendJson(response, 200, { data: await registrarStore.dashboard() });
  }

  function handleProgramHeadError(caught) {
    const messages = {
      PROGRAM_HEAD_ASSIGNMENT_REQUIRED: [403, "PROGRAM_HEAD_ASSIGNMENT_REQUIRED", "This account is not assigned as a program head for any program."],
      FORBIDDEN: [403, "FORBIDDEN", "This record is not managed by your assigned program."],
      CURRICULUM_NOT_FOUND: [404, "CURRICULUM_NOT_FOUND", "Curriculum not found."],
      CURRICULUM_LOCKED: [409, "CURRICULUM_LOCKED", "Published curriculum versions cannot be changed."],
      CURRICULUM_SUBJECT_NOT_FOUND: [404, "CURRICULUM_SUBJECT_NOT_FOUND", "The selected subject is not part of this curriculum."],
      STUDENT_NOT_FOUND: [404, "STUDENT_NOT_FOUND", "Student not found in your assigned program."],
      ENROLLMENT_NOT_FOUND: [404, "ENROLLMENT_NOT_FOUND", "Enrollment record not found in your assigned program."],
      ENROLLMENT_APPLICATION_NOT_FOUND: [404, "ENROLLMENT_APPLICATION_NOT_FOUND", "Enrollment application not found in your assigned program."],
      APPLICATION_LOCKED: [409, "APPLICATION_LOCKED", "This application is no longer awaiting Program Head review."],
      APPLICATION_CONFLICT: [409, "APPLICATION_CONFLICT", "The application changed or its admission record is inconsistent. Refresh before reviewing."],
      INVALID_STATUS: [422, "INVALID_STATUS", "Choose approve, return for correction, or reject."],
      DECISION_NOTES_REQUIRED: [422, "DECISION_NOTES_REQUIRED", "Provide feedback when returning or rejecting an application."],
      ENROLLMENT_NOT_REVIEWABLE: [409, "ENROLLMENT_NOT_REVIEWABLE", "This enrollment is no longer pending academic evaluation."],
      ENROLLMENT_RULES_FAILED: [422, "ENROLLMENT_RULES_FAILED", "Academic requirements must be resolved before approval."],
      OVERRIDE_REASON_REQUIRED: [422, "OVERRIDE_REASON_REQUIRED", "Enter a reason for each prerequisite override approval."],
      OVERRIDE_INVALID: [422, "OVERRIDE_INVALID", "Only a missing prerequisite on this enrollment can be overridden."],
      ACADEMIC_TERM_INVALID: [422, "ACADEMIC_TERM_INVALID", "Select an academic term that is not closed or archived."],
      FACULTY_INVALID: [422, "FACULTY_INVALID", "Select an active faculty member assigned to this department."],
      ROOM_INVALID: [422, "ROOM_INVALID", "Select an active room."],
      SECTION_CODE_INVALID: [422, "SECTION_CODE_INVALID", "Enter a valid section code."],
      SECTION_CONFLICT: [409, "SECTION_CONFLICT", "The section code already belongs to another curriculum or year level in this term."],
      OFFERING_CODE_INVALID: [422, "OFFERING_CODE_INVALID", "Enter a valid offering code."],
      OFFERING_INVALID: [422, "OFFERING_INVALID", "Provide valid offering details."],
      OFFERING_DUPLICATE: [409, "OFFERING_DUPLICATE", "This offering code already exists in the academic term."],
      SCHEDULE_INVALID: [422, "SCHEDULE_INVALID", "Provide a valid weekday and start/end time."],
      SCHEDULE_CONFLICT: [409, "SCHEDULE_CONFLICT", "The selected faculty member or room has a conflicting schedule."]
    };
    const responseData = messages[caught.message];
    if (responseData) error(...responseData, caught.details);
    throw caught;
  }

  async function programHeadDashboard(request, response, context) {
    const session = await requirePermission(request, context, "portal.access.program_head");
    try {
      const dashboard = await programHeadStore.dashboard(session.user.id);
      sendJson(response, 200, { data: { dashboard } });
    } catch (caught) {
      handleProgramHeadError(caught);
    }
  }

  async function programHeadApplications(request, response, context, applicationId) {
    const mutation = request.method === "PATCH";
    const session = await (mutation ? requireStatePermission : requirePermission)(request, context, "portal.access.program_head");
    try {
      if (mutation) {
        const body = await readJson(request, config.bodyLimitBytes);
        const application = await programHeadStore.decideEnrollmentApplication(session.user.id, applicationId, body);
        await audit(context, request, "program_head.enrollment_application_decided", "success", {
          actorUserId: session.user.id, metadata: { applicationId, decision: body.status, status: application.status }
        });
        return sendJson(response, 200, { data: { application } });
      }
      if (applicationId) return sendJson(response, 200, { data: { review: await programHeadStore.enrollmentApplicationReview(session.user.id, applicationId) } });
      return sendJson(response, 200, { data: { applications: await programHeadStore.enrollmentApplications(session.user.id) } });
    } catch (caught) {
      handleProgramHeadError(caught);
    }
  }

  async function listProgramHeadSubjects(request, response, context, url) {
    const session = await requirePermission(request, context, "portal.access.program_head");
    try {
      const subjects = await programHeadStore.subjectCatalog(session.user.id, url.searchParams.get("query") ?? "");
      sendJson(response, 200, { data: { subjects } });
    } catch (caught) {
      handleProgramHeadError(caught);
    }
  }

  async function getProgramHeadStudent(request, response, context, studentId) {
    const session = await requirePermission(request, context, "portal.access.program_head");
    try {
      const student = await programHeadStore.studentDetail(session.user.id, studentId);
      sendJson(response, 200, { data: { student } });
    } catch (caught) {
      handleProgramHeadError(caught);
    }
  }

  async function createProgramHeadOffering(request, response, context) {
    const session = await requireStatePermission(request, context, "portal.access.program_head");
    const body = await readJson(request, config.bodyLimitBytes);
    try {
      const offering = await programHeadStore.createOffering(session.user.id, body);
      await audit(context, request, "program_head.offering_created", "success", {
        actorUserId: session.user.id,
        metadata: { offeringId: offering.id, subjectId: offering.subject.id, classSectionId: offering.classSection.id }
      });
      sendJson(response, 201, { data: { offering } });
    } catch (caught) {
      handleProgramHeadError(caught);
    }
  }

  async function getProgramHeadEnrollmentEvaluation(request, response, context, enrollmentId) {
    const session = await requirePermission(request, context, "portal.access.program_head");
    try {
      const evaluation = await programHeadStore.enrollmentEvaluation(session.user.id, enrollmentId);
      sendJson(response, 200, { data: { evaluation } });
    } catch (caught) {
      handleProgramHeadError(caught);
    }
  }

  async function approveProgramHeadEnrollmentEvaluation(request, response, context, enrollmentId) {
    const session = await requireStatePermission(request, context, "portal.access.program_head");
    const body = await readJson(request, config.bodyLimitBytes);
    try {
      const evaluation = await programHeadStore.approveEnrollmentEvaluation(session.user.id, enrollmentId, body);
      await audit(context, request, "program_head.enrollment_assessed", "success", {
        actorUserId: session.user.id,
        targetUserId: null,
        metadata: { enrollmentId, overrideItemIds: Array.isArray(body.overrideItemIds) ? body.overrideItemIds : [] }
      });
      sendJson(response, 200, { data: { evaluation } });
    } catch (caught) {
      handleProgramHeadError(caught);
    }
  }

  async function createProgramCurriculum(request, response, context) {
    const session = await requireStatePermission(request, context, "portal.access.program_head");
    const body = await readJson(request, config.bodyLimitBytes);
    try {
      const curriculum = await programHeadStore.createCurriculum(session.user.id, body);
      await audit(context, request, "program_head.curriculum_created", "success", {
        actorUserId: session.user.id,
        metadata: { curriculumId: curriculum.id, programId: curriculum.programId, code: curriculum.code }
      });
      sendJson(response, 201, { data: { curriculum } });
    } catch (caught) {
      const messages = {
        PROGRAM_HEAD_ASSIGNMENT_REQUIRED: [403, "PROGRAM_HEAD_ASSIGNMENT_REQUIRED", "This account is not assigned as a program head for any program."],
        FORBIDDEN: [403, "FORBIDDEN", "This curriculum is not managed by your assigned program."],
        CURRICULUM_CODE_INVALID: [422, "CURRICULUM_CODE_INVALID", "Use 1-50 letters, numbers, periods, underscores, or hyphens for the curriculum code."],
        CURRICULUM_NAME_INVALID: [422, "CURRICULUM_NAME_INVALID", "Enter a curriculum name of no more than 200 characters."],
        CURRICULUM_STATUS_INVALID: [422, "CURRICULUM_STATUS_INVALID", "Select a valid curriculum status."],
        CURRICULUM_VERSION_INVALID: [422, "CURRICULUM_VERSION_INVALID", "Enter a positive curriculum version number."],
        CURRICULUM_DUPLICATE: [409, "CURRICULUM_DUPLICATE", "A curriculum with this code and version already exists for the program."],
        EFFECTIVE_YEAR_INVALID: [422, "EFFECTIVE_YEAR_INVALID", "Enter a valid academic year for the curriculum effectivity window."]
      };
      const responseData = messages[caught.message];
      if (responseData) error(...responseData);
      throw caught;
    }
  }

  async function addProgramCurriculumSubject(request, response, context, curriculumId) {
    const session = await requireStatePermission(request, context, "portal.access.program_head");
    const body = await readJson(request, config.bodyLimitBytes);
    try {
      const entry = await programHeadStore.addSubject(session.user.id, curriculumId, body);
      await audit(context, request, "program_head.curriculum_subject_added", "success", {
        actorUserId: session.user.id,
        metadata: { curriculumId, subjectId: entry.subjectId, yearLevel: entry.yearLevel, termNumber: entry.termNumber }
      });
      sendJson(response, 201, { data: { entry } });
    } catch (caught) {
      const messages = {
        PROGRAM_HEAD_ASSIGNMENT_REQUIRED: [403, "PROGRAM_HEAD_ASSIGNMENT_REQUIRED", "This account is not assigned as a program head for any program."],
        CURRICULUM_NOT_FOUND: [404, "CURRICULUM_NOT_FOUND", "Curriculum not found."],
        CURRICULUM_LOCKED: [409, "CURRICULUM_LOCKED", "Published curriculum versions cannot be changed."],
        FORBIDDEN: [403, "FORBIDDEN", "This curriculum is not managed by your assigned program."],
        SUBJECT_NOT_FOUND: [404, "SUBJECT_NOT_FOUND", "Subject not found."],
        SUBJECT_ALREADY_ASSIGNED: [409, "SUBJECT_ALREADY_ASSIGNED", "This subject is already assigned to the curriculum."],
        CURRICULUM_SUBJECT_INVALID: [422, "CURRICULUM_SUBJECT_INVALID", "Provide valid subject placement, credits, and term information."]
      };
      const responseData = messages[caught.message];
      if (responseData) error(...responseData);
      throw caught;
    }
  }

  async function createRegistrarAcademicTerm(request, response, context) {
    const session = await requireStatePermission(request, context, "CREATE_ENROLLMENT_PERIOD");
    const body = await readJson(request, config.bodyLimitBytes);
    try {
      const term = await registrarStore.createAcademicTerm(body);
      await audit(context, request, "registrar.academic_term_created", "success", {
        actorUserId: session.user.id,
        metadata: { academicTermId: term.id, academicYearId: term.academicYearId, code: term.code }
      });
      sendJson(response, 201, { data: { term } });
    } catch (caught) {
      const messages = {
        ACADEMIC_YEAR_REQUIRED: [422, "ACADEMIC_YEAR_REQUIRED", "Select an academic year."],
        ACADEMIC_YEAR_NOT_FOUND: [404, "ACADEMIC_YEAR_NOT_FOUND", "The selected academic year is unavailable."],
        ACADEMIC_YEAR_INVALID: [422, "ACADEMIC_YEAR_INVALID", "Provide a valid academic year with code, name, and date range."],
        ACADEMIC_YEAR_DATES_INVALID: [422, "ACADEMIC_YEAR_DATES_INVALID", "Enter a valid academic year date range."],
        TERM_CODE_INVALID: [422, "TERM_CODE_INVALID", "Use 1-32 letters, numbers, periods, underscores, or hyphens for the term code."],
        TERM_NAME_INVALID: [422, "TERM_NAME_INVALID", "Enter a term name of no more than 100 characters."],
        TERM_NUMBER_INVALID: [422, "TERM_NUMBER_INVALID", "Enter a positive term sequence number."],
        TERM_DATES_INVALID: [422, "TERM_DATES_INVALID", "Enter a valid term date range."],
        ENROLLMENT_DATES_INVALID: [422, "ENROLLMENT_DATES_INVALID", "Enter both enrollment dates in chronological order."],
        TERM_OUTSIDE_ACADEMIC_YEAR: [422, "TERM_OUTSIDE_ACADEMIC_YEAR", "Term dates must fall within the selected academic year."],
        TERM_DUPLICATE: [409, "TERM_DUPLICATE", "A term with this code or sequence already exists in the academic year."]
      };
      const responseData = messages[caught.message];
      if (responseData) error(...responseData);
      throw caught;
    }
  }

  async function updateRegistrarAcademicTerm(request, response, context, termId) {
    const session = await requireStatePermission(request, context, "UPDATE_ENROLLMENT_PERIOD");
    const body = await readJson(request, config.bodyLimitBytes);
    try {
      const term = await registrarStore.updateAcademicTerm(termId, body);
      await audit(context, request, "registrar.academic_term_updated", "success", {
        actorUserId: session.user.id,
        metadata: { academicTermId: term.id, academicYearId: term.academicYearId, code: term.code }
      });
      sendJson(response, 200, { data: { term } });
    } catch (caught) {
      const messages = {
        TERM_NOT_FOUND: [404, "TERM_NOT_FOUND", "Academic term not found."],
        ACADEMIC_YEAR_NOT_FOUND: [404, "ACADEMIC_YEAR_NOT_FOUND", "The selected academic year is unavailable."],
        ACADEMIC_YEAR_INVALID: [422, "ACADEMIC_YEAR_INVALID", "Provide a valid academic year with code, name, and date range."],
        TERM_CODE_INVALID: [422, "TERM_CODE_INVALID", "Use 1-32 letters, numbers, periods, underscores, or hyphens for the term code."],
        TERM_NAME_INVALID: [422, "TERM_NAME_INVALID", "Enter a term name of no more than 100 characters."],
        TERM_NUMBER_INVALID: [422, "TERM_NUMBER_INVALID", "Enter a positive term sequence number."],
        TERM_DATES_INVALID: [422, "TERM_DATES_INVALID", "Enter a valid term date range."],
        ENROLLMENT_DATES_INVALID: [422, "ENROLLMENT_DATES_INVALID", "Enter both enrollment dates in chronological order."],
        TERM_OUTSIDE_ACADEMIC_YEAR: [422, "TERM_OUTSIDE_ACADEMIC_YEAR", "Term dates must fall within the selected academic year."],
        TERM_DUPLICATE: [409, "TERM_DUPLICATE", "A term with this code or sequence already exists in the academic year."]
      };
      const responseData = messages[caught.message];
      if (responseData) error(...responseData);
      throw caught;
    }
  }

  async function listRegistrarAcademicYears(request, response, context) {
    await requirePermission(request, context, "VIEW_ENROLLMENT_PERIOD");
    const years = await registrarStore.listAcademicYears();
    sendJson(response, 200, { data: { years } });
  }

  async function createRegistrarAcademicYear(request, response, context) {
    const session = await requireStatePermission(request, context, "CREATE_ENROLLMENT_PERIOD");
    const body = await readJson(request, config.bodyLimitBytes);
    try {
      const year = await registrarStore.createAcademicYear(body);
      await audit(context, request, "registrar.academic_year_created", "success", {
        actorUserId: session.user.id,
        metadata: { academicYearId: year.id, code: year.code }
      });
      sendJson(response, 201, { data: { year } });
    } catch (caught) {
      const messages = {
        ACADEMIC_YEAR_REQUIRED: [422, "ACADEMIC_YEAR_REQUIRED", "Select an academic year."],
        ACADEMIC_YEAR_CODE_INVALID: [422, "ACADEMIC_YEAR_CODE_INVALID", "Use 1-32 letters, numbers, periods, underscores, or hyphens for the academic year code."],
        ACADEMIC_YEAR_NAME_INVALID: [422, "ACADEMIC_YEAR_NAME_INVALID", "Enter an academic year name of no more than 100 characters."],
        ACADEMIC_YEAR_DATES_INVALID: [422, "ACADEMIC_YEAR_DATES_INVALID", "Enter a valid academic year date range."],
        ACADEMIC_YEAR_STATUS_INVALID: [422, "ACADEMIC_YEAR_STATUS_INVALID", "Choose a valid academic year status."],
        ACADEMIC_YEAR_DUPLICATE: [409, "ACADEMIC_YEAR_DUPLICATE", "An academic year with this code already exists."]
      };
      const responseData = messages[caught.message];
      if (responseData) error(...responseData);
      throw caught;
    }
  }

  async function updateRegistrarAcademicYear(request, response, context, yearId) {
    const session = await requireStatePermission(request, context, "UPDATE_ENROLLMENT_PERIOD");
    const body = await readJson(request, config.bodyLimitBytes);
    try {
      const year = await registrarStore.updateAcademicYear(yearId, body);
      await audit(context, request, "registrar.academic_year_updated", "success", {
        actorUserId: session.user.id,
        metadata: { academicYearId: year.id, code: year.code }
      });
      sendJson(response, 200, { data: { year } });
    } catch (caught) {
      const messages = {
        ACADEMIC_YEAR_NOT_FOUND: [404, "ACADEMIC_YEAR_NOT_FOUND", "Academic year not found."],
        ACADEMIC_YEAR_CODE_INVALID: [422, "ACADEMIC_YEAR_CODE_INVALID", "Use 1-32 letters, numbers, periods, underscores, or hyphens for the academic year code."],
        ACADEMIC_YEAR_NAME_INVALID: [422, "ACADEMIC_YEAR_NAME_INVALID", "Enter an academic year name of no more than 100 characters."],
        ACADEMIC_YEAR_DATES_INVALID: [422, "ACADEMIC_YEAR_DATES_INVALID", "Enter a valid academic year date range."],
        ACADEMIC_YEAR_STATUS_INVALID: [422, "ACADEMIC_YEAR_STATUS_INVALID", "Choose a valid academic year status."],
        ACADEMIC_YEAR_DUPLICATE: [409, "ACADEMIC_YEAR_DUPLICATE", "An academic year with this code already exists."]
      };
      const responseData = messages[caught.message];
      if (responseData) error(...responseData);
      throw caught;
    }
  }

  async function requestAcademicTermRemoval(request, response, context, termId) {
    const session = await requireStatePermission(request, context, "CREATE_ENROLLMENT_PERIOD");
    const body = await readJson(request, config.bodyLimitBytes);
    try {
      const created = await registrarStore.requestAcademicTermRemoval(session.user.id, termId, body.reason);
      await audit(context, request, "registrar.academic_term_removal_requested", "success", {
        actorUserId: session.user.id,
        metadata: { academicTermId: termId, requestId: created.id }
      });
      sendJson(response, 201, { data: { request: created } });
    } catch (caught) {
      if (caught.message === "TERM_NOT_FOUND") error(404, "TERM_NOT_FOUND", "Academic term not found.");
      if (caught.message === "REMOVAL_REASON_REQUIRED") error(422, "REMOVAL_REASON_REQUIRED", "A removal reason is required.");
      throw caught;
    }
  }

  async function requestAcademicYearRemoval(request, response, context, yearId) {
    const session = await requireStatePermission(request, context, "CREATE_ENROLLMENT_PERIOD");
    const body = await readJson(request, config.bodyLimitBytes);
    try {
      const created = await registrarStore.requestAcademicYearRemoval(session.user.id, yearId, body.reason);
      await audit(context, request, "registrar.academic_year_removal_requested", "success", {
        actorUserId: session.user.id,
        metadata: { academicYearId: yearId, requestId: created.id }
      });
      sendJson(response, 201, { data: { request: created } });
    } catch (caught) {
      if (caught.message === "ACADEMIC_YEAR_NOT_FOUND") error(404, "ACADEMIC_YEAR_NOT_FOUND", "Academic year not found.");
      if (caught.message === "REMOVAL_REASON_REQUIRED") error(422, "REMOVAL_REASON_REQUIRED", "A removal reason is required.");
      throw caught;
    }
  }

  async function listAcademicTermRemovalRequests(request, response, context) {
    await requirePermission(request, context, "users.manage");
    const requests = await registrarStore.listAcademicTermRemovalRequests();
    sendJson(response, 200, { data: { requests } });
  }

  async function listAcademicYearRemovalRequests(request, response, context) {
    await requirePermission(request, context, "users.manage");
    const requests = await registrarStore.listAcademicYearRemovalRequests();
    sendJson(response, 200, { data: { requests } });
  }

  async function resolveAcademicTermRemovalRequest(request, response, context, requestId) {
    const session = await requireStatePermission(request, context, "users.manage");
    const body = await readJson(request, config.bodyLimitBytes);
    try {
      const result = await registrarStore.resolveAcademicTermRemovalRequest(requestId, session.user.id, body.outcome, body.remarks);
      await audit(context, request, "registrar.academic_term_removal_decision", "success", {
        actorUserId: session.user.id,
        metadata: { requestId, outcome: result.outcome, academicTermId: result.academicTermId }
      });
      sendJson(response, 200, { data: { request: result } });
    } catch (caught) {
      if (caught.message === "REQUEST_NOT_FOUND") error(404, "REQUEST_NOT_FOUND", "Removal request not found.");
      if (caught.message === "REQUEST_ALREADY_DECIDED") error(409, "REQUEST_ALREADY_DECIDED", "This removal request was already decided.");
      if (caught.message === "INVALID_OUTCOME") error(422, "INVALID_OUTCOME", "Outcome must be APPROVED or REJECTED.");
      if (caught.message === "APPROVAL_REMARKS_REQUIRED") error(422, "APPROVAL_REMARKS_REQUIRED", "Approval requires remarks.");
      if (caught.message === "TERM_NOT_FOUND") error(404, "TERM_NOT_FOUND", "Academic term not found.");
      throw caught;
    }
  }

  async function resolveAcademicYearRemovalRequest(request, response, context, requestId) {
    const session = await requireStatePermission(request, context, "users.manage");
    const body = await readJson(request, config.bodyLimitBytes);
    try {
      const result = await registrarStore.resolveAcademicYearRemovalRequest(requestId, session.user.id, body.outcome, body.remarks);
      await audit(context, request, "registrar.academic_year_removal_decision", "success", {
        actorUserId: session.user.id,
        metadata: { requestId, outcome: result.outcome, academicYearId: result.academicYearId }
      });
      sendJson(response, 200, { data: { request: result } });
    } catch (caught) {
      if (caught.message === "REQUEST_NOT_FOUND") error(404, "REQUEST_NOT_FOUND", "Removal request not found.");
      if (caught.message === "REQUEST_ALREADY_DECIDED") error(409, "REQUEST_ALREADY_DECIDED", "This removal request was already decided.");
      if (caught.message === "INVALID_OUTCOME") error(422, "INVALID_OUTCOME", "Outcome must be APPROVED or REJECTED.");
      if (caught.message === "APPROVAL_REMARKS_REQUIRED") error(422, "APPROVAL_REMARKS_REQUIRED", "Approval requires remarks.");
      if (caught.message === "ACADEMIC_YEAR_NOT_FOUND") error(404, "ACADEMIC_YEAR_NOT_FOUND", "Academic year not found.");
      throw caught;
    }
  }

  async function registrarApplications(request, response, context, url) {
    await requirePermission(request, context, "VIEW_STUDENT_APPLICATION");
    const statusFilter = url.searchParams.get("status");
    const allowedFilters = new Set(["PENDING", "APPROVED", "RETURNED_FOR_CORRECTION", "REJECTED"]);
    if (statusFilter && !allowedFilters.has(statusFilter)) {
      error(422, "APPLICATION_STATUS_FILTER_INVALID", "Choose a recognized application status filter.");
    }
    const applications = statusFilter
      ? await registrarStore.applications(statusFilter)
      : await registrarStore.applications();
    sendJson(response, 200, { data: { applications } });
  }

  async function registrarApplicationReview(request, response, context, applicationId) {
    const session = await requirePermission(request, context, "VIEW_STUDENT_APPLICATION");
    await requirePermission(request, context, "VIEW_DOCUMENTS");
    try {
      const review = await registrarStore.applicationReview(applicationId);
      if (!review) error(404, "APPLICATION_NOT_FOUND", "Student application not found.");
      await registrarStore.recordView(applicationId, session.user.id, publicUser(session.user).primaryRole);

      review.documents = await documentStore.getApplicationDocumentSummary(applicationId);

      await audit(context, request, "registrar.application_viewed", "success", {
        actorUserId: session.user.id,
        metadata: { applicationId }
      });
      sendJson(response, 200, { data: review });
    } catch (caught) {
      if (caught instanceof HttpError) throw caught;
      if (!config.isTest) {
        const details = caught instanceof Error ? caught.stack || caught.message : String(caught);
        process.stderr.write(`Registrar application review ${context.requestId} failed: ${details}\n`);
      }
      error(500, "APPLICATION_REVIEW_FAILED", "The application review could not be loaded. Please try again.");
    }
  }

  async function updateRegistrarApplication(request, response, context, applicationId) {
    const body = await readJson(request, config.bodyLimitBytes);
    const validStatuses = ["APPROVED", "REJECTED", "RETURNED_FOR_CORRECTION"];
    if (!validStatuses.includes(body.status)) {
      error(422, "APPLICATION_STATUS_INVALID", "Application status must be APPROVED, REJECTED, or RETURNED_FOR_CORRECTION.");
    }
    const permission = body.status === "REJECTED" ? "REJECT_STUDENT_APPLICATION" : "APPROVE_STUDENT_APPLICATION";
    const session = await requireStatePermission(request, context, permission);
    try {
      const application = await registrarStore.updateApplication(
        applicationId,
        session.user.id,
        publicUser(session.user).primaryRole,
        body.status,
        body.decisionNotes,
        body.sectionAssignments
      );
      await audit(context, request, "registrar.application_decided", "success", { actorUserId: session.user.id, metadata: { applicationId, status: body.status } });
      sendJson(response, 200, { data: { application } });
    } catch (caught) {
      if (caught.message === "APPLICATION_NOT_FOUND") error(404, "APPLICATION_NOT_FOUND", "Student application not found.");
      if (caught.message === "PROGRAM_HEAD_APPROVAL_REQUIRED") error(409, "PROGRAM_HEAD_APPROVAL_REQUIRED", "The Program Head must approve the subject enrollment before Registrar verification.");
      if (caught.message === "SECTION_ASSIGNMENTS_INVALID") error(422, "SECTION_ASSIGNMENTS_INVALID", "Select one valid open section for every approved subject in the same program, curriculum, year, and term.");
      if (caught.message === "SECTION_UNAVAILABLE") error(409, "SECTION_UNAVAILABLE", "A selected section is full. Refresh and choose another section.");
      if (caught.message === "ENROLLMENT_ALREADY_EXISTS") error(409, "ENROLLMENT_ALREADY_EXISTS", "An official enrollment already exists for this student and term.");
      if (caught.code === "P2002" || caught.code === "P2034") error(409, "APPLICATION_CONFLICT", "The enrollment changed during review. Refresh and try again.");
      if (caught.message === "DECISION_NOTES_REQUIRED") error(422, "DECISION_NOTES_REQUIRED", "Feedback or a rejection reason is required for this action.");
      if (caught.message === "APPLICATION_LOCKED") error(409, "APPLICATION_LOCKED", "Approved, rejected, or returned applications cannot be decided again.");
      if (caught.message === "APPLICATION_CONFLICT") error(409, "APPLICATION_CONFLICT", "The application changed while it was being reviewed. Refresh and try again.");
      if (caught.message === "ENTRANCE_FEE_REQUIRED") error(402, "ENTRANCE_FEE_REQUIRED", "The enrollment fee for this academic term must be paid and verified before approval.");
      if (caught.message === "ENTRANCE_FEE_NOT_CONFIGURED") error(503, "ENTRANCE_FEE_NOT_CONFIGURED", "The entrance fee is not configured.");
      throw caught;
    }
  }

  async function viewRegistrarDocument(request, response, context, documentId) {
    const session = await requirePermission(request, context, "VIEW_DOCUMENTS");
    const document = await documentStore.getDocumentForView(documentId);
    if (!document?.filePath) error(404, "DOCUMENT_NOT_FOUND", "The submitted document is not available.");

    const storageRoot = resolve(config.documentRoot);
    const filePath = resolve(storageRoot, document.filePath);
    if (filePath !== storageRoot && !filePath.startsWith(`${storageRoot}${sep}`)) {
      await audit(context, request, "registrar.document_path_rejected", "failure", {
        actorUserId: session.user.id,
        metadata: { documentId }
      });
      error(403, "DOCUMENT_PATH_INVALID", "The document path was rejected.");
    }

    try {
      const body = await documentStorage.readFile(document.filePath);
      const extension = extname(document.originalFileName || document.storedFileName || filePath).toLowerCase();
      const contentType = document.mimeType || DOCUMENT_CONTENT_TYPES.get(extension) || "application/octet-stream";
      const safeName = String(document.originalFileName || `${document.documentType?.name || "document"}${extension}`)
        .replace(/[\r\n"]/g, "_")
        .slice(0, 180);
      await audit(context, request, "registrar.document_viewed", "success", {
        actorUserId: session.user.id,
        metadata: { documentId, applicationId: document.admissionApplicationId }
      });
      response.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": body.length,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(safeName)}`,
        "Cache-Control": "private, no-store",
        "X-Frame-Options": "SAMEORIGIN",
        "Content-Security-Policy": "default-src 'none'; frame-ancestors 'self'",
        "Cross-Origin-Resource-Policy": "same-origin"
      });
      if (request.method === "HEAD") response.end();
      else response.end(body);
    } catch (caught) {
      if (caught?.code === "ENOENT") error(404, "DOCUMENT_FILE_MISSING", "The document file could not be found.");
      throw caught;
    }
  }

  async function updateRegistrarDocument(request, response, context, documentId) {
    const session = await requireStatePermission(request, context, "VERIFY_DOCUMENTS");
    const body = await readJson(request, config.bodyLimitBytes);
    if (!["VERIFIED", "REJECTED", "RETURNED_FOR_CORRECTION"].includes(body.status)) error(422, "DOCUMENT_STATUS_INVALID", "Document status must be VERIFIED, REJECTED, or RETURNED_FOR_CORRECTION.");
    try {
      const document = await documentStore.updateDocumentStatus(
        documentId,
        session.user.id,
        publicUser(session.user).primaryRole,
        body.status,
        body.remarks
      );
      await audit(context, request, "registrar.document_reviewed", "success", { actorUserId: session.user.id, metadata: { documentId, status: body.status } });
      sendJson(response, 200, { data: { document } });
    } catch (caught) {
      if (caught.message === "DOCUMENT_NOT_FOUND") error(404, "DOCUMENT_NOT_FOUND", "Document not found.");
      if (caught.message === "APPLICATION_LOCKED") error(409, "APPLICATION_LOCKED", "Documents cannot be changed after the application is decided.");
      if (caught.message === "INVALID_DOCUMENT_STATUS") error(422, "DOCUMENT_STATUS_INVALID", "Invalid document status.");
      throw caught;
    }
  }

  async function openRegistrarPeriod(request, response, context) {
    const session = await requireStatePermission(request, context, "OPEN_ENROLLMENT");
    const body = await readJson(request, config.bodyLimitBytes);
    if (typeof body.academicTermId !== "string" || !body.academicTermId) {
      error(422, "TERM_REQUIRED", "Select an academic term.");
    }
    try {
      const period = await registrarStore.openPeriod(session.user.id, body.academicTermId);
      await audit(context, request, "registrar.enrollment_opened", "success", {
        actorUserId: session.user.id, metadata: { periodId: period.id, academicTermId: body.academicTermId }
      });
      sendJson(response, 200, { data: { period } });
    } catch (caught) {
      if (caught.message === "TERM_NOT_FOUND") error(404, "TERM_NOT_FOUND", "Academic term not found.");
      if (caught.message === "TERM_NOT_AVAILABLE") error(409, "TERM_NOT_AVAILABLE", "This academic term is not available for enrollment.");
      if (caught.message === "PERIOD_ALREADY_OPEN") error(409, "PERIOD_ALREADY_OPEN", "Close the currently open enrollment period before opening another term.");
      if (caught.message === "ENTRANCE_FEE_NOT_CONFIGURED") error(503, "ENTRANCE_FEE_NOT_CONFIGURED", "The entrance fee is not configured.");
      throw caught;
    }
  }

  async function closeRegistrarPeriod(request, response, context) {
    const session = await requireStatePermission(request, context, "CLOSE_ENROLLMENT");
    const body = await readJson(request, config.bodyLimitBytes);
    if (typeof body.periodId !== "string" || !body.periodId) error(422, "PERIOD_REQUIRED", "Enrollment period is required.");
    try {
      const period = await registrarStore.closePeriod(session.user.id, body.periodId);
      await audit(context, request, "registrar.enrollment_closed", "success", {
        actorUserId: session.user.id, metadata: { periodId: period.id }
      });
      sendJson(response, 200, { data: { period } });
    } catch (caught) {
      if (caught.message === "PERIOD_NOT_FOUND") error(404, "PERIOD_NOT_FOUND", "Enrollment period not found.");
      if (caught.message === "PERIOD_NOT_OPEN") error(409, "PERIOD_NOT_OPEN", "The enrollment period is not open.");
      throw caught;
    }
  }

  async function portalHtml(request, response, context, requestedRole = null) {
    const existingSession = await loadSession(request, context);
    if (!existingSession?.user && acceptsBrowserHtml(request)) {
      await audit(context, request, "authentication.session", "redirected");
      sendPortalSigninRedirect(response, context.pathname);
      return;
    }
    let role = requestedRole;
    if (!role) {
      const session = await requireAuthentication(request, context, { allowMustChange: true });
      const user = publicUser(session.user);
      role = ROLE_DEFINITIONS.find((candidate) => candidate.slug === user.primaryRole) ?? null;
      if (!role) error(403, "FORBIDDEN", "This account has no portal role assigned.");
    }
    await requirePermission(request, context, `portal.access.${role.slug}`, { allowMustChange: true });
    try {
      const body = await readFile(join(config.publicRoot, "portal.html"));
      response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Length": body.length,
        "Cache-Control": "no-store"
      });
      response.end(body);
    } catch (caught) {
      if (caught?.code === "ENOENT") error(404, "NOT_FOUND", "Resource not found.");
      throw caught;
    }
  }

  async function portalApi(request, response, context, role) {
    const session = await requirePermission(request, context, `portal.access.${role.slug}`);
    sendJson(response, 200, {
      data: {
        role: role.slug,
        name: role.name,
        message: "Account access is ready. Academic services are outside Phase 2.",
        user: publicUser(session.user)
      }
    });
  }

  async function studentDashboard(request, response, context) {
    const session = await requirePermission(request, context, "portal.access.student");
    const dashboard = await studentStore.forUser(session.user.id);
    sendJson(response, 200, { data: { dashboard } });
  }

  async function studentProfile(request, response, context) {
    const session = await requirePermission(request, context, "portal.access.student");
    const profile = await studentStore.getProfile(session.user.id);
    if (!profile) error(404, "STUDENT_NOT_FOUND", "No student profile is linked to this account.");
    sendJson(response, 200, { data: { profile } });
  }

  async function updateStudentProfile(request, response, context) {
    const session = await requireStatePermission(request, context, "portal.access.student");
    const body = await readJson(request, config.bodyLimitBytes);
    const email = validateEmail(body.institutionalEmail);
    const dateOfBirth = typeof body.dateOfBirth === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.dateOfBirth)
      ? body.dateOfBirth
      : undefined;

    const profile = await studentStore.updateProfile(session.user.id, {
      institutionalEmail: email ?? undefined,
      dateOfBirth
    });
    if (!profile) error(404, "STUDENT_NOT_FOUND", "No student profile is linked to this account.");

    await audit(context, request, "student.profile_updated", "success", {
      actorUserId: session.user.id,
      targetUserId: session.user.id,
      metadata: { institutionalEmail: email }
    });

    sendJson(response, 200, { data: { profile } });
  }

  async function studentRequestTypes(request, response, context) {
    await requirePermission(request, context, "portal.access.student");
    const requestTypes = await studentStore.listRequestTypes();
    sendJson(response, 200, { data: { requestTypes } });
  }

  async function listStudentRequests(request, response, context) {
    const session = await requirePermission(request, context, "portal.access.student");
    const requests = await studentStore.listRequests(session.user.id);
    sendJson(response, 200, { data: { requests } });
  }

  async function submitStudentRequest(request, response, context) {
    const session = await requireStatePermission(request, context, "portal.access.student");
    const body = await readJson(request, config.bodyLimitBytes);
    if (!body.requestCode && !body.requestTypeId) {
      error(422, "REQUEST_TYPE_REQUIRED", "Select a valid request type.");
    }
    const copies = Math.max(1, Math.min(Number(body.copies) || 1, 10));
    const purpose = typeof body.purpose === "string" ? body.purpose.trim() : "";
    if (purpose.length > 500) {
      error(422, "PURPOSE_TOO_LONG", "Purpose must not exceed 500 characters.");
    }

    try {
      const created = await studentStore.submitRequest(session.user.id, {
        requestTypeId: body.requestTypeId,
        requestCode: body.requestCode,
        purpose,
        copies
      });

      await audit(context, request, "student.request_submitted", "success", {
        actorUserId: session.user.id,
        targetUserId: session.user.id,
        metadata: { requestNumber: created.requestNumber, requestCode: created.requestType.code }
      });

      sendJson(response, 201, { data: { request: created } });
    } catch (caught) {
      if (caught.message === "STUDENT_PROFILE_REQUIRED") {
        error(404, "STUDENT_NOT_FOUND", "No student profile is linked to this account.");
      }
      if (caught.message === "REQUEST_TYPE_INVALID") {
        error(422, "REQUEST_TYPE_INVALID", "The selected request type is not recognized or active.");
      }
      throw caught;
    }
  }

  async function enrollmentApplicationOptions(request, response, context) {
    const session = await requirePermission(request, context, "portal.access.student");
    sendJson(response, 200, { data: await enrollmentApplicationStore.options(session.user.id) });
  }

  async function getEnrollmentApplication(request, response, context) {
    const session = await requirePermission(request, context, "portal.access.student");
    const application = await enrollmentApplicationStore.getForUser(session.user.id);
    if (!application) error(404, "STUDENT_NOT_FOUND", "No student profile is linked to this account.");
    sendJson(response, 200, { data: application });
  }

  async function saveEnrollmentApplication(request, response, context, submit = false) {
    const session = await requireStatePermission(request, context, "portal.access.student");
    const body = await readJson(request, config.bodyLimitBytes);
    try {
      const application = await enrollmentApplicationStore.save(session.user.id, body, submit);
      await audit(context, request, submit ? "student.enrollment_submitted" : "student.enrollment_saved", "success", {
        actorUserId: session.user.id,
        targetUserId: session.user.id,
        metadata: { applicationId: application.id, status: application.status }
      });
      sendJson(response, 200, { data: { application } });
    } catch (caught) {
      const messages = {
        STUDENT_PROFILE_REQUIRED: [404, "STUDENT_NOT_FOUND", "No student profile is linked to this account."],
        APPLICATION_LOCKED: [409, "APPLICATION_LOCKED", "This application cannot be edited in its current status."],
        PROGRAM_INVALID: [422, "PROGRAM_INVALID", "Select an active program."],
        TERM_INVALID: [422, "TERM_INVALID", "Select an available academic term."],
        ENROLLMENT_CLOSED: [409, "ENROLLMENT_CLOSED", "Enrollment is not open for the selected academic term."],
        ENTRANCE_FEE_REQUIRED: [402, "ENTRANCE_FEE_REQUIRED", "Pay and verify the entrance fee before submitting enrollment."],
        ENTRANCE_FEE_NOT_CONFIGURED: [503, "ENTRANCE_FEE_NOT_CONFIGURED", "The entrance fee is not configured."],
        SUBJECT_SELECTION_INVALID: [422, "SUBJECT_SELECTION_INVALID", "Select only subjects from the curriculum for the chosen program, year, and term."],
        SUBJECT_SELECTION_REQUIRED: [422, "SUBJECT_SELECTION_REQUIRED", "Select at least one subject before submitting your enrollment."],
        PREREQUISITE_NOT_MET: [422, "PREREQUISITE_NOT_MET", "One or more selected subjects have prerequisites that are failed, incomplete, or not yet taken."],
        YEAR_LEVEL_INVALID: [422, "YEAR_LEVEL_INVALID", "Select a valid year level."],
        FORM_INCOMPLETE: [422, "FORM_INCOMPLETE", "Complete all required enrollment information before submitting."],
        FORM_TOO_LARGE: [413, "FORM_TOO_LARGE", "The enrollment form is too large. Remove some content and try again."]
      };
      const responseData = messages[caught.message];
      if (responseData) error(...responseData);
      throw caught;
    }
  }

  async function listDocumentTypes(request, response, context) {
    await requirePermission(request, context, "portal.access.student");
    const types = await documentStore.listDocumentTypes();
    sendJson(response, 200, { data: { documentTypes: types } });
  }

  async function listStudentDocuments(request, response, context) {
    const session = await requirePermission(request, context, "portal.access.student");
    const appInfo = await documentStore.getStudentApplication(session.user.id);
    if (!appInfo?.student) error(404, "STUDENT_NOT_FOUND", "No student profile is linked to this account.");
    const documents = await documentStore.getStudentDocuments(appInfo.student.id, appInfo.application?.id ?? null);
    sendJson(response, 200, { data: { documents } });
  }

  async function parseMultipartFormData(request, maxFileSize) {
    const contentType = request.headers["content-type"] || "";
    const boundaryMatch = contentType.match(/boundary=([^;]+)/);
    if (!boundaryMatch) throw new Error("INVALID_MULTIPART");
    const boundary = boundaryMatch[1];

    const chunks = [];
    for await (const chunk of request) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    if (buffer.length > maxFileSize) throw new Error("FILE_TOO_LARGE");

    const bodyBuffer = buffer.toString("binary");
    const parts = bodyBuffer.split(`--${boundary}`);

    const fields = {};
    let file = null;

    for (const part of parts) {
      if (!part.trim() || part.trim() === "--") continue;
      const headerEnd = part.indexOf("\r\n\r\n");
      if (headerEnd === -1) continue;
      const headers = part.slice(0, headerEnd);
      const content = part.slice(headerEnd + 4).replace(/\r\n$/, "");

      const nameMatch = headers.match(/name="([^"]+)"/);
      if (!nameMatch) continue;
      const name = nameMatch[1];

      const filenameMatch = headers.match(/filename="([^"]+)"/);
      if (filenameMatch) {
        const contentTypeMatch = headers.match(/Content-Type: ([^\r\n]+)/);
        file = {
          fieldName: name,
          originalName: filenameMatch[1],
          mimeType: contentTypeMatch ? contentTypeMatch[1].trim() : null,
          buffer: Buffer.from(content, "binary")
        };
      } else {
        fields[name] = content;
      }
    }
    return { fields, file };
  }

  async function uploadStudentDocument(request, response, context) {
    const session = await requireStatePermission(request, context, "UPLOAD_DOCUMENTS");
    const maxFileSize = documentStorage.getMaxFileSize();

    let fields, file;
    try {
      const parsed = await parseMultipartFormData(request, maxFileSize);
      fields = parsed.fields;
      file = parsed.file;
    } catch (caught) {
      if (caught.message === "FILE_TOO_LARGE") error(413, "FILE_TOO_LARGE", "The uploaded file exceeds the maximum allowed size.");
      if (caught.message === "INVALID_MULTIPART") error(400, "INVALID_MULTIPART", "Invalid multipart form data.");
      throw caught;
    }

    const documentTypeId = fields.documentTypeId;
    const applicationId = fields.applicationId;

    if (!documentTypeId || !applicationId) {
      error(422, "MISSING_FIELDS", "documentTypeId and applicationId are required.");
    }
    if (!file) {
      error(422, "FILE_REQUIRED", "A file must be uploaded.");
    }

    const docType = await documentStore.getDocumentType(documentTypeId);
    if (!docType) error(422, "DOCUMENT_TYPE_INVALID", "Invalid document type.");

    const appInfo = await documentStore.getStudentApplication(session.user.id);
    if (!appInfo?.student) error(404, "STUDENT_NOT_FOUND", "No student profile is linked to this account.");
    if (appInfo.application?.id !== applicationId) error(403, "APPLICATION_MISMATCH", "Document does not belong to your application.");

    let validation;
    try {
      validation = documentStorage.validateFile(file);
    } catch (caught) {
      if (caught.message === "FILE_EMPTY") error(422, "FILE_EMPTY", "The selected file is empty.");
      if (caught.message === "FILE_TOO_LARGE") error(413, "FILE_TOO_LARGE", "The uploaded file exceeds the 10 MB limit.");
      if (caught.message === "INVALID_FILE_EXTENSION") {
        error(415, "INVALID_FILE_EXTENSION", "Upload a PDF, PNG, JPG, or JPEG file.");
      }
      if (caught.message === "INVALID_MIME_TYPE" || caught.message === "FILE_CONTENT_MISMATCH") {
        error(415, "INVALID_FILE_TYPE", "The file contents must be a valid PDF, PNG, JPG, or JPEG document.");
      }
      throw caught;
    }
    const storedFileName = documentStorage.generateStoredFileName(file.originalName, validation.extension);
    const relativePath = documentStorage.generateFilePath(appInfo.student.studentNumber, appInfo.application.applicationNumber, storedFileName);
    await documentStorage.saveFile(relativePath, file.buffer);

    let document;
    try {
      document = await documentStore.uploadDocument({
        studentId: appInfo.student.id,
        applicationId,
        documentTypeId,
        originalFileName: file.originalName,
        storedFileName,
        filePath: relativePath,
        fileSize: file.buffer.length,
        mimeType: validation.mimeType,
        uploadedByUserId: session.user.id
      });
    } catch (caught) {
      await documentStorage.deleteFile(relativePath).catch(() => {});
      if (caught.message === "DOCUMENT_VERIFIED_LOCKED") {
        error(409, "DOCUMENT_VERIFIED_LOCKED", "A verified document cannot be replaced.");
      }
      throw caught;
    }

    await audit(context, request, "student.document_uploaded", "success", {
      actorUserId: session.user.id,
      metadata: { documentId: document.id, documentType: docType.name, applicationId }
    });

    sendJson(response, 201, { data: { document } });
  }

  async function deleteStudentDocument(request, response, context, documentId) {
    const session = await requireStatePermission(request, context, "MANAGE_OWN_DOCUMENTS");
    try {
      await documentStore.deleteDocument(documentId, session.user.id);
      await audit(context, request, "student.document_deleted", "success", {
        actorUserId: session.user.id,
        metadata: { documentId }
      });
      sendJson(response, 200, { data: { success: true } });
    } catch (caught) {
      if (caught.message === "DOCUMENT_NOT_FOUND") error(404, "DOCUMENT_NOT_FOUND", "Document not found.");
      if (caught.message === "DOCUMENT_CANNOT_BE_DELETED") error(403, "DOCUMENT_CANNOT_BE_DELETED", "This document cannot be deleted in its current state.");
      throw caught;
    }
  }

  async function viewStudentDocument(request, response, context, documentId) {
    const session = await requirePermission(request, context, "portal.access.student");
    const document = await documentStore.getDocumentById(documentId);
    if (!document || document.student.userId !== session.user.id) {
      error(404, "DOCUMENT_NOT_FOUND", "Document not found.");
    }
    if (!document.filePath) error(404, "DOCUMENT_NOT_FOUND", "Document file not available.");

    const storageRoot = resolve(config.documentRoot);
    const filePath = resolve(storageRoot, document.filePath);
    if (filePath !== storageRoot && !filePath.startsWith(`${storageRoot}${sep}`)) {
      error(403, "DOCUMENT_PATH_INVALID", "The document path was rejected.");
    }

    try {
      const body = await documentStorage.readFile(document.filePath);
      const extension = extname(document.originalFileName || document.storedFileName || filePath).toLowerCase();
      const contentType = document.mimeType || DOCUMENT_CONTENT_TYPES.get(extension) || "application/octet-stream";
      const safeName = String(document.originalFileName || `${document.documentType?.name || "document"}${extension}`)
        .replace(/[\r\n"]/g, "_")
        .slice(0, 180);
      await audit(context, request, "student.document_viewed", "success", {
        actorUserId: session.user.id,
        metadata: { documentId }
      });
      response.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": body.length,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(safeName)}`,
        "Cache-Control": "private, no-store"
      });
      if (request.method === "HEAD") response.end();
      else response.end(body);
    } catch (caught) {
      if (caught?.code === "ENOENT") error(404, "DOCUMENT_FILE_MISSING", "The document file could not be found.");
      throw caught;
    }
  }

  async function serveStatic(request, response, pathname) {
    const definition = STATIC_FILES.get(pathname);
    if (!definition) return false;
    try {
      const body = await readFile(join(config.publicRoot, definition.relativePath));
      response.writeHead(200, {
        "Content-Type": definition.type,
        "Content-Length": body.length,
        "Cache-Control": definition.cache ? "public, max-age=86400, immutable" : "no-cache"
      });
      if (request.method === "HEAD") response.end();
      else response.end(body);
    } catch (caught) {
      if (caught?.code === "ENOENT") error(404, "NOT_FOUND", "Resource not found.");
      throw caught;
    }
    return true;
  }

  async function handleFinancialRoutes(request, response, context, url, pathname, method) {
    console.log('[DEBUG] handleFinancialRoutes called:', method, pathname);
    context.prisma = database;
    context.url = url;
    context.readJson = (req) => readJson(req, config.bodyLimitBytes);
    context.sendJson = sendJson;
    context.config = config;

    context.requirePermission = async (permission, options) => {
      const session = await requireAuthentication(request, context, options);
      const permissions = new Set((await store.permissionsForUser(session.user.id)).map((entry) => entry.slug));
      if (!permissions.has(permission)) {
        await audit(context, request, "authorization.denied", "failure", {
          actorUserId: session.user.id,
          metadata: { permission }
        });
        error(403, "FORBIDDEN", "Your account does not have permission to perform this action.");
      }
      return {
        ...session,
        user: { ...session.user, permissions: [...permissions] }
      };
    };

    context.requireStatePermission = async (permission) => {
      await requireCsrf(request, context);
      return context.requirePermission(permission);
    };

    const routes = [
      { method: 'GET', pattern: '^/api/v1/financial/payment-types$', handler: async () => {
        const { ObligationController } = await import("./modules/financial/controllers/obligationController.mjs");
        const ctrl = new ObligationController(financialService);
        return ctrl.getPaymentTypes(request, response, context);
      }},
      { method: 'GET', pattern: '^/api/v1/financial/payment-types/([0-9a-f-]{36})$', handler: async (match) => {
        const { ObligationController } = await import("./modules/financial/controllers/obligationController.mjs");
        const ctrl = new ObligationController(financialService);
        return ctrl.getPaymentType(request, response, context, match[1]);
      }},
      { method: 'POST', pattern: '^/api/v1/financial/payment-types$', handler: async () => {
        const { ObligationController } = await import("./modules/financial/controllers/obligationController.mjs");
        const ctrl = new ObligationController(financialService);
        return ctrl.createPaymentType(request, response, context);
      }},
      { method: 'PUT', pattern: '^/api/v1/financial/payment-types/([0-9a-f-]{36})$', handler: async (match) => {
        const { ObligationController } = await import("./modules/financial/controllers/obligationController.mjs");
        const ctrl = new ObligationController(financialService);
        return ctrl.updatePaymentType(request, response, context, match[1]);
      }},
      { method: 'DELETE', pattern: '^/api/v1/financial/payment-types/([0-9a-f-]{36})$', handler: async (match) => {
        const { ObligationController } = await import("./modules/financial/controllers/obligationController.mjs");
        const ctrl = new ObligationController(financialService);
        return ctrl.deactivatePaymentType(request, response, context, match[1]);
      }},
      { method: 'GET', pattern: '^/api/v1/financial/obligations$', handler: async () => {
        const { ObligationController } = await import("./modules/financial/controllers/obligationController.mjs");
        const ctrl = new ObligationController(financialService);
        return ctrl.getStudentObligations(request, response, context);
      }},
      { method: 'GET', pattern: '^/api/v1/financial/obligations/([0-9a-f-]{36})$', handler: async (match) => {
        const { ObligationController } = await import("./modules/financial/controllers/obligationController.mjs");
        const ctrl = new ObligationController(financialService);
        return ctrl.getStudentObligation(request, response, context, match[1]);
      }},
      { method: 'POST', pattern: '^/api/v1/financial/obligations$', handler: async () => {
        const { ObligationController } = await import("./modules/financial/controllers/obligationController.mjs");
        const ctrl = new ObligationController(financialService);
        return ctrl.createStudentObligation(request, response, context);
      }},
      { method: 'POST', pattern: '^/api/v1/financial/obligations/bulk$', handler: async () => {
        const { ObligationController } = await import("./modules/financial/controllers/obligationController.mjs");
        const ctrl = new ObligationController(financialService);
        return ctrl.createBulkObligations(request, response, context);
      }},
      { method: 'PATCH', pattern: '^/api/v1/financial/obligations/([0-9a-f-]{36})/status$', handler: async (match) => {
        const { ObligationController } = await import("./modules/financial/controllers/obligationController.mjs");
        const ctrl = new ObligationController(financialService);
        return ctrl.updateObligationStatus(request, response, context, match[1]);
      }},
      { method: 'GET', pattern: '^/api/v1/financial/summary$', handler: async () => {
        const { ObligationController } = await import("./modules/financial/controllers/obligationController.mjs");
        const ctrl = new ObligationController(financialService);
        return ctrl.getStudentFinancialSummary(request, response, context);
      }},
      { method: 'POST', pattern: '^/api/v1/financial/payments/initiate$', handler: async () => {
        const { PaymentController } = await import("./modules/financial/controllers/paymentController.mjs");
        const ctrl = new PaymentController(paymentService, verificationService);
        return ctrl.initiatePayment(request, response, context);
      }},
      { method: 'POST', pattern: '^/api/v1/financial/payments/([0-9a-f-]{36})/process$', handler: async (match) => {
        const { PaymentController } = await import("./modules/financial/controllers/paymentController.mjs");
        const ctrl = new PaymentController(paymentService, verificationService);
        return ctrl.processPayment(request, response, context, match[1]);
      }},
      { method: 'GET', pattern: '^/api/v1/financial/payments/([0-9a-f-]{36})$', handler: async (match) => {
        const { PaymentController } = await import("./modules/financial/controllers/paymentController.mjs");
        const ctrl = new PaymentController(paymentService, verificationService);
        return ctrl.getTransaction(request, response, context, match[1]);
      }},
      { method: 'GET', pattern: '^/api/v1/financial/payments$', handler: async () => {
        const { PaymentController } = await import("./modules/financial/controllers/paymentController.mjs");
        const ctrl = new PaymentController(paymentService, verificationService);
        return ctrl.getStudentTransactions(request, response, context);
      }},
      { method: 'GET', pattern: '^/api/v1/financial/obligations/([0-9a-f-]{36})/payments$', handler: async (match) => {
        const { PaymentController } = await import("./modules/financial/controllers/paymentController.mjs");
        const ctrl = new PaymentController(paymentService, verificationService);
        return ctrl.getObligationTransactions(request, response, context, match[1]);
      }},
      { method: 'GET', pattern: '^/api/v1/financial/admin/payments$', handler: async () => {
        const { PaymentController } = await import("./modules/financial/controllers/paymentController.mjs");
        const ctrl = new PaymentController(paymentService, verificationService);
        return ctrl.getAllTransactions(request, response, context);
      }},
      { method: 'GET', pattern: '^/api/v1/financial/admin/payments/pending-verification$', handler: async () => {
        const { PaymentController } = await import("./modules/financial/controllers/paymentController.mjs");
        const ctrl = new PaymentController(paymentService, verificationService);
        return ctrl.getPendingVerifications(request, response, context);
      }},
      { method: 'POST', pattern: '^/api/v1/financial/admin/payments/([0-9a-f-]{36})/verify$', handler: async (match) => {
        const { PaymentController } = await import("./modules/financial/controllers/paymentController.mjs");
        const ctrl = new PaymentController(paymentService, verificationService);
        return ctrl.verifyTransaction(request, response, context, match[1]);
      }},
      { method: 'GET', pattern: '^/api/v1/financial/admin/payments/failed$', handler: async () => {
        const { PaymentController } = await import("./modules/financial/controllers/paymentController.mjs");
        const ctrl = new PaymentController(paymentService, verificationService);
        return ctrl.getFailedTransactions(request, response, context);
      }},
      { method: 'GET', pattern: '^/api/v1/financial/receipts/([0-9a-f-]{36})$', handler: async (match) => {
        const { ReceiptController } = await import("./modules/financial/controllers/receiptController.mjs");
        const ctrl = new ReceiptController(verificationService);
        return ctrl.getReceipt(request, response, context, match[1]);
      }},
      { method: 'GET', pattern: '^/api/v1/financial/payments/([0-9a-f-]{36})/receipt$', handler: async (match) => {
        const { ReceiptController } = await import("./modules/financial/controllers/receiptController.mjs");
        const ctrl = new ReceiptController(verificationService);
        return ctrl.getReceiptByTransaction(request, response, context, match[1]);
      }},
      { method: 'GET', pattern: '^/api/v1/financial/receipts$', handler: async () => {
        const { ReceiptController } = await import("./modules/financial/controllers/receiptController.mjs");
        const ctrl = new ReceiptController(verificationService);
        return ctrl.getStudentReceipts(request, response, context);
      }},
      { method: 'GET', pattern: '^/api/v1/financial/receipts/([0-9a-f-]{36})/download$', handler: async (match) => {
        const { ReceiptController } = await import("./modules/financial/controllers/receiptController.mjs");
        const ctrl = new ReceiptController(verificationService);
        return ctrl.downloadReceipt(request, response, context, match[1]);
      }},
      { method: 'GET', pattern: '^/api/v1/financial/receipts/([0-9a-f-]{36})/file$', handler: async (match) => {
        const { ReceiptController } = await import("./modules/financial/controllers/receiptController.mjs");
        const ctrl = new ReceiptController(verificationService);
        return ctrl.getReceiptFile(request, response, context, match[1]);
      }}
    ];

    for (const route of routes) {
      if (route.method !== method) continue;
      const match = pathname.match(new RegExp(route.pattern));
      if (match) {
        try {
          const result = await route.handler(match);
          if (result?.handled) return true;
          if (method !== "GET" && method !== "HEAD") {
            await audit(context, request, "financial.request_completed", "success", {
              actorUserId: context.session?.user?.id,
              metadata: { method, path: pathname }
            });
          }
          if (result?.data !== undefined) {
            sendJson(response, result.status ?? 200, result);
          } else if (!response.writableEnded) {
            sendJson(response, 204, {});
          }
          return true;
        } catch (caught) {
          if (method !== "GET" && method !== "HEAD") {
            await audit(context, request, "financial.request_failed", "failure", {
              actorUserId: context.session?.user?.id,
              metadata: { method, path: pathname, reason: caught?.message || "UNKNOWN" }
            }).catch(() => {});
          }
          if (caught instanceof HttpError) throw caught;
          const knownErrors = {
            OBLIGATION_NOT_FOUND: [404, "OBLIGATION_NOT_FOUND", "Payment obligation not found."],
            TRANSACTION_NOT_FOUND: [404, "TRANSACTION_NOT_FOUND", "Payment transaction not found."],
            OBLIGATION_STUDENT_MISMATCH: [403, "FORBIDDEN", "This payment obligation belongs to another student."],
            TRANSACTION_STUDENT_MISMATCH: [403, "FORBIDDEN", "This payment transaction belongs to another student."],
            OBLIGATION_ALREADY_PAID: [409, "OBLIGATION_ALREADY_PAID", "This payment obligation is already paid."],
            PENDING_TRANSACTION_EXISTS: [409, "PENDING_TRANSACTION_EXISTS", "A payment attempt is already in progress for this obligation."],
            PAYMENT_PERIOD_NOT_FOUND: [409, "PAYMENT_PERIOD_NOT_FOUND", "This enrollment fee is not linked to an enrollment period."],
            PAYMENT_PERIOD_CLOSED: [409, "PAYMENT_PERIOD_CLOSED", "Payments for this enrollment period are closed."],
            INVALID_TRANSACTION_STATUS: [409, "INVALID_TRANSACTION_STATUS", "The payment transaction cannot be processed from its current status."],
            TRANSACTION_PROCESSING: [409, "TRANSACTION_PROCESSING", "The payment transaction is already being processed."],
            TRANSACTION_ALREADY_VERIFIED: [409, "TRANSACTION_ALREADY_VERIFIED", "The payment transaction is already verified."],
            OBLIGATION_DUPLICATE: [409, "OBLIGATION_DUPLICATE", "An equivalent active payment obligation already exists."],
            PAYMENT_TYPE_NOT_FOUND: [404, "PAYMENT_TYPE_NOT_FOUND", "Payment type not found."],
            PAYMENT_TYPE_INACTIVE: [409, "PAYMENT_TYPE_INACTIVE", "This payment type is inactive."],
            AMOUNT_INVALID: [422, "AMOUNT_INVALID", "Payment amounts must be greater than zero."],
            VERIFICATION_CONFLICT: [409, "VERIFICATION_CONFLICT", "The transaction changed while it was being verified."],
            ENTRANCE_FEE_NOT_CONFIGURED: [503, "ENTRANCE_FEE_NOT_CONFIGURED", "The entrance fee is not configured."],
          };
          const errorKey = String(caught?.message || "").split(":", 1)[0];
          const mapped = knownErrors[errorKey];
          if (mapped) error(...mapped);
          throw caught;
        }
      }
    }

    return false;
  }

  async function handler(request, response) {
    let pathname = "/";
    let url;
    try {
      const rawRequestUrl = request.url;
      const rawPathname =
        typeof rawRequestUrl === "string"
          ? rawRequestUrl.slice(0, rawRequestUrl.indexOf("?") === -1 ? undefined : rawRequestUrl.indexOf("?"))
          : "";
      if (
        typeof rawRequestUrl !== "string" ||
        rawRequestUrl.length > 2048 ||
        /%2f|%5c|%00/i.test(rawPathname)
      ) {
        error(400, "URL_INVALID", "The request URL is invalid.");
      }
      url = new URL(rawRequestUrl, config.appOrigin);
      pathname = decodeURIComponent(url.pathname);
      if (pathname.includes("\\") || pathname.includes("\0")) error(400, "URL_INVALID", "The request URL is invalid.");
    } catch (caught) {
      if (caught instanceof HttpError) {
        const requestId = newId();
        setSecurityHeaders(response, requestId);
        sendJson(response, caught.status, { error: { code: caught.code, message: caught.message } });
        return;
      }
      const requestId = newId();
      setSecurityHeaders(response, requestId);
      sendJson(response, 400, { error: { code: "URL_INVALID", message: "The request URL is invalid." } });
      return;
    }

    const context = requestContext(request, pathname);
    setSecurityHeaders(response, context.requestId);
    try {
      await pruneSecurityState();
      if (request.headers.origin && request.headers.origin !== config.appOrigin) {
        await audit(context, request, "security.origin", "failure");
        error(403, "ORIGIN_MISMATCH", "The request origin was rejected.");
      }

      const method = String(request.method ?? "GET").toUpperCase();
      if ((method === "GET" || method === "HEAD") && (await serveStatic(request, response, pathname))) return;

      if (method === "GET" && pathname === "/api/v1/auth/csrf") return await authSession(request, response, context);
      if (method === "GET" && pathname === "/api/v1/auth/session") return await authSession(request, response, context);
      if (method === "GET" && pathname === "/api/v1/auth/me") return await authSession(request, response, context, true);
      if (method === "GET" && pathname === "/api/v1/admission/programs") return await listAdmissionPrograms(request, response);
      if (method === "POST" && pathname === "/api/v1/admission/register") return await registerStudent(request, response, context);
      if (method === "POST" && pathname === "/api/v1/auth/login") return await login(request, response, context);
      if (method === "POST" && pathname === "/api/v1/auth/logout") return await logout(request, response, context);
      if (method === "POST" && pathname === "/api/v1/auth/forgot-password") {
        return await forgotPassword(request, response, context);
      }
      if (method === "POST" && pathname === "/api/v1/auth/reset-password") {
        return await resetPassword(request, response, context);
      }
      if (method === "POST" && pathname === "/api/v1/auth/change-password") {
        return await changePassword(request, response, context);
      }
      if (method === "GET" && pathname === "/api/v1/account") {
        const session = await requireAuthentication(request, context, { allowMustChange: true });
        return sendJson(response, 200, { data: { user: publicUser(session.user) } });
      }
      if (method === "POST" && pathname === "/api/v1/account/change-password") {
        return await changePassword(request, response, context);
      }

      if (method === "GET" && pathname === "/api/v1/student/dashboard") {
        return await studentDashboard(request, response, context);
      }
      if (method === "GET" && pathname === "/api/v1/student/profile") {
        return await studentProfile(request, response, context);
      }
      if (method === "PATCH" && pathname === "/api/v1/student/profile") {
        return await updateStudentProfile(request, response, context);
      }
      if (method === "GET" && pathname === "/api/v1/student/request-types") {
        return await studentRequestTypes(request, response, context);
      }
      if (method === "GET" && pathname === "/api/v1/student/requests") {
        return await listStudentRequests(request, response, context);
      }
      if (method === "POST" && pathname === "/api/v1/student/requests") {
        return await submitStudentRequest(request, response, context);
      }
      if (method === "GET" && pathname === "/api/v1/student/enrollment/options") {
        return await enrollmentApplicationOptions(request, response, context);
      }
      if (method === "GET" && pathname === "/api/v1/student/enrollment") {
        return await getEnrollmentApplication(request, response, context);
      }
      if (method === "PUT" && pathname === "/api/v1/student/enrollment") {
        return await saveEnrollmentApplication(request, response, context);
      }
      if (method === "POST" && pathname === "/api/v1/student/enrollment/submit") {
        return await saveEnrollmentApplication(request, response, context, true);
      }
      if (method === "GET" && pathname === "/api/v1/student/documents") {
        return await listStudentDocuments(request, response, context);
      }
      if (method === "POST" && pathname === "/api/v1/student/documents/upload") {
        return await uploadStudentDocument(request, response, context);
      }
      const studentDocumentViewMatch = pathname.match(/^\/api\/v1\/student\/documents\/([0-9a-f-]{36})\/view$/i);
      if ((method === "GET" || method === "HEAD") && studentDocumentViewMatch) {
        return await viewStudentDocument(request, response, context, studentDocumentViewMatch[1]);
      }
      const studentDocumentMatch = pathname.match(/^\/api\/v1\/student\/documents\/([0-9a-f-]{36})$/i);
      if (method === "DELETE" && studentDocumentMatch) return await deleteStudentDocument(request, response, context, studentDocumentMatch[1]);
      if (method === "GET" && pathname === "/api/v1/student/documents/types") {
        return await listDocumentTypes(request, response, context);
      }
      if (method === "GET" && pathname === "/api/v1/registrar/dashboard") {
        return await registrarDashboard(request, response, context);
      }
      if (method === "GET" && pathname === "/api/v1/program-head/dashboard") {
        return await programHeadDashboard(request, response, context);
      }
      if (method === "GET" && pathname === "/api/v1/program-head/subjects") {
        return await listProgramHeadSubjects(request, response, context, url);
      }
      if (method === "POST" && pathname === "/api/v1/program-head/curricula") {
        return await createProgramCurriculum(request, response, context);
      }
      if (method === "POST" && pathname === "/api/v1/program-head/offerings") {
        return await createProgramHeadOffering(request, response, context);
      }
      const programHeadCurriculumSubjectMatch = pathname.match(/^\/api\/v1\/program-head\/curricula\/([0-9a-f-]{36})\/subjects$/i);
      if (method === "POST" && programHeadCurriculumSubjectMatch) {
        return await addProgramCurriculumSubject(request, response, context, programHeadCurriculumSubjectMatch[1]);
      }
      const programHeadStudentMatch = pathname.match(/^\/api\/v1\/program-head\/students\/([0-9a-f-]{36})$/i);
      if (method === "GET" && programHeadStudentMatch) {
        return await getProgramHeadStudent(request, response, context, programHeadStudentMatch[1]);
      }
      const programHeadEvaluationMatch = pathname.match(/^\/api\/v1\/program-head\/enrollments\/([0-9a-f-]{36})\/evaluation$/i);
      if (method === "GET" && pathname === "/api/v1/program-head/enrollment-applications") {
        return await programHeadApplications(request, response, context);
      }
      const programHeadApplicationMatch = pathname.match(/^\/api\/v1\/program-head\/enrollment-applications\/([0-9a-f-]{36})$/i);
      if (["GET", "PATCH"].includes(method) && programHeadApplicationMatch) {
        return await programHeadApplications(request, response, context, programHeadApplicationMatch[1]);
      }
      if (method === "GET" && programHeadEvaluationMatch) {
        return await getProgramHeadEnrollmentEvaluation(request, response, context, programHeadEvaluationMatch[1]);
      }
      const programHeadEvaluationApprovalMatch = pathname.match(/^\/api\/v1\/program-head\/enrollments\/([0-9a-f-]{36})\/evaluation\/approve$/i);
      if (method === "POST" && programHeadEvaluationApprovalMatch) {
        return await approveProgramHeadEnrollmentEvaluation(request, response, context, programHeadEvaluationApprovalMatch[1]);
      }
      if (method === "GET" && pathname === "/api/v1/registrar/academic-years") {
        return await listRegistrarAcademicYears(request, response, context);
      }
      if (method === "POST" && pathname === "/api/v1/registrar/academic-years") {
        return await createRegistrarAcademicYear(request, response, context);
      }
      const registrarAcademicYearMatch = pathname.match(/^\/api\/v1\/registrar\/academic-years\/([0-9a-f-]{36})$/i);
      if (method === "PATCH" && registrarAcademicYearMatch) {
        return await updateRegistrarAcademicYear(request, response, context, registrarAcademicYearMatch[1]);
      }
      const registrarAcademicYearRemovalRequestMatch = pathname.match(/^\/api\/v1\/registrar\/academic-years\/([0-9a-f-]{36})\/removal-request$/i);
      if (method === "POST" && registrarAcademicYearRemovalRequestMatch) {
        return await requestAcademicYearRemoval(request, response, context, registrarAcademicYearRemovalRequestMatch[1]);
      }
      if (method === "POST" && pathname === "/api/v1/registrar/academic-terms") {
        return await createRegistrarAcademicTerm(request, response, context);
      }
      const registrarTermMatch = pathname.match(/^\/api\/v1\/registrar\/academic-terms\/([0-9a-f-]{36})$/i);
      if (method === "PATCH" && registrarTermMatch) {
        return await updateRegistrarAcademicTerm(request, response, context, registrarTermMatch[1]);
      }
      const registrarRemovalRequestMatch = pathname.match(/^\/api\/v1\/registrar\/academic-terms\/([0-9a-f-]{36})\/removal-request$/i);
      if (method === "POST" && registrarRemovalRequestMatch) {
        return await requestAcademicTermRemoval(request, response, context, registrarRemovalRequestMatch[1]);
      }
      if (method === "GET" && pathname === "/api/v1/registrar/applications") {
        return await registrarApplications(request, response, context, url);
      }
      const registrarApplicationMatch = pathname.match(/^\/api\/v1\/registrar\/applications\/([0-9a-f-]{36})$/i);
      if (method === "GET" && registrarApplicationMatch) return await registrarApplicationReview(request, response, context, registrarApplicationMatch[1]);
      if (method === "PATCH" && registrarApplicationMatch) return await updateRegistrarApplication(request, response, context, registrarApplicationMatch[1]);
      const registrarDocumentViewMatch = pathname.match(/^\/api\/v1\/registrar\/documents\/([0-9a-f-]{36})\/view$/i);
      if ((method === "GET" || method === "HEAD") && registrarDocumentViewMatch) {
        return await viewRegistrarDocument(request, response, context, registrarDocumentViewMatch[1]);
      }
      const registrarDocumentMatch = pathname.match(/^\/api\/v1\/registrar\/documents\/([0-9a-f-]{36})$/i);
      if (method === "PATCH" && registrarDocumentMatch) return await updateRegistrarDocument(request, response, context, registrarDocumentMatch[1]);
      if (method === "POST" && pathname === "/api/v1/registrar/enrollment-period/open") {
        return await openRegistrarPeriod(request, response, context);
      }
      if (method === "POST" && pathname === "/api/v1/registrar/enrollment-period/close") {
        return await closeRegistrarPeriod(request, response, context);
      }

      // Financial routes
      const financialResult = await handleFinancialRoutes(request, response, context, url, pathname, method);
      if (financialResult !== false) return financialResult;

      if (method === "GET" && pathname === "/api/v1/admin/roles") return await listRoles(request, response, context);
      if (method === "GET" && pathname === "/api/v1/admin/programs") return await listAdminPrograms(request, response, context);
      if (method === "GET" && pathname === "/api/v1/admin/users") return await listUsers(request, response, context);
      if (method === "POST" && pathname === "/api/v1/admin/users") {
        return await createUser(request, response, context);
      }
      if (method === "GET" && pathname === "/api/v1/admin/audit-logs") {
        return await listAudit(request, response, context, url);
      }
      if (method === "GET" && pathname === "/api/v1/admin/academic-term-removal-requests") {
        return await listAcademicTermRemovalRequests(request, response, context);
      }
      if (method === "GET" && pathname === "/api/v1/admin/academic-year-removal-requests") {
        return await listAcademicYearRemovalRequests(request, response, context);
      }
      const adminRemovalRequestMatch = pathname.match(/^\/api\/v1\/admin\/academic-term-removal-requests\/([0-9a-f-]{36})$/i);
      if (method === "PATCH" && adminRemovalRequestMatch) {
        return await resolveAcademicTermRemovalRequest(request, response, context, adminRemovalRequestMatch[1]);
      }
      const adminYearRemovalRequestMatch = pathname.match(/^\/api\/v1\/admin\/academic-year-removal-requests\/([0-9a-f-]{36})$/i);
      if (method === "PATCH" && adminYearRemovalRequestMatch) {
        return await resolveAcademicYearRemovalRequest(request, response, context, adminYearRemovalRequestMatch[1]);
      }
      const statusMatch = pathname.match(/^\/api\/v1\/admin\/users\/([0-9a-f-]{36})\/status$/i);
      if (method === "PATCH" && statusMatch) return await updateStatus(request, response, context, statusMatch[1]);
      const rolesMatch = pathname.match(/^\/api\/v1\/admin\/users\/([0-9a-f-]{36})\/roles$/i);
      if (method === "PUT" && rolesMatch) return await updateRoles(request, response, context, rolesMatch[1]);
      const deleteUserMatch = pathname.match(/^\/api\/v1\/admin\/users\/([0-9a-f-]{36})$/i);
      if (method === "DELETE" && deleteUserMatch) return await deleteUser(request, response, context, deleteUserMatch[1]);

      const portalRole = ROLE_BY_PORTAL_PATH.get(pathname);
      if (method === "GET" && portalRole) return await portalHtml(request, response, context, portalRole);
      if (method === "GET" && pathname === "/portal.html") {
        return await portalHtml(request, response, context);
      }
      const apiPortalMatch = pathname.match(/^\/api\/v1\/portal\/([a-z-]+)$/);
      const apiPortalRole = apiPortalMatch ? ROLE_BY_API_SEGMENT.get(apiPortalMatch[1]) : null;
      if (method === "GET" && apiPortalRole) return await portalApi(request, response, context, apiPortalRole);

      error(404, "NOT_FOUND", "Resource not found.");
    } catch (caught) {
      if (response.headersSent) {
        response.destroy();
        return;
      }
      if (caught instanceof HttpError) {
        const payload = { error: { code: caught.code, message: caught.message } };
        if (caught.details !== undefined) payload.error.details = caught.details;
        sendJson(response, caught.status, payload, caught.headers);
        return;
      }
      if (!config.isTest) {
        const details = caught instanceof Error ? caught.stack || caught.message : String(caught);
        process.stderr.write(`Request ${context.requestId} failed unexpectedly: ${details}\n`);
      }
      sendJson(response, 500, { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } });
    }
  }

  return {
    handler,
    database,
    config,
    async close() {
      if (ownsDatabase) await database.$disconnect();
    }
  };
}

export { HttpError };
