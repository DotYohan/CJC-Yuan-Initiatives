import { db } from "./db.mjs";

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
  if (!data) return data;
  const sanitized = { ...data };
  const sensitiveKeys = ["password", "token", "csrf_token", "secret"];
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
      sanitized[key] = "***REDACTED***";
    }
  }
  return sanitized;
}

export async function logSystemEvent(params) {
  try {
    const errorId = `ERR-${new Date().toISOString().slice(0,10).replace(/-/g, "")}-${Math.floor(Math.random()*10000).toString().padStart(4, "0")}`;
    
    await db.systemLog.create({
      data: {
        errorId,
        severity: params.severity || Severity.INFO,
        category: params.category || Category.APPLICATION,
        moduleName: params.moduleName || "General",
        functionName: params.functionName || null,
        userId: params.userId || null,
        userRole: params.userRole || null,
        ipAddress: params.ipAddress || null,
        deviceInfo: params.deviceInfo || null,
        browserInfo: params.browserInfo || null,
        requestUrl: params.requestUrl || null,
        httpMethod: params.httpMethod || null,
        message: params.message || "Unknown error",
        technicalDetail: typeof params.technicalDetail === "string" ? params.technicalDetail : JSON.stringify(sanitizeData(params.technicalDetail), null, 2),
        stackTrace: params.stackTrace || null,
        relatedQuery: params.relatedQuery || null,
        status: "OPEN"
      }
    });
  } catch (err) {
    console.error("Failed to write system log to database:", err);
  }
}
