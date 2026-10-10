import { readFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { createConfig } from "./config.mjs";
import * as systemLogger from "./logger.mjs";
import { RequestMonitor } from "./monitoring.mjs";
import { AuthenticationStore, isUniqueConstraint } from "./auth-store.mjs";
import { createDatabase, ROLE_DEFINITIONS } from "./db.mjs";
import { StudentDashboardStore } from "./student-store.mjs";
import { AdmissionStore } from "./admission-store.mjs";
import { EnrollmentApplicationStore } from "./enrollment-store.mjs";
import { RegistrarStore } from "./registrar-store.mjs";
import { ProgramHeadStore } from "./program-head-store.mjs";
import { StudentAssistantStore } from "./student-assistant-store.mjs";
import { ClubStore } from "./club-store.mjs";
import { handleClubRoutes } from "./club-router.mjs";
import { DocumentStorageService } from "./document-storage.mjs";
import { DocumentStore } from "./document-store.mjs";
import { AdminFacultyService } from "./admin-faculty-service.mjs";
import { FacultyStore } from "./faculty-store.mjs";
import { GradeService } from "./grade-service.mjs";
import { DeanStore } from "./dean-store.mjs";
import { FinancialService } from "./modules/financial/services/financialService.mjs";
import { PaymentService } from "./modules/financial/services/paymentService.mjs";
import { VerificationService } from "./modules/financial/services/verificationService.mjs";
import { AcademicImportService } from "./academic-import-service.mjs";
import { sendPasswordResetEmail } from "./email.mjs";
import {
  verifyGoogleCredential,
  exchangeGoogleAuthCode,
  createRegistrationToken,
  verifyRegistrationToken
} from "./google-auth-service.mjs";
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
const ACCOUNT_CREATION_ROLES = new Set(["administrator", "registrar", "program_head", "student_assistant", "cashier", "student", "ssc", "dean"]);

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
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style; script-src 'self' https://accounts.google.com/gsi/client; connect-src 'self' https://accounts.google.com/gsi/; frame-src 'self' https://accounts.google.com/gsi/; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
  );
}

function sendJson(response, status, payload, additionalHeaders = {}) {
  const body = JSON.stringify(payload, (_key, value) =>
    typeof value === "bigint" ? Number(value) : value
  );
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
    const rawString = Buffer.concat(chunks).toString("utf8");
    const upperRaw = rawString.toUpperCase();
    const isSqli = upperRaw.includes(" OR 1=1") || upperRaw.includes("UNION SELECT") || upperRaw.includes("DROP TABLE") || upperRaw.includes("--");
    const isXss = upperRaw.includes("<SCRIPT>") || upperRaw.includes("JAVASCRIPT:") || upperRaw.includes("ONERROR=");
    if (isSqli || isXss) {
      await systemLogger.logSystemEvent({ severity: systemLogger.Severity.CRITICAL, category: systemLogger.Category.SECURITY, moduleName: "Core API", functionName: "readJson", requestUrl: request.url, httpMethod: request.method, message: isSqli ? "SQL Injection Attempt Detected" : "Cross-Site Scripting (XSS) Attempt Detected", technicalDetail: `Malicious payload pattern detected in request body: ${rawString.substring(0, 200)}...` });
    }
    const body = JSON.parse(rawString);
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
  systemLogger.setDatabase(database);
  const requestMonitor = options.requestMonitor ?? new RequestMonitor({
    now: config.now,
    slowRequestThresholdMs: config.slowRequestThresholdMs
  });
  const store = options.store ?? new AuthenticationStore(database, config);
  const studentStore = options.studentStore ?? new StudentDashboardStore(database);
  const admissionStore = options.admissionStore ?? new AdmissionStore(database);
  const enrollmentApplicationStore = options.enrollmentApplicationStore ?? new EnrollmentApplicationStore(database);
  const registrarStore = options.registrarStore ?? new RegistrarStore(database);
  const programHeadStore = options.programHeadStore ?? new ProgramHeadStore(database);
  const studentAssistantStore = options.studentAssistantStore ?? new StudentAssistantStore(database);
  const clubStore = options.clubStore ?? new ClubStore(database, { scrypt: config.scrypt });
  let documentStorage;
  if (process.env.CLOUDFLARE_R2_ACCOUNT_ID &&
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
      process.env.CLOUDFLARE_R2_BUCKET_NAME) {
    const { createR2Storage } = await import("./r2-storage-adapter.mjs");
    documentStorage = createR2Storage(
      process.env.CLOUDFLARE_R2_ACCOUNT_ID,
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      process.env.CLOUDFLARE_R2_BUCKET_NAME
    );
    if (!documentStorage) {
      throw new Error("FAILED_TO_INIT_R2_STORAGE");
    }
  } else {
    documentStorage = options.documentStorage ?? new DocumentStorageService(config.documentRoot);
  }
  await documentStorage.initialize();
  const documentStore = options.documentStore ?? new DocumentStore(database, documentStorage);
  const financialService = new FinancialService(database);
  const paymentService = new PaymentService(database);
  const verificationService = new VerificationService(database);
  verificationService.paymentService = paymentService;
  const adminFacultyService = new AdminFacultyService(database, config);
  const facultyStore = new FacultyStore(database);
  const gradeService = new GradeService(database);
  const deanStore = options.deanStore ?? new DeanStore(database, { gradeService, programHeadStore });
  const academicImportService = options.academicImportService ?? new AcademicImportService(database, documentStorage);
  const dummyPasswordHash = await hashPassword(randomToken(24), config.scrypt);
  const onPasswordReset =
    options.onPasswordReset ??
    (async ({ user, resetUrl }) => {
      await sendPasswordResetEmail({ user, resetUrl, config });
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
      resourceType: fields.resourceType ?? null,
      resourceId: fields.resourceId ?? null,
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
      assignedDepartment: user.assigned_department ?? null,
      assignedCollege: user.assigned_college ?? null,
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

  async function googleAuthConfig(request, response) {
    const configured = Boolean(config.googleClientId && config.googleClientId.trim());
    return sendJson(response, 200, {
      data: {
        configured,
        enabled: configured || config.isTest,
        clientId: config.googleClientId || (config.isTest ? "cjc-test-client-id" : null),
        allowedDomains: config.googleAllowedDomains,
        missingConfig: configured ? [] : ["GOOGLE_CLIENT_ID"]
      }
    });
  }

  async function googleAuthVerify(request, response, context) {
    const anonymousSession = await requireCsrf(request, context);
    const body = await readJson(request, config.bodyLimitBytes);
    let credential = typeof body.credential === "string" ? body.credential.trim() : "";
    const remember = body.remember === true;
    const now = config.now();

    if (!config.googleClientId && !config.isTest) {
      error(
        503,
        "GOOGLE_AUTH_NOT_CONFIGURED",
        "Google Workspace authentication is not configured on the server. Missing GOOGLE_CLIENT_ID environment variable."
      );
    }

    if (!credential && typeof body.code === "string" && body.code.trim()) {
      credential = await exchangeGoogleAuthCode(body.code.trim(), config, body.redirectUri || "postmessage");
    }

    if (!credential) {
      error(400, "INVALID_CREDENTIAL", "Google identity token (credential) is required.");
    }

    let profile;
    try {
      profile = await verifyGoogleCredential(credential, config);
    } catch (err) {
      await audit(context, request, "authentication.google_verify", "failure", {
        metadata: { error: err.message, code: err.code }
      });
      error(err.status || 400, err.code || "INVALID_CREDENTIAL", err.message, err.details);
    }

    // Search existing SMS account across all roles: Student, Faculty, Program Head, Registrar, etc.
    const existingUser = await store.findUserForGoogleAuth(profile.googleSub, profile.email);

    if (existingUser) {
      if (existingUser.status !== "active") {
        await audit(context, request, "authentication.google_login", "inactive_account", {
          targetUserId: existingUser.id,
          metadata: { email: profile.email }
        });
        error(403, "ACCOUNT_INACTIVE", "This project account is not active. Please contact support.");
      }
      if (existingUser.lock_until && existingUser.lock_until > now) {
        await audit(context, request, "authentication.google_login", "locked_account", {
          targetUserId: existingUser.id,
          metadata: { email: profile.email }
        });
        error(423, "ACCOUNT_LOCKED", "This project account is temporarily locked.");
      }

      // Link Google identity
      await store.linkGoogleAuth(existingUser.id, profile);

      await store.revokeSession(anonymousSession.tokenHash, now);
      const created = await createSession(existingUser, remember);

      await audit(context, request, "authentication.google_login", "success", {
        actorUserId: existingUser.id,
        targetUserId: existingUser.id,
        metadata: { email: profile.email, googleSub: profile.googleSub, linked: true, remember }
      });

      const userData = publicUser(existingUser);
      return sendJson(
        response,
        200,
        {
          data: {
            status: "LOGGED_IN",
            user: userData,
            landingPath: userData.landingPath,
            csrfToken: created.csrfToken
          }
        },
        { "Set-Cookie": sessionCookie(config, created.token, remember) }
      );
    }

    // No existing SMS account -> return ACCOUNT_NOT_FOUND with signed registrationToken
    const registrationToken = createRegistrationToken(profile, config);
    await audit(context, request, "authentication.google_verify", "account_not_found", {
      metadata: { email: profile.email, googleSub: profile.googleSub }
    });

    return sendJson(response, 200, {
      data: {
        status: "ACCOUNT_NOT_FOUND",
        registrationToken,
        profile: {
          email: profile.email,
          givenName: profile.givenName,
          familyName: profile.familyName,
          name: profile.name,
          picture: profile.picture
        }
      }
    });
  }

  async function googleRegisterStudent(request, response, context) {
    const anonymousSession = await requireCsrf(request, context);
    const body = await readJson(request, config.bodyLimitBytes);

    let profile;
    try {
      profile = verifyRegistrationToken(body.registrationToken, config);
    } catch (err) {
      error(err.status || 400, err.code || "REGISTRATION_TOKEN_INVALID", err.message);
    }

    const firstName = validateRequiredText(body.firstName || profile.givenName, "first name");
    const middleName = body.middleName ? validateRequiredText(body.middleName, "middle name") : null;
    const lastName = validateRequiredText(body.lastName || profile.familyName, "last name");
    const birthDate = typeof body.birthDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.birthDate)
      ? body.birthDate
      : null;
    if (!birthDate) error(422, "BIRTH_DATE_INVALID", "Enter a valid birthday.");
    const mobileNumber = validateRequiredText(body.mobileNumber, "mobile number", 32);

    const password = typeof body.password === "string" && body.password.length > 0 ? body.password : null;
    if (password) {
      if (body.confirmPassword !== undefined && password !== body.confirmPassword) {
        error(422, "PASSWORD_MISMATCH", "Passwords do not match.");
      }
      const pwdErr = validatePassword(password, config);
      if (pwdErr) error(422, "PASSWORD_INVALID", pwdErr);
    }

    // Prevent duplicate student accounts
    const existing = await store.findUserForGoogleAuth(profile.googleSub, profile.email);
    if (existing) {
      error(409, "ACCOUNT_EXISTS", "An account with this institutional email or Google identity already exists.");
    }

    const currentYear = new Date(config.now()).getUTCFullYear();
    let result;
    try {
      result = await admissionStore.registerStudent({
        firstName,
        middleName,
        lastName,
        birthDate,
        institutionalEmail: profile.email,
        personalEmail: body.personalEmail ? validateEmail(body.personalEmail) : profile.email,
        mobileNumber,
        password,
        admissionYear: currentYear,
        googleProfile: profile
      }, config);
    } catch (caught) {
      if (caught.message === "PROGRAM_INVALID") error(422, "PROGRAM_INVALID", "Select an active program.");
      if (caught.message === "ACADEMIC_TERM_MISSING") error(503, "ACADEMIC_TERM_MISSING", "The academic catalog has no available term yet.");
      if (caught.message === "ENTRANCE_FEE_NOT_CONFIGURED") error(503, "ENTRANCE_FEE_NOT_CONFIGURED", "The entrance fee is not configured.");
      if (caught.code === "P2002") error(409, "ACCOUNT_EXISTS", "That email or generated school identity already exists.");
      throw caught;
    }

    const newUser = await store.userById(result.userId);
    const now = config.now();
    await store.revokeSession(anonymousSession.tokenHash, now);
    const session = await createSession(newUser, true);

    await audit(context, request, "admission.student_registered", "success", {
      actorUserId: newUser.id,
      targetUserId: newUser.id,
      metadata: {
        applicationNumber: result.applicationNumber,
        studentNumber: result.studentNumber,
        provider: "google_workspace"
      }
    });

    const userData = publicUser(newUser);
    return sendJson(
      response,
      201,
      {
        data: {
          status: "LOGGED_IN",
          studentNumber: result.studentNumber,
          applicationNumber: result.applicationNumber,
          user: userData,
          landingPath: userData.landingPath,
          csrfToken: session.csrfToken
        }
      },
      { "Set-Cookie": sessionCookie(config, session.token, true) }
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
      error(422, "ROLE_INVALID", "Select Admin, Registrar, Program Head, Student Assistant, Cashier, Student, or Dean.");
    }
    let programId = null;
    if (role.slug === "program_head") {
      programId = typeof body.programId === "string" ? body.programId.trim() : "";
      if (!programId) error(422, "PROGRAM_REQUIRED", "Select the program assigned to this Program Head.");
      const program = (await store.listPrograms()).find((candidate) => candidate.id === programId);
      if (!program) error(422, "PROGRAM_INVALID", "Select an active program.");
    }
    let departmentId = null;
    if (role.slug === "student_assistant") {
      departmentId = typeof body.departmentId === "string" ? body.departmentId.trim() : "";
      if (!departmentId) error(422, "DEPARTMENT_REQUIRED", "Select the department assigned to this Student Assistant.");
      const department = (await store.listDepartments()).find((candidate) => candidate.id === departmentId);
      if (!department) error(422, "DEPARTMENT_INVALID", "Select an active department.");
    }
    let collegeId = null;
    if (role.slug === "dean") {
      collegeId = typeof body.collegeId === "string" ? body.collegeId.trim() : "";
      if (!collegeId) error(422, "COLLEGE_REQUIRED", "Select the college assigned to this Dean.");
      const college = (await store.listColleges()).find((candidate) => candidate.id === collegeId);
      if (!college) error(422, "COLLEGE_INVALID", "Select an active college.");
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
        departmentId,
        departmentAssignmentId: role.slug === "student_assistant" ? newId() : null,
        collegeId,
        collegeAssignmentId: role.slug === "dean" ? newId() : null,
        assignedByUserId: adminSession.user.id,
        now
      });
    } catch (caught) {
      if (isUniqueConstraint(caught)) error(409, "ACCOUNT_EXISTS", "That username or email is already in use.");
      if (caught.message === "PROGRAM_REQUIRED") error(422, "PROGRAM_REQUIRED", "Select the program assigned to this Program Head.");
      if (caught.message === "PROGRAM_INVALID") error(422, "PROGRAM_INVALID", "Select an active program.");
      if (caught.message === "DEPARTMENT_REQUIRED") error(422, "DEPARTMENT_REQUIRED", "Select the department assigned to this Student Assistant.");
      if (caught.message === "DEPARTMENT_INVALID") error(422, "DEPARTMENT_INVALID", "Select an active department.");
      if (caught.message === "COLLEGE_REQUIRED") error(422, "COLLEGE_REQUIRED", "Select the college assigned to this Dean.");
      if (caught.message === "COLLEGE_INVALID") error(422, "COLLEGE_INVALID", "Select an active college.");
      throw caught;
    }
    await audit(context, request, "account.created", "success", {
      actorUserId: adminSession.user.id,
      targetUserId: userId,
      metadata: { role: role.slug, programId, departmentId, collegeId }
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

  async function listAdminDepartments(request, response, context) {
    await requirePermission(request, context, "users.manage");
    const departments = await store.listDepartments();
    sendJson(response, 200, { data: { departments } });
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
      let success;
      try {
        success = await store.deleteUser(userId);
      } catch (caught) {
        if (caught?.code === "P2003" || caught?.code === "P2014") {
          error(409, "ACCOUNT_DELETE_BLOCKED", "This account is linked to protected records and cannot be deleted. Disable it instead.");
        }
        throw caught;
      }
      if (!success) error(404, "ACCOUNT_NOT_FOUND", "Account not found.");
      
      await audit(context, request, "account.deleted", "success", {
        actorUserId: adminSession.user.id,
        targetUserId: userId
      });
      sendJson(response, 200, { data: { success: true } });
    }

  async function listSystemLogs(request, response, context, url) {
    await requirePermission(request, context, "portal.access.administrator");
    const requestedLimit = Number(url.searchParams.get("limit") ?? 50);
    const limit = Number.isSafeInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 200) : 50;
    
    // Default filtering logic can be added later
    const severity = url.searchParams.get("severity");
    const status = url.searchParams.get("status");

    const VALID_SEVERITIES = ["INFO", "WARNING", "HIGH", "CRITICAL"];
    const VALID_STATUSES = ["OPEN", "INVESTIGATING", "RESOLVED", "IGNORED"];
    const where = {};
    if (severity && VALID_SEVERITIES.includes(severity)) where.severity = severity;
    if (status && VALID_STATUSES.includes(status)) where.status = status;

    const entries = await database.systemLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    sendJson(response, 200, { data: { entries } });
  }

  async function updateSystemLogStatus(request, response, context, logId) {
    await requirePermission(request, context, "portal.access.administrator");
    const body = await readJson(request, config.bodyLimitBytes);
    if (!body || !["OPEN", "INVESTIGATING", "RESOLVED", "IGNORED"].includes(body.status)) {
      error(422, "INVALID_STATUS", "Invalid status provided.");
    }
    const log = await database.systemLog.update({
      where: { id: logId },
      data: { status: body.status }
    });
    sendJson(response, 200, { data: { log } });
  }

  async function createSystemReport(request, response, context) {
    const body = await readJson(request, config.bodyLimitBytes).catch(() => ({}));
    if (!body || typeof body.description !== "string" || body.description.trim().length < 5) {
      error(422, "DESCRIPTION_REQUIRED", "Please provide a description of at least 5 characters.");
    }

    let session = null;
    try {
      session = await loadSession(request, context);
    } catch {
      session = null;
    }

    const report = await store.createSystemReport({
      category: ["BUG", "SUGGESTION", "UI_ISSUE", "OTHER"].includes(body.category) ? body.category : "BUG",
      description: String(body.description).trim().slice(0, 5000),
      screenshotData: typeof body.screenshotData === "string" ? body.screenshotData.slice(0, 500000) : null,
      pageUrl: typeof body.pageUrl === "string" ? body.pageUrl.slice(0, 500) : "/",
      browserInfo: typeof body.browserInfo === "string" ? body.browserInfo.slice(0, 500) : null,
      errorCode: typeof body.errorCode === "string" ? body.errorCode.slice(0, 100) : null,
      userId: session?.user?.id || null,
      userRole: session?.user ? store.rolesForUser(session.user)[0]?.slug || "USER" : "GUEST"
    });

    sendJson(response, 201, { data: { report } });
  }

  async function listSystemReports(request, response, context, url) {
    await requirePermission(request, context, "portal.access.administrator");
    const status = url.searchParams.get("status") || "ALL";
    const reports = await store.listSystemReports({ status });
    sendJson(response, 200, { data: { reports } });
  }

  async function updateSystemReportStatus(request, response, context, reportId) {
    const adminSession = await requireStatePermission(request, context, "portal.access.administrator");
    const body = await readJson(request, config.bodyLimitBytes);
    const validStatuses = ["OPEN", "IN_REVIEW", "RESOLVED", "CLOSED"];
    if (!body || !validStatuses.includes(body.status)) {
      error(422, "INVALID_STATUS", `Status must be one of: ${validStatuses.join(", ")}`);
    }

    const report = await store.updateSystemReportStatus(reportId, {
      status: body.status,
      adminNotes: typeof body.adminNotes === "string" ? body.adminNotes : undefined,
      resolvedByUserId: adminSession.user.id
    });

    sendJson(response, 200, { data: { report } });
  }

  async function systemHealth(request, response, context) {
    await requirePermission(request, context, "portal.access.administrator");
    const checkedAt = config.now();
    const databaseStartedAt = performance.now();
    let databaseStatus = "available";
    let databaseLatencyMs = null;
    let incidentCounts = {
      criticalLast24Hours: null,
      openHighPriority: null,
      slowRequestsLast24Hours: null
    };

    try {
      await database.$queryRawUnsafe("SELECT 1");
      databaseLatencyMs = Math.max(0, Math.round(performance.now() - databaseStartedAt));
      const since = new Date(checkedAt - 24 * 60 * 60 * 1_000);
      const [criticalLast24Hours, openHighPriority, slowRequestsLast24Hours] = await Promise.all([
        database.systemLog.count({ where: { severity: "CRITICAL", createdAt: { gte: since } } }),
        database.systemLog.count({
          where: { severity: { in: ["HIGH", "CRITICAL"] }, status: { in: ["OPEN", "INVESTIGATING"] } }
        }),
        database.systemLog.count({
          where: {
            category: systemLogger.Category.API,
            durationMs: { gte: config.slowRequestThresholdMs },
            createdAt: { gte: since }
          }
        })
      ]);
      incidentCounts = { criticalLast24Hours, openHighPriority, slowRequestsLast24Hours };
    } catch (caught) {
      databaseStatus = "unavailable";
      if (!config.isTest) {
        const details = caught instanceof Error ? caught.message : String(caught);
        process.stderr.write(`Monitoring database check ${context.requestId} failed: ${details}\n`);
      }
    }

    sendJson(response, 200, {
      data: {
        status: databaseStatus === "available" ? "healthy" : "degraded",
        checkedAt: new Date(checkedAt).toISOString(),
        database: { status: databaseStatus, latencyMs: databaseLatencyMs },
        runtime: { nodeVersion: process.version, environment: config.nodeEnv },
        performance: requestMonitor.snapshot(),
        incidents: incidentCounts
      }
    });
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
      SCHEDULE_CONFLICT: [409, "SCHEDULE_CONFLICT", "The selected faculty member or room has a conflicting schedule."],
      UNAUTHORIZED_OFFERING_ACCESS: [403, "UNAUTHORIZED_OFFERING_ACCESS", "You are not authorized to modify offerings for another program."],
      OFFERING_NOT_FOUND: [404, "OFFERING_NOT_FOUND", "Subject offering not found."],
      OFFERING_STATUS_INVALID: [422, "OFFERING_STATUS_INVALID", "Invalid offering status."],
      CROSS_COLLEGE_FACULTY_FORBIDDEN: [403, "CROSS_COLLEGE_FACULTY_FORBIDDEN", "Faculty member belongs to a different College. Cross-college assignment requires Registrar or Administrator override."],
      CROSS_COLLEGE_OVERRIDE_REQUIRED: [422, "CROSS_COLLEGE_OVERRIDE_REQUIRED", "Faculty member belongs to a different College. Please provide an override reason to proceed."]
    };
    const responseData = messages[caught.code || caught.message];
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

  async function getStudentAssistantDashboard(request, response, context) {
    const session = await requirePermission(request, context, "portal.access.student_assistant");
    try {
      const data = await studentAssistantStore.dashboard(session.user.id);
      sendJson(response, 200, { data });
    } catch (caught) {
      if (caught.message === "STUDENT_ASSISTANT_ASSIGNMENT_REQUIRED") {
        error(403, "STUDENT_ASSISTANT_ASSIGNMENT_REQUIRED", "No active department assignment found for this Student Assistant account.");
      }
      throw caught;
    }
  }

  async function listStudentAssistantApplications(request, response, context, url) {
    const session = await requirePermission(request, context, "portal.access.student_assistant");
    const filter = url.searchParams.get("filter") || "PENDING";
    try {
      const applications = await studentAssistantStore.enrollmentApplications(session.user.id, filter);
      sendJson(response, 200, { data: { applications } });
    } catch (caught) {
      if (caught.message === "STUDENT_ASSISTANT_ASSIGNMENT_REQUIRED") {
        error(403, "STUDENT_ASSISTANT_ASSIGNMENT_REQUIRED", "No active department assignment found for this Student Assistant account.");
      }
      throw caught;
    }
  }

  async function getStudentAssistantApplicationDetail(request, response, context, applicationId) {
    const session = await requirePermission(request, context, "portal.access.student_assistant");
    try {
      const data = await studentAssistantStore.enrollmentApplicationDetail(session.user.id, applicationId);
      sendJson(response, 200, { data });
    } catch (caught) {
      if (caught.message === "STUDENT_ASSISTANT_ASSIGNMENT_REQUIRED") {
        error(403, "STUDENT_ASSISTANT_ASSIGNMENT_REQUIRED", "No active department assignment found for this Student Assistant account.");
      }
      if (caught.message === "UNAUTHORIZED_DEPARTMENT_ACCESS") {
        error(403, "UNAUTHORIZED_DEPARTMENT_ACCESS", "This application does not belong to your assigned department.");
      }
      if (caught.message === "APPLICATION_NOT_READY_FOR_ENCODING") {
        error(409, "APPLICATION_NOT_READY_FOR_ENCODING", "This application is not approved for encoding by the Program Head.");
      }
      if (caught.code === "ENROLLMENT_APPLICATION_NOT_FOUND" || caught.message === "ENROLLMENT_APPLICATION_NOT_FOUND") {
        error(404, "APPLICATION_NOT_FOUND", "Enrollment application not found.");
      }
      throw caught;
    }
  }

  async function encodeStudentAssistantSubjects(request, response, context, applicationId) {
    const session = await requireStatePermission(request, context, "portal.access.student_assistant");
    const body = await readJson(request, config.bodyLimitBytes);
    try {
      const result = await studentAssistantStore.encodeSubjects(session.user.id, applicationId, body);
      await audit(context, request, "student_assistant.subjects_encoded", "success", {
        actorUserId: session.user.id,
        metadata: { applicationId, subjectCount: result.encoding?.assignments?.length }
      });
      sendJson(response, 200, { data: result });
    } catch (caught) {
      if (caught.message === "STUDENT_ASSISTANT_ASSIGNMENT_REQUIRED") {
        error(403, "STUDENT_ASSISTANT_ASSIGNMENT_REQUIRED", "No active department assignment found for this Student Assistant account.");
      }
      if (caught.message === "UNAUTHORIZED_DEPARTMENT_ACCESS") {
        error(403, "UNAUTHORIZED_DEPARTMENT_ACCESS", "This application does not belong to your assigned department.");
      }
      if (caught.message === "APPLICATION_NOT_READY_FOR_ENCODING") {
        error(409, "APPLICATION_NOT_READY_FOR_ENCODING", "This application is not approved for encoding by the Program Head.");
      }
      if (caught.message === "APPLICATION_NOT_FOUND") {
        error(404, "APPLICATION_NOT_FOUND", "Enrollment application not found.");
      }
      if (caught.message === "INCOMPLETE_SUBJECT_ENCODING") {
        error(422, "INCOMPLETE_SUBJECT_ENCODING", "Every approved subject must be assigned a class section.");
      }
      if (caught.message === "DUPLICATE_SUBJECT_ASSIGNMENT") {
        error(422, "DUPLICATE_SUBJECT_ASSIGNMENT", "Each subject can only be assigned once.");
      }
      if (caught.message === "INVALID_SUBJECT_ASSIGNMENT" || caught.message === "INVALID_OFFERING_ASSIGNMENT") {
        error(422, "SECTION_ASSIGNMENTS_INVALID", "Select a valid open offering for each approved subject.");
      }
      if (caught.message === "SECTION_UNAVAILABLE") {
        error(409, "SECTION_UNAVAILABLE", "A selected section is full. Please choose another section.");
      }
      throw caught;
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

  async function listProgramHeadOfferings(request, response, context, url) {
    const session = await requirePermission(request, context, "portal.access.program_head");
    try {
      const academicTermId = url.searchParams.get("academicTermId") || undefined;
      const status = url.searchParams.get("status") || undefined;
      const query = url.searchParams.get("query") || undefined;
      const offerings = await programHeadStore.listOfferings(session.user.id, { academicTermId, status, query });
      sendJson(response, 200, { data: { offerings } });
    } catch (caught) {
      handleProgramHeadError(caught);
    }
  }

  async function updateProgramHeadOffering(request, response, context, offeringId) {
    const session = await requireStatePermission(request, context, "portal.access.program_head");
    const body = await readJson(request, config.bodyLimitBytes);
    try {
      const offering = await programHeadStore.updateOffering(session.user.id, offeringId, body);
      await audit(context, request, "program_head.offering_updated", "success", {
        actorUserId: session.user.id,
        metadata: { offeringId, updates: body }
      });
      sendJson(response, 200, { data: { offering } });
    } catch (caught) {
      handleProgramHeadError(caught);
    }
  }

  async function closeProgramHeadOffering(request, response, context, offeringId) {
    const session = await requireStatePermission(request, context, "portal.access.program_head");
    try {
      const offering = await programHeadStore.closeOffering(session.user.id, offeringId);
      await audit(context, request, "program_head.offering_closed", "success", {
        actorUserId: session.user.id,
        metadata: { offeringId }
      });
      sendJson(response, 200, { data: { offering } });
    } catch (caught) {
      handleProgramHeadError(caught);
    }
  }

  async function archiveProgramHeadOffering(request, response, context, offeringId) {
    const session = await requireStatePermission(request, context, "portal.access.program_head");
    try {
      const offering = await programHeadStore.archiveOffering(session.user.id, offeringId);
      await audit(context, request, "program_head.offering_archived", "success", {
        actorUserId: session.user.id,
        metadata: { offeringId }
      });
      sendJson(response, 200, { data: { offering } });
    } catch (caught) {
      handleProgramHeadError(caught);
    }
  }

  async function unarchiveProgramHeadOffering(request, response, context, offeringId) {
    const session = await requireStatePermission(request, context, "portal.access.program_head");
    try {
      const offering = await programHeadStore.unarchiveOffering(session.user.id, offeringId);
      await audit(context, request, "program_head.offering_restored", "success", {
        actorUserId: session.user.id,
        metadata: { offeringId }
      });
      sendJson(response, 200, { data: { offering } });
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
      if (caught?.code === "P2002") error(409, "APPLICATION_CONFLICT", "The enrollment application changed while it was being submitted. Please refresh and try again.");
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
      if (caught.message === "STUDENT_ASSISTANT_ENCODING_REQUIRED") error(409, "STUDENT_ASSISTANT_ENCODING_REQUIRED", "The Student Assistant must encode every subject before Registrar verification.");
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

  async function overrideStudentProgram(request, response, context, studentId) {
    const session = await requireStatePermission(request, context, "APPROVE_STUDENT_APPLICATION");
    const body = await readJson(request, config.bodyLimitBytes);
    try {
      const result = await registrarStore.overrideStudentProgram(
        studentId,
        session.user.id,
        publicUser(session.user).primaryRole,
        body
      );
      await audit(context, request, "academic_assignment.overridden", "success", {
        actorUserId: session.user.id,
        targetUserId: result.student.userId,
        resourceType: "student",
        resourceId: result.student.id,
        metadata: {
          action: "Academic Assignment Override",
          oldProgram: result.oldProgram?.code ?? "None",
          newProgram: result.newProgram.code,
          oldCurriculum: result.oldCurriculum?.code ?? "None",
          newCurriculum: result.newCurriculum.code,
          reason: body?.reason,
          changedBy: session.user.displayName || session.user.username || "Registrar"
        }
      });
      sendJson(response, 200, { data: { student: result.student } });
    } catch (caught) {
      if (caught.message === "STUDENT_NOT_FOUND") error(404, "STUDENT_NOT_FOUND", "Student not found.");
      if (caught.message === "OVERRIDE_REASON_REQUIRED") error(422, "OVERRIDE_REASON_REQUIRED", "A reason for overriding the academic assignment is required.");
      if (caught.message === "PROGRAM_AND_CURRICULUM_REQUIRED") error(422, "PROGRAM_AND_CURRICULUM_REQUIRED", "Both Program and Curriculum are required.");
      if (caught.message === "PROGRAM_INVALID") error(422, "PROGRAM_INVALID", "Selected program is invalid or inactive.");
      if (caught.message === "CURRICULUM_INVALID") error(422, "CURRICULUM_INVALID", "Selected curriculum is invalid or does not belong to the selected program.");
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

  function handleRegistrarOfferingError(caught) {
    if (caught.message === "OFFERING_DUPLICATE") error(409, "OFFERING_DUPLICATE", "An offering with this code already exists for this term.");
    if (caught.message === "SCHEDULE_CONFLICT") error(409, "SCHEDULE_CONFLICT", "Schedule conflict: instructor or room is already booked for this timeslot.");
    if (caught.message === "SECTION_CONFLICT") error(409, "SECTION_CONFLICT", "Section conflict: section is assigned to another curriculum or year level.");
    if (caught.message === "OFFERING_INVALID") error(422, "OFFERING_INVALID", "Invalid offering data provided.");
    if (caught.message === "OFFERING_NOT_FOUND") error(404, "OFFERING_NOT_FOUND", "Course offering not found.");
    if (caught.message === "OFFERING_HAS_ENROLLMENTS") error(409, "OFFERING_HAS_ENROLLMENTS", "Cannot delete an offering that has enrolled students.");
    if (caught.message === "SECTION_CODE_INVALID") error(422, "SECTION_CODE_INVALID", "Section code format is invalid.");
    if (caught.message === "OFFERING_CODE_INVALID") error(422, "OFFERING_CODE_INVALID", "Offering code format is invalid.");
    if (caught.message === "SCHEDULE_INVALID") error(422, "SCHEDULE_INVALID", "Invalid schedule times or weekday.");
    if (caught.message === "ACADEMIC_TERM_INVALID") error(422, "ACADEMIC_TERM_INVALID", "Academic term is invalid or closed.");
    if (caught.message === "CURRICULUM_NOT_FOUND") error(404, "CURRICULUM_NOT_FOUND", "Curriculum not found.");
    if (caught.message === "CURRICULUM_SUBJECT_NOT_FOUND") error(404, "CURRICULUM_SUBJECT_NOT_FOUND", "Subject not found in selected curriculum.");
    if (caught.message === "FACULTY_INVALID") error(422, "FACULTY_INVALID", "Selected faculty member is not found or inactive.");
    if (caught.message === "ROOM_INVALID") error(422, "ROOM_INVALID", "Selected room is not found or inactive.");
    if (caught.message === "UNAUTHORIZED_OFFERING_ACCESS") error(403, "FORBIDDEN", "Unauthorized offering access.");
    if (caught.message === "CROSS_COLLEGE_FACULTY_FORBIDDEN" || caught.code === "CROSS_COLLEGE_FACULTY_FORBIDDEN") {
      error(403, "CROSS_COLLEGE_FACULTY_FORBIDDEN", "Faculty member belongs to a different College. Cross-college assignment requires Registrar or Administrator override.");
    }
    if (caught.message === "CROSS_COLLEGE_OVERRIDE_REQUIRED" || caught.code === "CROSS_COLLEGE_OVERRIDE_REQUIRED") {
      error(422, "CROSS_COLLEGE_OVERRIDE_REQUIRED", "Faculty member belongs to a different College. Please provide an override reason to proceed.");
    }
    throw caught;
  }

  async function listRegistrarSubjects(request, response, context, url) {
    await requirePermission(request, context, "VIEW_STUDENT_APPLICATION");
    const programId = url.searchParams.get("programId") || undefined;
    const query = url.searchParams.get("query") || undefined;
    const subjects = await registrarStore.listSubjects({ programId, query });
    sendJson(response, 200, { data: { subjects } });
  }

  async function listRegistrarOfferings(request, response, context, url) {
    await requirePermission(request, context, "VIEW_STUDENT_APPLICATION");
    const academicTermId = url.searchParams.get("academicTermId") || undefined;
    const programId = url.searchParams.get("programId") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const query = url.searchParams.get("query") || undefined;
    const offerings = await registrarStore.listOfferings({ academicTermId, programId, status, query });
    sendJson(response, 200, { data: { offerings } });
  }

  async function getRegistrarOfferingOptions(request, response, context) {
    await requirePermission(request, context, "VIEW_STUDENT_APPLICATION");
    const options = await registrarStore.offeringFormData();
    sendJson(response, 200, { data: options });
  }

  async function createRegistrarOffering(request, response, context) {
    const session = await requireStatePermission(request, context, "CREATE_ENROLLMENT_PERIOD");
    const body = await readJson(request, config.bodyLimitBytes);
    try {
      const offering = await registrarStore.createOffering(body, session.user.id);
      await audit(context, request, "registrar.offering_created", "success", {
        actorUserId: session.user.id,
        metadata: { offeringId: offering.id, offeringCode: offering.offeringCode }
      });
      if (offering.isCrossCollegeOverride) {
        await audit(context, request, "faculty.cross_college_override", "success", {
          actorUserId: session.user.id,
          metadata: { offeringId: offering.id, facultyId: body.facultyId, overrideReason: body.overrideReason }
        });
      }
      sendJson(response, 201, { data: { offering } });
    } catch (caught) {
      handleRegistrarOfferingError(caught);
    }
  }

  async function updateRegistrarOffering(request, response, context, offeringId) {
    const session = await requireStatePermission(request, context, "UPDATE_ENROLLMENT_PERIOD");
    const body = await readJson(request, config.bodyLimitBytes);
    try {
      const offering = await registrarStore.updateOffering(offeringId, body, session.user.id);
      await audit(context, request, "registrar.offering_updated", "success", {
        actorUserId: session.user.id,
        metadata: { offeringId, updates: body }
      });
      if (offering.isCrossCollegeOverride) {
        await audit(context, request, "faculty.cross_college_override", "success", {
          actorUserId: session.user.id,
          metadata: { offeringId, facultyId: body.facultyId, overrideReason: body.overrideReason }
        });
      }
      sendJson(response, 200, { data: { offering } });
    } catch (caught) {
      handleRegistrarOfferingError(caught);
    }
  }

  async function closeRegistrarOffering(request, response, context, offeringId) {
    const session = await requireStatePermission(request, context, "CLOSE_ENROLLMENT");
    try {
      const offering = await registrarStore.closeOffering(offeringId, session.user.id);
      await audit(context, request, "registrar.offering_closed", "success", {
        actorUserId: session.user.id,
        metadata: { offeringId }
      });
      sendJson(response, 200, { data: { offering } });
    } catch (caught) {
      handleRegistrarOfferingError(caught);
    }
  }

  async function archiveRegistrarOffering(request, response, context, offeringId) {
    const session = await requireStatePermission(request, context, "CLOSE_ENROLLMENT");
    try {
      const offering = await registrarStore.archiveOffering(offeringId, session.user.id);
      await audit(context, request, "registrar.offering_archived", "success", {
        actorUserId: session.user.id,
        metadata: { offeringId }
      });
      sendJson(response, 200, { data: { offering } });
    } catch (caught) {
      handleRegistrarOfferingError(caught);
    }
  }

  async function unarchiveRegistrarOffering(request, response, context, offeringId) {
    const session = await requireStatePermission(request, context, "CREATE_ENROLLMENT_PERIOD");
    try {
      const offering = await registrarStore.unarchiveOffering(offeringId, session.user.id);
      await audit(context, request, "registrar.offering_restored", "success", {
        actorUserId: session.user.id,
        metadata: { offeringId }
      });
      sendJson(response, 200, { data: { offering } });
    } catch (caught) {
      handleRegistrarOfferingError(caught);
    }
  }

  async function deleteRegistrarOffering(request, response, context, offeringId) {
    const session = await requireStatePermission(request, context, "CREATE_ENROLLMENT_PERIOD");
    try {
      const result = await registrarStore.deleteOffering(offeringId, session.user.id);
      await audit(context, request, "registrar.offering_deleted", "success", {
        actorUserId: session.user.id,
        metadata: { offeringId }
      });
      sendJson(response, 200, { data: result });
    } catch (caught) {
      handleRegistrarOfferingError(caught);
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
        STUDENT_PROGRAM_MISMATCH: [422, "STUDENT_PROGRAM_MISMATCH", "Enrollment must use the program assigned to your student record."],
        TERM_INVALID: [422, "TERM_INVALID", "Select an available academic term."],
        ENROLLMENT_CLOSED: [409, "ENROLLMENT_CLOSED", "Enrollment is not open for the selected academic term."],
        ENTRANCE_FEE_REQUIRED: [402, "ENTRANCE_FEE_REQUIRED", "Pay and verify the entrance fee before submitting enrollment."],
        ENTRANCE_FEE_NOT_CONFIGURED: [503, "ENTRANCE_FEE_NOT_CONFIGURED", "The entrance fee is not configured."],
        SUBJECT_SELECTION_INVALID: [422, "SUBJECT_SELECTION_INVALID", "Select only subjects from the curriculum for the chosen program, year, and term."],
        SUBJECT_SELECTION_REQUIRED: [422, "SUBJECT_SELECTION_REQUIRED", "Select at least one subject before submitting your enrollment."],
        PREREQUISITE_NOT_MET: [422, "PREREQUISITE_NOT_MET", "One or more selected subjects have prerequisites that are failed, incomplete, or not yet taken."],
        COREQUISITE_NOT_MET: [422, "COREQUISITE_NOT_MET", "Select every required corequisite or complete it with a passing final grade."],
        MAX_UNITS_EXCEEDED: [422, "MAX_UNITS_EXCEEDED", "The selected load exceeds the 29-unit enrollment limit."],
        YEAR_LEVEL_INVALID: [422, "YEAR_LEVEL_INVALID", "Select a valid year level."],
        STUDENT_YEAR_LEVEL_MISMATCH: [422, "STUDENT_YEAR_LEVEL_MISMATCH", "Enrollment must use the current year level in your student record."],
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
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    const queryAppId = url.searchParams.get("applicationId");
    const targetAppId = queryAppId || appInfo.application?.id || null;
    const documents = await documentStore.getStudentDocuments(appInfo.student.id, targetAppId);
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

    const appInfo = await documentStore.getStudentApplicationById(session.user.id, applicationId);
    if (!appInfo?.student) error(404, "STUDENT_NOT_FOUND", "No student profile is linked to this account.");
    if (!appInfo.application) error(403, "APPLICATION_MISMATCH", "Document does not belong to your application.");

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
      if (caught.message === "APPLICATION_LOCKED") {
        error(409, "APPLICATION_LOCKED", "Documents cannot be uploaded or replaced while your application is under review.");
      }
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

  async function submitAcademicImportRequest(request, response, context) {
    const session = await requireStateAuthentication(request, context);
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

    const targetProgramId = fields.targetProgramId;
    const previousSchool = typeof fields.previousSchool === "string" && fields.previousSchool.trim()
      ? fields.previousSchool.trim()
      : null;

    if (!targetProgramId) {
      error(422, "PROGRAM_SELECTION_REQUIRED", "Please select a target program for credit evaluation.");
    }
    if (!file) {
      error(422, "FILE_REQUIRED", "Academic record or transcript file is required.");
    }

    const student = await database.student.findFirst({
      where: { userId: session.user.id }
    });
    if (!student) {
      error(404, "STUDENT_NOT_FOUND", "No student profile is linked to this account.");
    }

    try {
      const importRequest = await academicImportService.createRequest({
        studentId: student.id,
        targetProgramId,
        previousSchool,
        file,
        userId: session.user.id
      });

      await audit(context, request, "academic_import.request_submitted", "success", {
        actorUserId: session.user.id,
        targetUserId: session.user.id,
        metadata: {
          requestId: importRequest.id,
          studentId: student.id,
          targetProgramId
        }
      });

      sendJson(response, 201, { data: { request: importRequest } });
    } catch (caught) {
      if (caught.message === "FILE_EMPTY") error(422, "FILE_EMPTY", "The selected file is empty.");
      if (caught.message === "FILE_TOO_LARGE") error(413, "FILE_TOO_LARGE", "The uploaded file exceeds the 10 MB limit.");
      if (caught.message === "INVALID_FILE_EXTENSION") {
        error(415, "INVALID_FILE_EXTENSION", "Upload a PDF, PNG, JPG, or JPEG file.");
      }
      if (caught.message === "INVALID_MIME_TYPE" || caught.message === "FILE_CONTENT_MISMATCH") {
        error(415, "INVALID_FILE_TYPE", "The file contents must be a valid PDF, PNG, JPG, or JPEG document.");
      }
      if (caught.message === "PROGRAM_NOT_FOUND") error(404, "PROGRAM_NOT_FOUND", "Target program not found.");
      throw caught;
    }
  }

  async function listAcademicImportRequests(request, response, context, url) {
    const session = await requireAuthentication(request, context);
    const roles = store.rolesForUser(session.user).map((r) => r.slug);
    const isStaff = roles.some((r) => ["administrator", "registrar", "dean", "program_head"].includes(r));

    let studentId = null;
    if (!isStaff) {
      const student = await database.student.findFirst({
        where: { userId: session.user.id }
      });
      if (!student) {
        return sendJson(response, 200, { data: { requests: [] } });
      }
      studentId = student.id;
    }

    const statusParam = url.searchParams.get("status");
    const searchParam = url.searchParams.get("search");
    const requests = await academicImportService.listRequests({
      studentId,
      status: statusParam || null,
      search: searchParam || null
    });

    sendJson(response, 200, { data: { requests } });
  }

  async function getAcademicImportRequest(request, response, context, requestId) {
    const session = await requireAuthentication(request, context);
    const roles = store.rolesForUser(session.user).map((r) => r.slug);
    const isStaff = roles.some((r) => ["administrator", "registrar", "dean", "program_head"].includes(r));

    const importRequest = await academicImportService.getRequest(requestId);
    if (!importRequest) {
      error(404, "REQUEST_NOT_FOUND", "Academic record import request not found.");
    }

    if (!isStaff && importRequest.student.userId !== session.user.id) {
      error(403, "FORBIDDEN", "You are not authorized to view this request.");
    }

    sendJson(response, 200, { data: { request: importRequest } });
  }

  async function verifyAcademicImportRequest(request, response, context, requestId) {
    const session = await requireStateAuthentication(request, context);
    const roles = store.rolesForUser(session.user).map((r) => r.slug);
    if (!roles.some((r) => ["administrator", "registrar"].includes(r))) {
      error(403, "FORBIDDEN", "Only Registrar or Administrator can verify academic record import requests.");
    }

    const body = await readJson(request, config.bodyLimitBytes);
    const action = body.action;
    const remarks = body.remarks || body.rejectionReason || "";
    const rejectionReason = body.rejectionReason || body.remarks || "";

    try {
      const updated = await academicImportService.verifyRequest({
        requestId,
        action,
        remarks,
        rejectionReason,
        reviewerUserId: session.user.id
      });

      await audit(context, request, "academic_import.request_verified", "success", {
        actorUserId: session.user.id,
        targetUserId: updated.student?.userId,
        metadata: {
          requestId,
          action,
          remarks
        }
      });

      sendJson(response, 200, { data: { request: updated } });
    } catch (caught) {
      if (caught.message === "REQUEST_NOT_FOUND") error(404, "REQUEST_NOT_FOUND", "Request not found.");
      if (caught.message === "REMARKS_REQUIRED_ON_REJECTION") error(422, "REMARKS_REQUIRED", "Remarks are required when rejecting a request.");
      if (caught.message === "INVALID_VERIFICATION_ACTION") error(422, "INVALID_ACTION", "Action must be APPROVE or REJECT.");
      throw caught;
    }
  }

  async function processAcademicImportAI(request, response, context, requestId) {
    const session = await requireStateAuthentication(request, context);
    const roles = store.rolesForUser(session.user).map((r) => r.slug);
    if (!roles.some((r) => ["administrator", "registrar"].includes(r))) {
      error(403, "FORBIDDEN", "Only Registrar or Administrator can trigger AI processing.");
    }

    try {
      const updated = await academicImportService.processAI(requestId);
      await audit(context, request, "academic_import.ai_processed", "success", {
        actorUserId: session.user.id,
        targetUserId: updated.student?.userId,
        metadata: {
          requestId,
          detectedRecordsCount: updated.matchedData?.records?.length || 0,
          extractionMethod: updated.extractedData?.extractionMethod || "DETERMINISTIC"
        }
      });

      sendJson(response, 200, { data: { request: updated } });
    } catch (caught) {
      await audit(context, request, "academic_import.ai_processed", "failure", {
        actorUserId: session.user.id,
        metadata: {
          requestId,
          error: caught.message
        }
      });
      if (caught.message === "REQUEST_NOT_FOUND") error(404, "REQUEST_NOT_FOUND", "Request not found.");
      if (caught.message === "FIRST_RUN_REQUIRES_REGISTRAR_APPROVAL") {
        error(422, "APPROVAL_REQUIRED", "Document must be verified by Registrar before running AI matching.");
      }
      error(422, "EXTRACTION_FAILED", caught.message || "No academic records could be extracted. AI/OCR processing failed or the document is unreadable.");
    }
  }

  async function getAcademicImportPreview(request, response, context, requestId) {
    const session = await requireAuthentication(request, context);
    const roles = store.rolesForUser(session.user).map((r) => r.slug);
    if (!roles.some((r) => ["administrator", "registrar"].includes(r))) {
      error(403, "FORBIDDEN", "Only Registrar or Administrator can view import preview.");
    }

    try {
      const preview = await academicImportService.getPreview(requestId);
      sendJson(response, 200, { data: { preview } });
    } catch (caught) {
      if (caught.message === "REQUEST_NOT_FOUND") error(404, "REQUEST_NOT_FOUND", "Request not found.");
      throw caught;
    }
  }

  async function commitAcademicImport(request, response, context, requestId) {
    const session = await requireStateAuthentication(request, context);
    const roles = store.rolesForUser(session.user).map((r) => r.slug);
    if (!roles.some((r) => ["administrator", "registrar"].includes(r))) {
      error(403, "FORBIDDEN", "Only Registrar or Administrator can commit academic records.");
    }

    const body = await readJson(request, config.bodyLimitBytes);
    const resolutions = Array.isArray(body.resolutions) ? body.resolutions : [];

    try {
      const result = await academicImportService.commitImport({
        requestId,
        resolutions,
        reviewerUserId: session.user.id
      });

      const targetUserId = result.request?.student?.userId || result.targetUserId || null;
      try {
        await audit(context, request, "academic_import.records_imported", "success", {
          actorUserId: session.user.id,
          targetUserId,
          metadata: {
            requestId,
            studentId: result.studentId || result.request?.studentId,
            importBatchId: result.importBatchId,
            importedCount: result.importedCount,
            skippedCount: result.skippedCount
          }
        });
      } catch (auditError) {
        console.error("[AcademicImport] Audit logging failed for commit:", auditError);
      }

      sendJson(response, 200, { data: result });
    } catch (caught) {
      if (caught.message === "REQUEST_NOT_FOUND") error(404, "REQUEST_NOT_FOUND", "Request not found.");
      if (caught.message === "ALREADY_IMPORTED" || caught.message === "CANNOT_COMMIT_IN_STATUS_IMPORTED") {
        error(409, "ALREADY_IMPORTED", "Academic records were already imported.");
      }
      if (caught.message?.startsWith("CANNOT_COMMIT_IN_STATUS_")) {
        error(422, "INVALID_STATUS", `Cannot commit academic record import in status ${caught.message.replace("CANNOT_COMMIT_IN_STATUS_", "")}.`);
      }
      throw caught;
    }
  }

  async function viewAcademicImportDocument(request, response, context, requestId) {
    const session = await requireAuthentication(request, context);
    const importRequest = await academicImportService.getRequest(requestId);
    if (!importRequest) error(404, "REQUEST_NOT_FOUND", "Request not found.");

    const roles = store.rolesForUser(session.user).map((r) => r.slug);
    const isStaff = roles.some((r) => ["administrator", "registrar", "dean", "program_head"].includes(r));
    if (!isStaff && importRequest.student.userId !== session.user.id) {
      error(403, "FORBIDDEN", "You are not authorized to view this document.");
    }

    const document = importRequest.document;
    if (!document || !document.filePath) error(404, "DOCUMENT_NOT_FOUND", "Document file not available.");

    const storageRoot = resolve(config.documentRoot);
    const filePath = resolve(storageRoot, document.filePath);
    if (filePath !== storageRoot && !filePath.startsWith(`${storageRoot}${sep}`)) {
      error(403, "DOCUMENT_PATH_INVALID", "The document path was rejected.");
    }

    try {
      const body = await documentStorage.readFile(document.filePath);
      const extension = extname(document.originalFileName || document.storedFileName || filePath).toLowerCase();
      const contentType = document.mimeType || DOCUMENT_CONTENT_TYPES.get(extension) || "application/octet-stream";
      const safeName = String(document.originalFileName || `academic_record_${requestId}${extension}`)
        .replace(/[\r\n"]/g, "_")
        .slice(0, 180);

      await audit(context, request, "academic_import.document_viewed", "success", {
        actorUserId: session.user.id,
        metadata: { requestId, documentId: document.id }
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

  // ── Faculty Management Error Handler ────────────────────────────────

  function handleFacultyError(caught) {
    const messages = {
      NAME_REQUIRED: [422, "NAME_REQUIRED", "First name and last name are required."],
      EMPLOYEE_NUMBER_REQUIRED: [422, "EMPLOYEE_NUMBER_REQUIRED", "Employee ID is required."],
      EMAIL_INVALID: [422, "EMAIL_INVALID", "Valid institutional email is required."],
      COLLEGE_REQUIRED: [422, "COLLEGE_REQUIRED", "College assignment is required."],
      COLLEGE_NOT_FOUND: [404, "COLLEGE_NOT_FOUND", "Selected college does not exist or is inactive."],
      EMPLOYEE_NUMBER_EXISTS: [409, "EMPLOYEE_NUMBER_EXISTS", "A faculty member with that employee number already exists."],
      ACCOUNT_EXISTS: [409, "ACCOUNT_EXISTS", "A user account with that username or email already exists."],
      PASSWORD_POLICY: [422, "PASSWORD_POLICY", caught?.message || "Password does not meet policy."],
      ROLE_NOT_FOUND: [500, "ROLE_NOT_FOUND", "Faculty role is not configured in the system."],
      FACULTY_NOT_FOUND: [404, "FACULTY_NOT_FOUND", "Faculty member not found."],
      UNAUTHORIZED_CLASS_ACCESS: [403, "UNAUTHORIZED_CLASS_ACCESS", "You are not assigned to this class."],
      GRADES_EMPTY: [422, "GRADES_EMPTY", "No grade data provided."],
      INVALID_ENROLLMENT_ITEM: [422, "INVALID_ENROLLMENT_ITEM", caught?.message || "Invalid enrollment item."],
      GRADE_VALUE_INVALID: [422, "GRADE_VALUE_INVALID", caught?.message || "Invalid grade value."],
      GRADE_ALREADY_POSTED: [409, "GRADE_ALREADY_POSTED", "Cannot modify a grade that has already been posted."],
      GRADE_ALREADY_SUBMITTED: [409, "GRADE_ALREADY_SUBMITTED", "Cannot revert a submitted grade to draft."],
      INCOMPLETE_GRADE_SHEET: [409, "INCOMPLETE_GRADE_SHEET", "Every enrolled student must have a completed grade before this grade sheet can proceed."],
      NO_APPROVED_GRADES: [404, "NO_APPROVED_GRADES", "No Dean-approved grades found for this offering."],
      NO_SUBMITTED_GRADES: [404, "NO_SUBMITTED_GRADES", "No submitted grades found for this offering."],
      OFFERING_NOT_FOUND: [404, "OFFERING_NOT_FOUND", "Course offering not found."],
      CROSS_COLLEGE_FACULTY_FORBIDDEN: [403, "CROSS_COLLEGE_FACULTY_FORBIDDEN", "Faculty member belongs to a different College. Cross-college assignment requires Registrar or Administrator override."],
      CROSS_COLLEGE_OVERRIDE_REQUIRED: [422, "CROSS_COLLEGE_OVERRIDE_REQUIRED", "Faculty member belongs to a different College. Please provide an override reason to proceed."],
      UNAUTHORIZED_COLLEGE_OFFERING: [403, "UNAUTHORIZED_COLLEGE_OFFERING", "This course offering does not belong to your assigned college."],
      UNAUTHORIZED_COLLEGE_ENROLLMENT: [403, "UNAUTHORIZED_COLLEGE_ENROLLMENT", "This student enrollment does not belong to your assigned college."],
      DEAN_ASSIGNMENT_REQUIRED: [403, "DEAN_ASSIGNMENT_REQUIRED", "No active college assignment found for this Dean account."],
      REMARKS_REQUIRED: [422, "REMARKS_REQUIRED", "Remarks are required when returning grades to faculty."],
      OVERRIDE_REASON_REQUIRED: [422, "OVERRIDE_REASON_REQUIRED", "An override reason is required when overriding prerequisites."],
      OVERRIDE_INVALID: [422, "OVERRIDE_INVALID", "One or more selected subjects are not eligible for prerequisite override."],
      ENROLLMENT_NOT_REVIEWABLE: [422, "ENROLLMENT_NOT_REVIEWABLE", "Enrollment is not in reviewable status."],
      ENROLLMENT_RULES_FAILED: [422, "ENROLLMENT_RULES_FAILED", "Enrollment evaluation rules failed."]
    };
    if (caught?.status && typeof caught.status === "number") {
      error(caught.status, caught.code || "REQUEST_FAILED", caught.message || "An error occurred.");
    }
    const code = caught?.code || caught?.message;
    const mapped = messages[code];
    if (mapped) error(mapped[0], mapped[1], caught.message || mapped[2]);
    throw caught;
  }

  // ── Admin Faculty Endpoints ─────────────────────────────────────────

  async function listAdminColleges(request, response, context) {
    await requirePermission(request, context, "administrator.manage_faculty");
    const colleges = await adminFacultyService.listColleges();
    sendJson(response, 200, { data: { colleges } });
  }

  async function listAdminFaculty(request, response, context) {
    await requirePermission(request, context, "administrator.manage_faculty");
    const faculty = await adminFacultyService.listFaculty();
    sendJson(response, 200, { data: { faculty } });
  }

  async function createAdminFaculty(request, response, context) {
    const session = await requireStatePermission(request, context, "administrator.manage_faculty");
    const body = await readJson(request, config.bodyLimitBytes);
    try {
      const result = await adminFacultyService.createFaculty(body, session.user.id);
      await audit(context, request, "faculty.created", "success", {
        actorUserId: session.user.id,
        targetUserId: result.userId,
        metadata: {
          facultyId: result.id,
          employeeNumber: result.employeeNumber,
          collegeCode: result.college.code
        }
      });
      sendJson(response, 201, { data: result });
    } catch (caught) {
      handleFacultyError(caught);
    }
  }

  async function updateAdminFaculty(request, response, context, facultyId) {
    const session = await requireStatePermission(request, context, "administrator.manage_faculty");
    const body = await readJson(request, config.bodyLimitBytes);
    try {
      const result = await adminFacultyService.updateFaculty(facultyId, body, session.user.id);
      await audit(context, request, "faculty.updated", "success", {
        actorUserId: session.user.id,
        targetUserId: result.userId,
        metadata: { facultyId: result.id, status: result.status }
      });
      sendJson(response, 200, { data: result });
    } catch (caught) {
      handleFacultyError(caught);
    }
  }

  // ── Teacher Workspace Endpoints ─────────────────────────────────────

  async function getFacultyClasses(request, response, context) {
    const session = await requirePermission(request, context, "teacher.view_classes");
    try {
      const classes = await facultyStore.getAssignedOfferings(session.user.id);
      sendJson(response, 200, { data: { classes } });
    } catch (caught) {
      handleFacultyError(caught);
    }
  }

  async function getFacultyClassRoster(request, response, context, offeringId) {
    const session = await requirePermission(request, context, "teacher.view_students");
    try {
      const roster = await facultyStore.getOfferingRoster(session.user.id, offeringId);
      sendJson(response, 200, { data: roster });
    } catch (caught) {
      handleFacultyError(caught);
    }
  }

  async function saveFacultyGrades(request, response, context, offeringId) {
    const session = await requireStatePermission(request, context, "teacher.manage_grades");
    const body = await readJson(request, config.bodyLimitBytes);
    try {
      const result = await facultyStore.saveGrades(
        session.user.id,
        offeringId,
        body.grades,
        false
      );
      await audit(context, request, "grade.saved", "success", {
        actorUserId: session.user.id,
        metadata: { offeringId, savedCount: result.savedCount }
      });
      sendJson(response, 200, { data: result });
    } catch (caught) {
      handleFacultyError(caught);
    }
  }

  async function submitFacultyGrades(request, response, context, offeringId) {
    const session = await requireStatePermission(request, context, "teacher.submit_grades");
    const body = await readJson(request, config.bodyLimitBytes);
    try {
      const result = await facultyStore.saveGrades(
        session.user.id,
        offeringId,
        body.grades,
        true
      );
      await audit(context, request, "grade.submitted", "success", {
        actorUserId: session.user.id,
        metadata: { offeringId, savedCount: result.savedCount }
      });
      sendJson(response, 200, { data: result });
    } catch (caught) {
      handleFacultyError(caught);
    }
  }

  // ── Registrar Grade Approval Endpoints ──────────────────────────────

  async function getRegistrarGradeSubmissions(request, response, context) {
    await requirePermission(request, context, "registrar.approve_grades");
    const submissions = await gradeService.listPendingSubmissions();
    sendJson(response, 200, { data: { submissions } });
  }

  async function getRegistrarGradeSheet(request, response, context, offeringId) {
    await requirePermission(request, context, "registrar.approve_grades");
    try {
      const sheet = await gradeService.getOfferingGradeSheet(offeringId);
      sendJson(response, 200, { data: sheet });
    } catch (caught) {
      handleFacultyError(caught);
    }
  }

  async function approveRegistrarGrades(request, response, context, offeringId) {
    const session = await requireStatePermission(request, context, "registrar.approve_grades");
    await readJson(request, config.bodyLimitBytes).catch(() => ({}));
    try {
      const result = await gradeService.approveGrades(offeringId, session.user.id);
      await audit(context, request, "grade.approved", "success", {
        actorUserId: session.user.id,
        metadata: {
          offeringId,
          approvedCount: result.approvedCount,
          status: result.status
        }
      });
      sendJson(response, 200, { data: result });
    } catch (caught) {
      handleFacultyError(caught);
    }
  }

  async function returnRegistrarGrades(request, response, context, offeringId) {
    const session = await requireStatePermission(request, context, "registrar.approve_grades");
    const body = await readJson(request, config.bodyLimitBytes).catch(() => ({}));
    try {
      const result = await gradeService.returnGrades(offeringId, session.user.id, body?.remarks);
      await audit(context, request, "registrar.grades.returned", "success", {
        actorUserId: session.user.id,
        resourceType: "offering",
        resourceId: offeringId,
        metadata: { offeringId, returnedCount: result.returnedCount, remarks: result.remarks }
      });
      sendJson(response, 200, { data: result });
    } catch (caught) {
      handleFacultyError(caught);
    }
  }

  // ── Dean Endpoints ──────────────────────────────────────────────────

  async function getDeanOverview(request, response, context) {
    const session = await requirePermission(request, context, "portal.access.dean");
    try {
      const data = await deanStore.getDashboardOverview(session.user.id);
      sendJson(response, 200, { data: { overview: data, ...data } });
    } catch (caught) {
      handleFacultyError(caught);
    }
  }

  async function getDeanStudents(request, response, context, url) {
    const session = await requirePermission(request, context, "portal.access.dean");
    try {
      const search = url.searchParams.get("search") || "";
      const sort = url.searchParams.get("sort") || "name";
      const programId = url.searchParams.get("programId") || "";
      const yearLevel = url.searchParams.get("yearLevel") || null;
      const data = await deanStore.listCollegeStudents(session.user.id, { search, sort, programId, yearLevel });
      sendJson(response, 200, { data });
    } catch (caught) {
      handleFacultyError(caught);
    }
  }

  async function getDeanFaculty(request, response, context) {
    const session = await requirePermission(request, context, "portal.access.dean");
    try {
      const data = await deanStore.listCollegeFaculty(session.user.id);
      sendJson(response, 200, { data });
    } catch (caught) {
      handleFacultyError(caught);
    }
  }

  async function getDeanSchedules(request, response, context, url) {
    const session = await requirePermission(request, context, "portal.access.dean");
    try {
      const programId = url.searchParams.get("programId") || "";
      const data = await deanStore.listCollegeSchedules(session.user.id, { programId });
      sendJson(response, 200, { data });
    } catch (caught) {
      handleFacultyError(caught);
    }
  }

  async function getDeanGradeSubmissions(request, response, context) {
    const session = await requirePermission(request, context, "portal.access.dean");
    try {
      const data = await deanStore.listPendingGradeSubmissions(session.user.id);
      sendJson(response, 200, { data });
    } catch (caught) {
      handleFacultyError(caught);
    }
  }

  async function getDeanOfferingGradeSheet(request, response, context, offeringId) {
    const session = await requirePermission(request, context, "portal.access.dean");
    try {
      const sheet = await deanStore.getOfferingGradeSheet(session.user.id, offeringId);
      sendJson(response, 200, { data: sheet });
    } catch (caught) {
      handleFacultyError(caught);
    }
  }

  async function approveDeanGrades(request, response, context, offeringId) {
    const session = await requireStatePermission(request, context, "portal.access.dean");
    const body = await readJson(request, config.bodyLimitBytes).catch(() => ({}));
    try {
      const result = await deanStore.approveGrades(session.user.id, offeringId, body?.remarks);
      await audit(context, request, "dean.grades.approved", "success", {
        actorUserId: session.user.id,
        resourceType: "offering",
        resourceId: offeringId,
        metadata: {
          offeringId,
          approvedCount: result.approvedCount,
          status: result.status,
          collegeCode: result.collegeCode
        }
      });
      sendJson(response, 200, { data: result });
    } catch (caught) {
      handleFacultyError(caught);
    }
  }

  async function returnDeanGrades(request, response, context, offeringId) {
    const session = await requireStatePermission(request, context, "portal.access.dean");
    const body = await readJson(request, config.bodyLimitBytes);
    try {
      const result = await deanStore.returnGrades(session.user.id, offeringId, body?.remarks);
      await audit(context, request, "dean.grades.returned", "success", {
        actorUserId: session.user.id,
        resourceType: "offering",
        resourceId: offeringId,
        metadata: {
          offeringId,
          returnedCount: result.returnedCount,
          status: result.status,
          remarks: result.remarks
        }
      });
      sendJson(response, 200, { data: result });
    } catch (caught) {
      handleFacultyError(caught);
    }
  }

  async function getDeanPendingEvaluations(request, response, context) {
    const session = await requirePermission(request, context, "portal.access.dean");
    try {
      const data = await deanStore.listPendingEvaluations(session.user.id);
      sendJson(response, 200, { data });
    } catch (caught) {
      handleFacultyError(caught);
    }
  }

  async function getDeanEnrollmentEvaluation(request, response, context, enrollmentId) {
    const session = await requirePermission(request, context, "portal.access.dean");
    try {
      const evaluation = await deanStore.getEnrollmentEvaluation(session.user.id, enrollmentId);
      sendJson(response, 200, { data: { evaluation, ...evaluation } });
    } catch (caught) {
      handleFacultyError(caught);
    }
  }

  async function approveDeanEnrollmentEvaluation(request, response, context, enrollmentId) {
    const session = await requireStatePermission(request, context, "portal.access.dean");
    const body = await readJson(request, config.bodyLimitBytes).catch(() => ({}));
    try {
      const result = await deanStore.approveEnrollmentEvaluation(session.user.id, enrollmentId, body);
      await audit(context, request, "dean.evaluation.approved", "success", {
        actorUserId: session.user.id,
        resourceType: "enrollment",
        resourceId: enrollmentId,
        metadata: {
          enrollmentId,
          collegeCode: result.evaluatedBy?.collegeCode,
          overrideCount: Array.isArray(body?.overrideItemIds) ? body.overrideItemIds.length : 0
        }
      });
      sendJson(response, 200, { data: result });
    } catch (caught) {
      handleFacultyError(caught);
    }
  }

  async function handler(request, response) {
    const requestStartedAt = requestMonitor.begin();
    let pathname = "/";
    let context = null;
    let requestFinalized = false;
    const finalizeRequest = () => {
      if (requestFinalized) return;
      requestFinalized = true;
      const statusCode = response.writableFinished ? response.statusCode : 499;
      const measurement = requestMonitor.finish(requestStartedAt, statusCode);
      if (!measurement.slow) return;
      void systemLogger.logSystemEvent({
        severity: systemLogger.Severity.WARNING,
        category: systemLogger.Category.API,
        moduleName: "HTTP Server",
        requestId: context?.requestId,
        sessionId: context?.session?.id,
        userId: context?.session?.user?.id,
        ipHash: context?.ipHash,
        userAgent: cleanText(request.headers["user-agent"], 500),
        requestUrl: pathname,
        httpMethod: cleanText(request.method, 10),
        message: "Slow request detected",
        technicalDetail: { statusCode, thresholdMs: config.slowRequestThresholdMs },
        durationMs: measurement.durationMs
      });
    };
    response.once("finish", finalizeRequest);
    response.once("close", finalizeRequest);
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

    context = requestContext(request, pathname);
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
      if (method === "GET" && pathname === "/api/v1/auth/google/config") return await googleAuthConfig(request, response, context);
      if (method === "POST" && pathname === "/api/v1/auth/google/verify") return await googleAuthVerify(request, response, context);
      if (method === "POST" && pathname === "/api/v1/auth/google/register-student") return await googleRegisterStudent(request, response, context);
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

      // Academic Record Import Routes
      if (method === "POST" && pathname === "/api/v1/academic-import/requests") {
        return await submitAcademicImportRequest(request, response, context);
      }
      if (method === "GET" && pathname === "/api/v1/academic-import/requests") {
        return await listAcademicImportRequests(request, response, context, url);
      }
      const academicImportViewDocMatch = pathname.match(/^\/api\/v1\/academic-import\/requests\/([0-9a-f-]{36})\/document$/i);
      if ((method === "GET" || method === "HEAD") && academicImportViewDocMatch) {
        return await viewAcademicImportDocument(request, response, context, academicImportViewDocMatch[1]);
      }
      const academicImportVerifyMatch = pathname.match(/^\/api\/v1\/academic-import\/requests\/([0-9a-f-]{36})\/verify$/i);
      if (method === "POST" && academicImportVerifyMatch) {
        return await verifyAcademicImportRequest(request, response, context, academicImportVerifyMatch[1]);
      }
      const academicImportProcessMatch = pathname.match(/^\/api\/v1\/academic-import\/requests\/([0-9a-f-]{36})\/process-ai$/i);
      if (method === "POST" && academicImportProcessMatch) {
        return await processAcademicImportAI(request, response, context, academicImportProcessMatch[1]);
      }
      const academicImportPreviewMatch = pathname.match(/^\/api\/v1\/academic-import\/requests\/([0-9a-f-]{36})\/preview$/i);
      if (method === "GET" && academicImportPreviewMatch) {
        return await getAcademicImportPreview(request, response, context, academicImportPreviewMatch[1]);
      }
      const academicImportCommitMatch = pathname.match(/^\/api\/v1\/academic-import\/requests\/([0-9a-f-]{36})\/commit$/i);
      if (method === "POST" && academicImportCommitMatch) {
        return await commitAcademicImport(request, response, context, academicImportCommitMatch[1]);
      }
      const academicImportGetMatch = pathname.match(/^\/api\/v1\/academic-import\/requests\/([0-9a-f-]{36})$/i);
      if (method === "GET" && academicImportGetMatch) {
        return await getAcademicImportRequest(request, response, context, academicImportGetMatch[1]);
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
      if (method === "GET" && pathname === "/api/v1/program-head/offerings") {
        return await listProgramHeadOfferings(request, response, context, url);
      }
      if (method === "POST" && pathname === "/api/v1/program-head/offerings") {
        return await createProgramHeadOffering(request, response, context);
      }
      const programHeadOfferingMatch = pathname.match(/^\/api\/v1\/program-head\/offerings\/([0-9a-f-]{36})$/i);
      if (method === "PATCH" && programHeadOfferingMatch) {
        return await updateProgramHeadOffering(request, response, context, programHeadOfferingMatch[1]);
      }
      const programHeadOfferingCloseMatch = pathname.match(/^\/api\/v1\/program-head\/offerings\/([0-9a-f-]{36})\/close$/i);
      if (method === "POST" && programHeadOfferingCloseMatch) {
        return await closeProgramHeadOffering(request, response, context, programHeadOfferingCloseMatch[1]);
      }
      const programHeadOfferingArchiveMatch = pathname.match(/^\/api\/v1\/program-head\/offerings\/([0-9a-f-]{36})\/archive$/i);
      if (method === "POST" && programHeadOfferingArchiveMatch) {
        return await archiveProgramHeadOffering(request, response, context, programHeadOfferingArchiveMatch[1]);
      }
      const programHeadOfferingUnarchiveMatch = pathname.match(/^\/api\/v1\/program-head\/offerings\/([0-9a-f-]{36})\/unarchive$/i);
      if (method === "POST" && programHeadOfferingUnarchiveMatch) {
        return await unarchiveProgramHeadOffering(request, response, context, programHeadOfferingUnarchiveMatch[1]);
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
      if (method === "GET" && pathname === "/api/v1/student-assistant/dashboard") {
        return await getStudentAssistantDashboard(request, response, context);
      }
      if (method === "GET" && pathname === "/api/v1/student-assistant/applications") {
        return await listStudentAssistantApplications(request, response, context, url);
      }
      const studentAssistantApplicationMatch = pathname.match(/^\/api\/v1\/student-assistant\/applications\/([0-9a-f-]{36})$/i);
      if (method === "GET" && studentAssistantApplicationMatch) {
        return await getStudentAssistantApplicationDetail(request, response, context, studentAssistantApplicationMatch[1]);
      }
      const studentAssistantEncodeMatch = pathname.match(/^\/api\/v1\/student-assistant\/applications\/([0-9a-f-]{36})\/encode$/i);
      if (method === "POST" && studentAssistantEncodeMatch) {
        return await encodeStudentAssistantSubjects(request, response, context, studentAssistantEncodeMatch[1]);
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
      const registrarStudentOverrideMatch = pathname.match(/^\/api\/v1\/registrar\/students\/([0-9a-f-]{36})\/academic-override$/i);
      if (method === "POST" && registrarStudentOverrideMatch) {
        return await overrideStudentProgram(request, response, context, registrarStudentOverrideMatch[1]);
      }
      if (method === "POST" && pathname === "/api/v1/registrar/enrollment-period/open") {
        return await openRegistrarPeriod(request, response, context);
      }
      if (method === "POST" && pathname === "/api/v1/registrar/enrollment-period/close") {
        return await closeRegistrarPeriod(request, response, context);
      }
      if (method === "GET" && pathname === "/api/v1/registrar/offering-options") {
        return await getRegistrarOfferingOptions(request, response, context);
      }
      if (method === "GET" && pathname === "/api/v1/registrar/subjects") {
        return await listRegistrarSubjects(request, response, context, url);
      }
      if (method === "GET" && pathname === "/api/v1/registrar/offerings") {
        return await listRegistrarOfferings(request, response, context, url);
      }
      if (method === "POST" && pathname === "/api/v1/registrar/offerings") {
        return await createRegistrarOffering(request, response, context);
      }
      const registrarOfferingMatch = pathname.match(/^\/api\/v1\/registrar\/offerings\/([0-9a-f-]{36})$/i);
      if (method === "PATCH" && registrarOfferingMatch) {
        return await updateRegistrarOffering(request, response, context, registrarOfferingMatch[1]);
      }
      if (method === "DELETE" && registrarOfferingMatch) {
        return await deleteRegistrarOffering(request, response, context, registrarOfferingMatch[1]);
      }
      const registrarOfferingCloseMatch = pathname.match(/^\/api\/v1\/registrar\/offerings\/([0-9a-f-]{36})\/close$/i);
      if (method === "POST" && registrarOfferingCloseMatch) {
        return await closeRegistrarOffering(request, response, context, registrarOfferingCloseMatch[1]);
      }
      const registrarOfferingArchiveMatch = pathname.match(/^\/api\/v1\/registrar\/offerings\/([0-9a-f-]{36})\/archive$/i);
      if (method === "POST" && registrarOfferingArchiveMatch) {
        return await archiveRegistrarOffering(request, response, context, registrarOfferingArchiveMatch[1]);
      }
      const registrarOfferingUnarchiveMatch = pathname.match(/^\/api\/v1\/registrar\/offerings\/([0-9a-f-]{36})\/unarchive$/i);
      if (method === "POST" && registrarOfferingUnarchiveMatch) {
        return await unarchiveRegistrarOffering(request, response, context, registrarOfferingUnarchiveMatch[1]);
      }

      // Financial routes
      const financialResult = await handleFinancialRoutes(request, response, context, url, pathname, method);
      if (financialResult !== false) return financialResult;

      // Club Environment routes
      const clubResult = await handleClubRoutes(request, response, context, url, pathname, method, {
        clubStore,
        requirePermission,
        requireStatePermission,
        readJson,
        sendJson,
        audit,
        error,
        config
      });
      if (clubResult) return;

      // ── Admin Faculty Management Routes ────────────────────────────
      if (method === "GET" && pathname === "/api/v1/admin/colleges") {
        return await listAdminColleges(request, response, context);
      }
      if (method === "GET" && pathname === "/api/v1/admin/faculty") {
        return await listAdminFaculty(request, response, context);
      }
      if (method === "POST" && pathname === "/api/v1/admin/faculty") {
        return await createAdminFaculty(request, response, context);
      }
      const adminFacultyMatch = pathname.match(/^\/api\/v1\/admin\/faculty\/([0-9a-f-]{36})$/i);
      if (method === "PATCH" && adminFacultyMatch) {
        return await updateAdminFaculty(request, response, context, adminFacultyMatch[1]);
      }

      // ── Teacher Workspace Routes ───────────────────────────────────
      if (method === "GET" && pathname === "/api/v1/faculty/classes") {
        return await getFacultyClasses(request, response, context);
      }
      const facultyRosterMatch = pathname.match(/^\/api\/v1\/faculty\/classes\/([0-9a-f-]{36})\/students$/i);
      if (method === "GET" && facultyRosterMatch) {
        return await getFacultyClassRoster(request, response, context, facultyRosterMatch[1]);
      }
      const facultyGradesSaveMatch = pathname.match(/^\/api\/v1\/faculty\/classes\/([0-9a-f-]{36})\/grades$/i);
      if (method === "POST" && facultyGradesSaveMatch) {
        return await saveFacultyGrades(request, response, context, facultyGradesSaveMatch[1]);
      }
      const facultyGradesSubmitMatch = pathname.match(/^\/api\/v1\/faculty\/classes\/([0-9a-f-]{36})\/grades\/submit$/i);
      if (method === "POST" && facultyGradesSubmitMatch) {
        return await submitFacultyGrades(request, response, context, facultyGradesSubmitMatch[1]);
      }

      // ── Registrar Grade Approval Routes ────────────────────────────
      if (method === "GET" && pathname === "/api/v1/registrar/grades/submissions") {
        return await getRegistrarGradeSubmissions(request, response, context);
      }
      const registrarGradeSheetMatch = pathname.match(/^\/api\/v1\/registrar\/(?:offerings\/([0-9a-f-]{36})\/grades|grades\/submissions\/([0-9a-f-]{36}))$/i);
      if (method === "GET" && registrarGradeSheetMatch) {
        const offeringId = registrarGradeSheetMatch[1] || registrarGradeSheetMatch[2];
        return await getRegistrarGradeSheet(request, response, context, offeringId);
      }
      const registrarGradeApproveMatch = pathname.match(/^\/api\/v1\/registrar\/(?:offerings\/([0-9a-f-]{36})\/grades\/approve|grades\/submissions\/([0-9a-f-]{36})\/approve)$/i);
      if (method === "POST" && registrarGradeApproveMatch) {
        const offeringId = registrarGradeApproveMatch[1] || registrarGradeApproveMatch[2];
        return await approveRegistrarGrades(request, response, context, offeringId);
      }
      const registrarGradeReturnMatch = pathname.match(/^\/api\/v1\/registrar\/(?:offerings\/([0-9a-f-]{36})\/grades\/return|grades\/submissions\/([0-9a-f-]{36})\/return)$/i);
      if (method === "POST" && registrarGradeReturnMatch) {
        const offeringId = registrarGradeReturnMatch[1] || registrarGradeReturnMatch[2];
        return await returnRegistrarGrades(request, response, context, offeringId);
      }

      // ── Dean Workspace Routes ──────────────────────────────────────
      if (method === "GET" && (pathname === "/api/v1/dean/dashboard" || pathname === "/api/v1/dean/overview")) {
        return await getDeanOverview(request, response, context);
      }
      if (method === "GET" && pathname === "/api/v1/dean/students") {
        return await getDeanStudents(request, response, context, url);
      }
      if (method === "GET" && pathname === "/api/v1/dean/faculty") {
        return await getDeanFaculty(request, response, context);
      }
      if (method === "GET" && pathname === "/api/v1/dean/schedules") {
        return await getDeanSchedules(request, response, context, url);
      }
      if (method === "GET" && (pathname === "/api/v1/dean/grades/pending" || pathname === "/api/v1/dean/grades/submissions")) {
        return await getDeanGradeSubmissions(request, response, context);
      }
      const deanGradeSheetMatch = pathname.match(/^\/api\/v1\/dean\/(?:offerings\/([0-9a-f-]{36})\/grades|grades\/offering\/([0-9a-f-]{36}))$/i);
      if (method === "GET" && deanGradeSheetMatch) {
        const offeringId = deanGradeSheetMatch[1] || deanGradeSheetMatch[2];
        return await getDeanOfferingGradeSheet(request, response, context, offeringId);
      }
      const deanGradeApproveMatch = pathname.match(/^\/api\/v1\/dean\/(?:offerings\/([0-9a-f-]{36})\/grades\/approve|grades\/offering\/([0-9a-f-]{36})\/approve)$/i);
      if (method === "POST" && deanGradeApproveMatch) {
        const offeringId = deanGradeApproveMatch[1] || deanGradeApproveMatch[2];
        return await approveDeanGrades(request, response, context, offeringId);
      }
      const deanGradeReturnMatch = pathname.match(/^\/api\/v1\/dean\/(?:offerings\/([0-9a-f-]{36})\/grades\/return|grades\/offering\/([0-9a-f-]{36})\/return)$/i);
      if (method === "POST" && deanGradeReturnMatch) {
        const offeringId = deanGradeReturnMatch[1] || deanGradeReturnMatch[2];
        return await returnDeanGrades(request, response, context, offeringId);
      }
      if (method === "GET" && (pathname === "/api/v1/dean/evaluations/pending" || pathname === "/api/v1/dean/evaluations")) {
        return await getDeanPendingEvaluations(request, response, context);
      }
      const deanEvalMatch = pathname.match(/^\/api\/v1\/dean\/evaluations\/([0-9a-f-]{36})$/i);
      if (method === "GET" && deanEvalMatch) {
        return await getDeanEnrollmentEvaluation(request, response, context, deanEvalMatch[1]);
      }
      const deanEvalApproveMatch = pathname.match(/^\/api\/v1\/dean\/evaluations\/([0-9a-f-]{36})\/approve$/i);
      if (method === "POST" && deanEvalApproveMatch) {
        return await approveDeanEnrollmentEvaluation(request, response, context, deanEvalApproveMatch[1]);
      }

      if (method === "GET" && pathname === "/api/v1/admin/roles") return await listRoles(request, response, context);
      if (method === "GET" && pathname === "/api/v1/admin/programs") return await listAdminPrograms(request, response, context);
      if (method === "GET" && pathname === "/api/v1/admin/departments") return await listAdminDepartments(request, response, context);
      if (method === "GET" && pathname === "/api/v1/admin/users") return await listUsers(request, response, context);
      if (method === "POST" && pathname === "/api/v1/admin/users") {
        return await createUser(request, response, context);
      }
      if (method === "GET" && pathname === "/api/v1/admin/audit-logs") {
        return await listAudit(request, response, context, url);
      }
      if (method === "POST" && pathname === "/api/v1/system-reports") {
        return await createSystemReport(request, response, context);
      }
      if (method === "GET" && pathname === "/api/v1/admin/system-reports") {
        return await listSystemReports(request, response, context, url);
      }
      const systemReportMatch = pathname.match(/^\/api\/v1\/admin\/system-reports\/([0-9a-f-]{36})$/i);
      if (method === "PATCH" && systemReportMatch) {
        return await updateSystemReportStatus(request, response, context, systemReportMatch[1]);
      }
      if (method === "GET" && pathname === "/api/v1/admin/system-logs") {
        return await listSystemLogs(request, response, context, url);
      }
      if (method === "GET" && pathname === "/api/v1/admin/monitoring/health") {
        return await systemHealth(request, response, context);
      }
      const systemLogStatusMatch = pathname.match(/^\/api\/v1\/admin\/system-logs\/([0-9a-f-]{36})\/status$/i);
      if (method === "PATCH" && systemLogStatusMatch) {
        return await updateSystemLogStatus(request, response, context, systemLogStatusMatch[1]);
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
      await systemLogger.logSystemEvent({
        severity: systemLogger.Severity.HIGH,
        category: systemLogger.Category.APPLICATION,
        moduleName: "HTTP Server",
        requestId: context.requestId,
        sessionId: context.session?.id,
        userId: context.session?.user?.id,
        ipHash: context.ipHash,
        userAgent: cleanText(request.headers["user-agent"], 500),
        requestUrl: pathname,
        httpMethod: cleanText(request.method, 10),
        message: "Unhandled request error",
        technicalDetail: caught instanceof Error ? caught.message : String(caught),
        stackTrace: caught instanceof Error ? caught.stack : null
      });
      sendJson(response, 500, { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } });
    }
  }

  return {
    handler,
    database,
    config,
    requestMonitor,
    async close() {
      if (ownsDatabase) await database.$disconnect();
    }
  };
}

export { HttpError };
