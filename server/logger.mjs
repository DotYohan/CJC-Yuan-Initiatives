import { randomUUID } from "node:crypto";

let db = null;

export function setDatabase(database) {
  db = database;
}

export const Severity = {
  INFO: "INFO",
  WARNING: "WARNING",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL"
};

export const Category = {
  APPLICATION: "APPLICATION",
  SECURITY: "SECURITY",
  USER_ACTIVITY: "USER_ACTIVITY",
  DATABASE: "DATABASE",
  API: "API",
  FRONTEND: "FRONTEND",
  SERVER_HEALTH: "SERVER_HEALTH"
};

function sanitizeData(data) {
  if (data == null || typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map(sanitizeData);
  const sanitized = { ...data };
  const sensitiveKeys = ["password", "token", "csrf_token", "secret"];
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
      sanitized[key] = "***REDACTED***";
    } else if (sanitized[key] && typeof sanitized[key] === "object") {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  }
  return sanitized;
}

function sanitizeText(text) {
  return String(text).replace(
    /(\"(?:password|token|csrf_token|secret)\"\s*:\s*\")([^\"]*)(\")/gi,
    "$1***REDACTED***$3"
  );
}

export async function logSystemEvent(params) {
  if (!db) {
    console.error("System Logger Error: Database connection is not set.");
    return;
  }
  try {
    const errorId = params.errorId
      || `ERR-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const technicalDetail = typeof params.technicalDetail === "string"
      ? sanitizeText(params.technicalDetail)
      : params.technicalDetail == null
        ? null
        : JSON.stringify(sanitizeData(params.technicalDetail), null, 2);

    await db.systemLog.create({
      data: {
        errorId,
        requestId: params.requestId || null,
        sessionId: params.sessionId || null,
        severity: params.severity || Severity.INFO,
        category: params.category || Category.APPLICATION,
        module: params.moduleName || "General",
        userId: params.userId || null,
        ipHash: params.ipHash || null,
        userAgent: params.userAgent || null,
        requestUrl: params.requestUrl || null,
        httpMethod: params.httpMethod || null,
        message: params.message || "Unknown error",
        technicalDetail,
        stackTrace: params.stackTrace || null,
        status: params.status || "OPEN",
        durationMs: Number.isFinite(params.durationMs) ? Math.max(0, Math.round(params.durationMs)) : null
      }
    });
  } catch (err) {
    console.error("Failed to write system log to database:", err);
  }
}
