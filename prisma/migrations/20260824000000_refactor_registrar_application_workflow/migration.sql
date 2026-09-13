-- Review-only migration. Do not apply before approval and backup.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'student_document_status') THEN
    CREATE TYPE "student_document_status" AS ENUM ('PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED');
  END IF;
END
$$;

ALTER TABLE "admission_applications"
  ADD COLUMN "attempt_number" INTEGER NOT NULL DEFAULT 1;

DROP INDEX "admission_applications_converted_student_id_key";
CREATE INDEX "admission_applications_converted_student_id_idx"
  ON "admission_applications" ("converted_student_id");

CREATE TABLE "student_documents" (
  "id" UUID NOT NULL,
  "student_id" UUID NOT NULL,
  "admission_application_id" UUID,
  "document_type" VARCHAR(100) NOT NULL,
  "file_name" VARCHAR(255),
  "storage_key" VARCHAR(500),
  "submitted_at" TIMESTAMPTZ(3),
  "status" "student_document_status" NOT NULL DEFAULT 'PENDING',
  "verified_by_user_id" UUID,
  "verified_at" TIMESTAMPTZ(3),
  "remarks" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "student_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "student_documents_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "student_documents_admission_application_id_fkey"
    FOREIGN KEY ("admission_application_id") REFERENCES "admission_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "student_documents_verified_by_user_id_fkey"
    FOREIGN KEY ("verified_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "student_documents_admission_application_id_document_type_key"
  ON "student_documents" ("admission_application_id", "document_type");
CREATE INDEX "student_documents_admission_application_id_status_idx"
  ON "student_documents" ("admission_application_id", "status");
CREATE INDEX "student_documents_status_submitted_at_idx"
  ON "student_documents" ("status", "submitted_at");
CREATE INDEX "student_documents_verified_by_user_id_idx"
  ON "student_documents" ("verified_by_user_id");

ALTER TABLE "admission_application_status_history"
  ADD COLUMN "action_type" VARCHAR(50) NOT NULL DEFAULT 'STATUS_CHANGE',
  ADD COLUMN "changed_by_role" VARCHAR(64);

ALTER TABLE "admission_application_status_history"
  ALTER COLUMN "action_type" DROP DEFAULT;

ALTER TABLE "admission_applications"
  ADD CONSTRAINT "admission_applications_attempt_number_positive"
  CHECK ("attempt_number" > 0);

CREATE INDEX "admission_application_history_action_changed_idx"
  ON "admission_application_status_history" ("application_id", "action_type", "changed_at" DESC);

CREATE OR REPLACE FUNCTION "enforce_admission_application_transition"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."status" = OLD."status" THEN
    RETURN NEW;
  END IF;

  IF (OLD."status" = 'DRAFT' AND NEW."status" = 'PENDING')
     OR (OLD."status" = 'PENDING' AND NEW."status" IN ('under_review', 'APPROVED', 'REJECTED', 'RETURNED_FOR_CORRECTION'))
     OR (OLD."status" = 'under_review' AND NEW."status" IN ('APPROVED', 'REJECTED', 'RETURNED_FOR_CORRECTION'))
     OR (OLD."status" = 'RETURNED_FOR_CORRECTION' AND NEW."status" = 'PENDING') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid admission application status transition: % -> %', OLD."status", NEW."status"
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS "admission_application_transition_guard" ON "admission_applications";
CREATE TRIGGER "admission_application_transition_guard"
BEFORE UPDATE OF "status" ON "admission_applications"
FOR EACH ROW
EXECUTE FUNCTION "enforce_admission_application_transition"();

CREATE OR REPLACE FUNCTION "protect_decided_admission_applications"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'TRUNCATE' THEN
    RAISE EXCEPTION 'Admission applications cannot be truncated'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF OLD."status" IN ('APPROVED', 'REJECTED') THEN
    RAISE EXCEPTION 'Decided admission applications cannot be deleted'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS "admission_applications_delete_guard" ON "admission_applications";
CREATE TRIGGER "admission_applications_delete_guard"
BEFORE DELETE ON "admission_applications"
FOR EACH ROW
EXECUTE FUNCTION "protect_decided_admission_applications"();

DROP TRIGGER IF EXISTS "admission_applications_truncate_guard" ON "admission_applications";
CREATE TRIGGER "admission_applications_truncate_guard"
BEFORE TRUNCATE ON "admission_applications"
FOR EACH STATEMENT
EXECUTE FUNCTION "protect_decided_admission_applications"();

ALTER TABLE "admission_applications"
  ENABLE ALWAYS TRIGGER "admission_application_transition_guard";
ALTER TABLE "admission_applications"
  ENABLE ALWAYS TRIGGER "admission_applications_delete_guard";
ALTER TABLE "admission_applications"
  ENABLE ALWAYS TRIGGER "admission_applications_truncate_guard";

CREATE OR REPLACE FUNCTION "enforce_enrollment_application_review_transition"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."status" = OLD."status" THEN
    RETURN NEW;
  END IF;

  IF (OLD."status" = 'DRAFT' AND NEW."status" = 'SUBMITTED')
     OR (OLD."status" = 'SUBMITTED' AND NEW."status" IN ('under_review', 'APPROVED', 'REJECTED', 'returned_for_correction'))
     OR (OLD."status" = 'under_review' AND NEW."status" IN ('APPROVED', 'REJECTED', 'returned_for_correction'))
     OR (OLD."status" = 'returned_for_correction' AND NEW."status" = 'SUBMITTED') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid enrollment application status transition: % -> %', OLD."status", NEW."status"
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS "enrollment_application_review_transition_guard" ON "enrollment_applications";
CREATE TRIGGER "enrollment_application_review_transition_guard"
BEFORE UPDATE OF "status" ON "enrollment_applications"
FOR EACH ROW
EXECUTE FUNCTION "enforce_enrollment_application_review_transition"();

ALTER TABLE "enrollment_applications"
  ENABLE ALWAYS TRIGGER "enrollment_application_review_transition_guard";
