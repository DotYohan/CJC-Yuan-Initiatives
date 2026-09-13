CREATE TYPE "enrollment_application_status" AS ENUM ('DRAFT', 'SUBMITTED', 'under_review', 'APPROVED', 'REJECTED');

CREATE TABLE "enrollment_applications" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "academic_term_id" UUID NOT NULL,
    "curriculum_id" UUID,
    "enrollment_id" UUID,
    "year_level" SMALLINT NOT NULL,
    "status" "enrollment_application_status" NOT NULL DEFAULT 'DRAFT',
    "form_data" JSONB NOT NULL DEFAULT '{}',
    "submitted_at" TIMESTAMPTZ(3),
    "reviewed_at" TIMESTAMPTZ(3),
    "reviewed_by_user_id" UUID,
    "review_remarks" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollment_applications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "enrollment_applications_positive_year_level" CHECK ("year_level" > 0)
);

CREATE UNIQUE INDEX "enrollment_applications_student_id_key" ON "enrollment_applications"("student_id");
CREATE UNIQUE INDEX "enrollment_applications_enrollment_id_key" ON "enrollment_applications"("enrollment_id");
CREATE INDEX "enrollment_applications_academic_term_id_status_idx" ON "enrollment_applications"("academic_term_id", "status");
CREATE INDEX "enrollment_applications_program_id_year_level_status_idx" ON "enrollment_applications"("program_id", "year_level", "status");
CREATE INDEX "enrollment_applications_reviewed_by_user_id_idx" ON "enrollment_applications"("reviewed_by_user_id");

ALTER TABLE "enrollment_applications" ADD CONSTRAINT "enrollment_applications_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enrollment_applications" ADD CONSTRAINT "enrollment_applications_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enrollment_applications" ADD CONSTRAINT "enrollment_applications_academic_term_id_fkey" FOREIGN KEY ("academic_term_id") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enrollment_applications" ADD CONSTRAINT "enrollment_applications_curriculum_id_fkey" FOREIGN KEY ("curriculum_id") REFERENCES "curricula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "enrollment_applications" ADD CONSTRAINT "enrollment_applications_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "enrollment_applications" ADD CONSTRAINT "enrollment_applications_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;