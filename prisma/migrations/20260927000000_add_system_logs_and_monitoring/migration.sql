-- Phase 4 monitoring storage. IF NOT EXISTS keeps this migration safe for
-- environments that received the Phase 3 schema through prisma db push.
CREATE TABLE IF NOT EXISTS "system_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "error_id" VARCHAR(50),
    "request_id" VARCHAR(50),
    "session_id" VARCHAR(64),
    "severity" VARCHAR(20) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "module" VARCHAR(100),
    "user_id" UUID,
    "ip_hash" CHAR(64),
    "user_agent" TEXT,
    "request_url" VARCHAR(500),
    "http_method" VARCHAR(10),
    "message" TEXT NOT NULL,
    "technical_detail" TEXT,
    "stack_trace" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    "duration_ms" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "system_logs_error_id_key" UNIQUE ("error_id"),
    CONSTRAINT "system_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "system_logs_severity_created_at_idx" ON "system_logs"("severity", "created_at");
CREATE INDEX IF NOT EXISTS "system_logs_category_created_at_idx" ON "system_logs"("category", "created_at");
CREATE INDEX IF NOT EXISTS "system_logs_status_created_at_idx" ON "system_logs"("status", "created_at");
