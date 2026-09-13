CREATE TYPE "enrollment_period_status" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');

CREATE TABLE "enrollment_periods" (
    "id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "academic_term_id" UUID NOT NULL,
    "status" "enrollment_period_status" NOT NULL DEFAULT 'DRAFT',
    "opened_by_user_id" UUID,
    "opened_at" TIMESTAMPTZ(3),
    "closed_by_user_id" UUID,
    "closed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollment_periods_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "enrollment_periods_academic_term_id_key" UNIQUE ("academic_term_id"),
    CONSTRAINT "enrollment_periods_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "enrollment_periods_academic_term_id_fkey" FOREIGN KEY ("academic_term_id") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "enrollment_periods_opened_by_user_id_fkey" FOREIGN KEY ("opened_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "enrollment_periods_closed_by_user_id_fkey" FOREIGN KEY ("closed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "enrollment_periods_academic_year_id_status_idx" ON "enrollment_periods"("academic_year_id", "status");
CREATE INDEX "enrollment_periods_opened_by_user_id_idx" ON "enrollment_periods"("opened_by_user_id");
CREATE INDEX "enrollment_periods_closed_by_user_id_idx" ON "enrollment_periods"("closed_by_user_id");
