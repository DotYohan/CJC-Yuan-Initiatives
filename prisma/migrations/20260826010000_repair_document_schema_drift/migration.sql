-- Repair the registrar document schema drift left by the original workflow migration.
-- This migration is intentionally additive except for removing obsolete columns from
-- the empty legacy student_documents table. Abort instead of risking existing files.

ALTER TYPE "student_document_status"
  ADD VALUE IF NOT EXISTS 'RETURNED_FOR_CORRECTION';

CREATE TABLE "document_types" (
  "id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "document_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "document_types_name_key"
  ON "document_types" ("name");
CREATE INDEX "document_types_active_sort_order_idx"
  ON "document_types" ("active", "sort_order");

INSERT INTO "document_types"
  ("id", "name", "description", "required", "active", "sort_order")
VALUES
  ('10000000-0000-4000-8000-000000000001', 'Birth Certificate', 'PSA-authenticated birth certificate for identity verification.', true, true, 1),
  ('10000000-0000-4000-8000-000000000002', 'Form 138', 'Report card (Form 138-A) from previous school year.', true, true, 2),
  ('10000000-0000-4000-8000-000000000003', 'Good Moral Certificate', 'Certificate of Good Moral Character from previous school.', true, true, 3),
  ('10000000-0000-4000-8000-000000000004', 'Medical Certificate', 'Medical certificate from licensed physician.', true, true, 4),
  ('10000000-0000-4000-8000-000000000005', '2x2 Picture', 'Recent 2x2 ID picture with white background.', true, true, 5);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "student_documents" LIMIT 1) THEN
    RAISE EXCEPTION
      'Document schema repair stopped: student_documents contains records that require a dedicated data migration.';
  END IF;
END
$$;

DROP INDEX IF EXISTS "student_documents_admission_application_id_document_type_key";
DROP INDEX IF EXISTS "student_documents_status_submitted_at_idx";

ALTER TABLE "student_documents"
  DROP COLUMN "document_type",
  DROP COLUMN "file_name",
  DROP COLUMN "storage_key",
  DROP COLUMN "submitted_at",
  ADD COLUMN "document_type_id" UUID NOT NULL,
  ADD COLUMN "original_file_name" VARCHAR(255) NOT NULL,
  ADD COLUMN "stored_file_name" VARCHAR(255) NOT NULL,
  ADD COLUMN "file_path" VARCHAR(500) NOT NULL,
  ADD COLUMN "file_size" BIGINT NOT NULL,
  ADD COLUMN "mime_type" VARCHAR(100) NOT NULL,
  ADD COLUMN "uploaded_by_user_id" UUID NOT NULL,
  ADD COLUMN "uploaded_at" TIMESTAMPTZ(3) NOT NULL;

ALTER TABLE "student_documents"
  ADD CONSTRAINT "student_documents_document_type_id_fkey"
    FOREIGN KEY ("document_type_id") REFERENCES "document_types"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "student_documents_uploaded_by_user_id_fkey"
    FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "student_documents_admission_application_id_document_type_id_key"
  ON "student_documents" ("admission_application_id", "document_type_id");
CREATE INDEX "student_documents_student_id_status_idx"
  ON "student_documents" ("student_id", "status");
CREATE INDEX "student_documents_status_uploaded_at_idx"
  ON "student_documents" ("status", "uploaded_at");

CREATE TABLE "document_verification_history" (
  "id" BIGSERIAL NOT NULL,
  "document_id" UUID NOT NULL,
  "previous_status" "student_document_status",
  "new_status" "student_document_status" NOT NULL,
  "action" VARCHAR(50) NOT NULL,
  "remarks" TEXT,
  "performed_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "document_verification_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "document_verification_history_document_id_fkey"
    FOREIGN KEY ("document_id") REFERENCES "student_documents"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "document_verification_history_performed_by_user_id_fkey"
    FOREIGN KEY ("performed_by_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "document_verification_history_document_id_created_at_idx"
  ON "document_verification_history" ("document_id", "created_at");
CREATE INDEX "document_verification_history_performed_by_user_id_idx"
  ON "document_verification_history" ("performed_by_user_id");
