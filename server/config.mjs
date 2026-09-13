import { randomBytes } from "node:crypto";
import { resolve } from "node:path";

const PUBLIC_AUDIT_PEPPER_PLACEHOLDER = "replace-with-a-long-random-production-secret";

const integer = (value, fallback, name) => {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
};

const origin = (value) => {
  const parsed = new URL(value);
  if (parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("APP_ORIGIN must contain only a URL origin, without credentials, path, query, or fragment.");
  }
  return parsed.origin;
};

export function createConfig(overrides = {}) {
  const nodeEnv = overrides.nodeEnv ?? process.env.NODE_ENV ?? "development";
  const isTest = nodeEnv === "test";
  const isProduction = nodeEnv === "production";
  const appOrigin = origin(overrides.appOrigin ?? process.env.APP_ORIGIN ?? "http://localhost:3000");
  const host = overrides.host ?? process.env.HOST ?? "127.0.0.1";
  if (typeof host !== "string" || host.length < 1 || host.length > 253 || /[\s/\\]/.test(host)) {
    throw new Error("HOST must be a valid hostname or IP address.");
  }
  const scryptN = integer(overrides.scryptN ?? process.env.CJC_SCRYPT_N, isTest ? 1 << 10 : 1 << 17, "SCRYPT_N");
  const scryptR = integer(overrides.scryptR ?? process.env.CJC_SCRYPT_R, 8, "SCRYPT_R");
  const scryptP = integer(overrides.scryptP ?? process.env.CJC_SCRYPT_P, 1, "SCRYPT_P");

  if ((scryptN & (scryptN - 1)) !== 0) throw new Error("SCRYPT_N must be a power of two.");
  if (!isTest && (scryptN < 1 << 17 || scryptR < 8 || scryptP < 1)) {
    throw new Error("Non-test scrypt settings may not be weaker than N=2^17, r=8, p=1.");
  }
  if (isProduction && !appOrigin.startsWith("https://")) {
    throw new Error("Production APP_ORIGIN must use HTTPS.");
  }

  const configuredPepper = overrides.auditPepper ?? process.env.CJC_AUDIT_PEPPER;
  if (
    isProduction &&
    (!configuredPepper ||
      configuredPepper.length < 32 ||
      configuredPepper === PUBLIC_AUDIT_PEPPER_PLACEHOLDER)
  ) {
    throw new Error("Production requires a private CJC_AUDIT_PEPPER with at least 32 characters.");
  }

  return Object.freeze({
    nodeEnv,
    isTest,
    isProduction,
    port: integer(overrides.port ?? process.env.PORT, 3000, "PORT"),
    host,
    appOrigin,
    publicRoot: resolve(overrides.publicRoot ?? process.cwd()),
    documentRoot: resolve(overrides.documentRoot ?? process.env.CJC_DOCUMENT_ROOT ?? "data/student-documents"),
    auditPepper: configuredPepper ?? randomBytes(32).toString("base64url"),
    cookieName: isProduction ? "__Host-cjc.sid" : "cjc.sid",
    secureCookies: isProduction,
    bodyLimitBytes: integer(overrides.bodyLimitBytes, 16 * 1024, "bodyLimitBytes"),
    passwordMinLength: integer(overrides.passwordMinLength, 12, "passwordMinLength"),
    passwordMaxLength: integer(overrides.passwordMaxLength, 128, "passwordMaxLength"),
    scrypt: Object.freeze({ N: scryptN, r: scryptR, p: scryptP, keyLength: 64 }),
    sessionIdleMs: integer(overrides.sessionIdleMs, 30 * 60 * 1000, "sessionIdleMs"),
    sessionAbsoluteMs: integer(overrides.sessionAbsoluteMs, 8 * 60 * 60 * 1000, "sessionAbsoluteMs"),
    rememberedIdleMs: integer(overrides.rememberedIdleMs, 24 * 60 * 60 * 1000, "rememberedIdleMs"),
    rememberedAbsoluteMs: integer(overrides.rememberedAbsoluteMs, 7 * 24 * 60 * 60 * 1000, "rememberedAbsoluteMs"),
    anonymousSessionMs: integer(overrides.anonymousSessionMs, 60 * 60 * 1000, "anonymousSessionMs"),
    loginWindowMs: integer(overrides.loginWindowMs, 15 * 60 * 1000, "loginWindowMs"),
    loginIpLimit: integer(overrides.loginIpLimit, 20, "loginIpLimit"),
    accountFailureLimit: integer(overrides.accountFailureLimit, 5, "accountFailureLimit"),
    lockBaseMs: integer(overrides.lockBaseMs, 30 * 1000, "lockBaseMs"),
    lockMaxMs: integer(overrides.lockMaxMs, 15 * 60 * 1000, "lockMaxMs"),
    resetWindowMs: integer(overrides.resetWindowMs, 60 * 60 * 1000, "resetWindowMs"),
    resetRequestLimit: integer(overrides.resetRequestLimit, 3, "resetRequestLimit"),
    resetTokenMs: integer(overrides.resetTokenMs, 30 * 60 * 1000, "resetTokenMs"),
    resetAttemptLimit: integer(overrides.resetAttemptLimit, 20, "resetAttemptLimit"),
    resetAttemptWindowMs: integer(overrides.resetAttemptWindowMs, 15 * 60 * 1000, "resetAttemptWindowMs"),
    changePasswordUserLimit: integer(
      overrides.changePasswordUserLimit ?? process.env.CJC_CHANGE_PASSWORD_USER_LIMIT,
      5,
      "changePasswordUserLimit"
    ),
    changePasswordIpLimit: integer(
      overrides.changePasswordIpLimit ?? process.env.CJC_CHANGE_PASSWORD_IP_LIMIT,
      20,
      "changePasswordIpLimit"
    ),
    changePasswordWindowMs: integer(
      overrides.changePasswordWindowMs ?? process.env.CJC_CHANGE_PASSWORD_WINDOW_MS,
      15 * 60 * 1000,
      "changePasswordWindowMs"
    ),
    cleanupIntervalMs: integer(
      overrides.cleanupIntervalMs ?? process.env.CJC_CLEANUP_INTERVAL_MS,
      5 * 60 * 1000,
      "cleanupIntervalMs"
    ),
    cleanupBatchSize: integer(
      overrides.cleanupBatchSize ?? process.env.CJC_CLEANUP_BATCH_SIZE,
      250,
      "cleanupBatchSize"
    ),
    revokedSessionRetentionMs: integer(
      overrides.revokedSessionRetentionMs ?? process.env.CJC_REVOKED_SESSION_RETENTION_MS,
      24 * 60 * 60 * 1000,
      "revokedSessionRetentionMs"
    ),
    usedResetTokenRetentionMs: integer(
      overrides.usedResetTokenRetentionMs ?? process.env.CJC_USED_RESET_TOKEN_RETENTION_MS,
      24 * 60 * 60 * 1000,
      "usedResetTokenRetentionMs"
    ),
    authHistoryRetentionMs: integer(
      overrides.authHistoryRetentionMs ?? process.env.CJC_AUTH_HISTORY_RETENTION_MS,
      30 * 24 * 60 * 60 * 1000,
      "authHistoryRetentionMs"
    ),
    forgotResponseFloorMs: integer(overrides.forgotResponseFloorMs, isTest ? 1 : 250, "forgotResponseFloorMs"),
    now: overrides.now ?? (() => Date.now())
  });
}
