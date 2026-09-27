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
  if (!db) {
    console.error("System Logger Error: Database connection is not set.");
    return;
  }
  try {
    const errorId = `ERR-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;

    // Columns match the actual system_logs table in the database
    await db.systemLog.create({
      data: {
        errorId,
        severity: params.severity || Severity.INFO,
        category: params.category || Category.APPLICATION,
        module: params.moduleName || "General",
        userId: params.userId || null,
        requestUrl: params.requestUrl || null,
        httpMethod: params.httpMethod || null,
        message: params.message || "Unknown error",
        technicalDetail: typeof params.technicalDetail === "string"
          ? params.technicalDetail
          : JSON.stringify(sanitizeData(params.technicalDetail), null, 2),
        stackTrace: params.stackTrace || null,
        status: "OPEN"
      }
    });
  } catch (err) {
    console.error("Failed to write system log to database:", err);
  }
}
