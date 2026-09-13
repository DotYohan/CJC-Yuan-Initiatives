-- Phase 9: School Domain Foundation
-- Review-only migration. This file has not been applied.

-- CreateEnum
CREATE TYPE "student_status" AS ENUM ('APPLICANT', 'ACTIVE', 'on_leave', 'GRADUATED', 'WITHDRAWN', 'SUSPENDED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "faculty_status" AS ENUM ('ACTIVE', 'on_leave', 'SEPARATED', 'RETIRED');

-- CreateEnum
CREATE TYPE "curriculum_status" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');

-- CreateTable
CREATE TABLE "colleges" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "code_normalized" VARCHAR(32) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "short_name" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "colleges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "college_id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" UUID NOT NULL,
    "department_id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "code_normalized" VARCHAR(32) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "credential" VARCHAR(100) NOT NULL,
    "duration_years" SMALLINT NOT NULL,
    "terms_per_year" SMALLINT NOT NULL DEFAULT 2,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "student_number" VARCHAR(32) NOT NULL,
    "student_number_normalized" VARCHAR(32) NOT NULL,
    "program_id" UUID,
    "curriculum_id" UUID,
    "first_name" VARCHAR(100) NOT NULL,
    "middle_name" VARCHAR(100),
    "last_name" VARCHAR(100) NOT NULL,
    "suffix" VARCHAR(20),
    "date_of_birth" DATE,
    "institutional_email" VARCHAR(254),
    "admission_year" SMALLINT NOT NULL,
    "current_year_level" SMALLINT NOT NULL DEFAULT 1,
    "status" "student_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faculty" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "employee_number" VARCHAR(32) NOT NULL,
    "employee_number_normalized" VARCHAR(32) NOT NULL,
    "department_id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "middle_name" VARCHAR(100),
    "last_name" VARCHAR(100) NOT NULL,
    "suffix" VARCHAR(20),
    "institutional_email" VARCHAR(254),
    "employment_type" VARCHAR(50),
    "academic_rank" VARCHAR(100),
    "status" "faculty_status" NOT NULL DEFAULT 'ACTIVE',
    "hired_at" DATE,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "faculty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" UUID NOT NULL,
    "department_id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "code_normalized" VARCHAR(32) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "default_credit_units" DECIMAL(4,2) NOT NULL,
    "default_lecture_hours" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "default_laboratory_hours" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curricula" (
    "id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "effective_from_year" SMALLINT NOT NULL,
    "effective_to_year" SMALLINT,
    "status" "curriculum_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curricula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_subjects" (
    "id" UUID NOT NULL,
    "curriculum_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "year_level" SMALLINT NOT NULL,
    "term_number" SMALLINT NOT NULL,
    "credit_units" DECIMAL(4,2) NOT NULL,
    "lecture_hours" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "laboratory_hours" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curriculum_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "colleges_code_normalized_key" ON "colleges"("code_normalized");

-- CreateIndex
CREATE INDEX "colleges_is_active_idx" ON "colleges"("is_active");

-- CreateIndex
CREATE INDEX "departments_college_id_is_active_idx" ON "departments"("college_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "departments_college_id_code_key" ON "departments"("college_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "programs_code_normalized_key" ON "programs"("code_normalized");

-- CreateIndex
CREATE INDEX "programs_department_id_is_active_idx" ON "programs"("department_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "students_user_id_key" ON "students"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_student_number_normalized_key" ON "students"("student_number_normalized");

-- CreateIndex
CREATE INDEX "students_program_id_status_idx" ON "students"("program_id", "status");

-- CreateIndex
CREATE INDEX "students_curriculum_id_idx" ON "students"("curriculum_id");

-- CreateIndex
CREATE INDEX "students_last_name_first_name_idx" ON "students"("last_name", "first_name");

-- CreateIndex
CREATE UNIQUE INDEX "faculty_user_id_key" ON "faculty"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "faculty_employee_number_normalized_key" ON "faculty"("employee_number_normalized");

-- CreateIndex
CREATE INDEX "faculty_department_id_status_idx" ON "faculty"("department_id", "status");

-- CreateIndex
CREATE INDEX "faculty_last_name_first_name_idx" ON "faculty"("last_name", "first_name");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_code_normalized_key" ON "subjects"("code_normalized");

-- CreateIndex
CREATE INDEX "subjects_department_id_is_active_idx" ON "subjects"("department_id", "is_active");

-- CreateIndex
CREATE INDEX "curricula_program_id_status_idx" ON "curricula"("program_id", "status");

-- CreateIndex
CREATE INDEX "curricula_effective_from_year_effective_to_year_idx" ON "curricula"("effective_from_year", "effective_to_year");

-- CreateIndex
CREATE UNIQUE INDEX "curricula_program_id_code_version_key" ON "curricula"("program_id", "code", "version");

-- CreateIndex
CREATE UNIQUE INDEX "curricula_id_program_id_key" ON "curricula"("id", "program_id");

-- CreateIndex
CREATE INDEX "curriculum_subjects_subject_id_idx" ON "curriculum_subjects"("subject_id");

-- CreateIndex
CREATE INDEX "curriculum_subjects_curriculum_id_year_level_term_number_so_idx" ON "curriculum_subjects"("curriculum_id", "year_level", "term_number", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_subjects_curriculum_id_subject_id_key" ON "curriculum_subjects"("curriculum_id", "subject_id");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_college_id_fkey" FOREIGN KEY ("college_id") REFERENCES "colleges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_curriculum_id_program_id_fkey" FOREIGN KEY ("curriculum_id", "program_id") REFERENCES "curricula"("id", "program_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty" ADD CONSTRAINT "faculty_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty" ADD CONSTRAINT "faculty_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curricula" ADD CONSTRAINT "curricula_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_subjects" ADD CONSTRAINT "curriculum_subjects_curriculum_id_fkey" FOREIGN KEY ("curriculum_id") REFERENCES "curricula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_subjects" ADD CONSTRAINT "curriculum_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Custom Phase 9 constraints and triggers are appended below, after every
-- school-domain table, index, unique constraint, and foreign key exists.

-- Scalar domain checks that Prisma 6.12 cannot represent in schema.prisma.
ALTER TABLE "programs"
  ADD CONSTRAINT "programs_positive_duration_years" CHECK ("duration_years" > 0),
  ADD CONSTRAINT "programs_valid_terms_per_year" CHECK ("terms_per_year" > 0);

ALTER TABLE "students"
  ADD CONSTRAINT "students_valid_current_year_level" CHECK ("current_year_level" > 0),
  ADD CONSTRAINT "students_curriculum_requires_program"
    CHECK ("curriculum_id" IS NULL OR "program_id" IS NOT NULL);

ALTER TABLE "subjects"
  ADD CONSTRAINT "subjects_positive_default_credit_units" CHECK ("default_credit_units" > 0),
  ADD CONSTRAINT "subjects_nonnegative_default_lecture_hours" CHECK ("default_lecture_hours" >= 0),
  ADD CONSTRAINT "subjects_nonnegative_default_laboratory_hours" CHECK ("default_laboratory_hours" >= 0);

ALTER TABLE "curricula"
  ADD CONSTRAINT "curricula_valid_effective_year_range"
    CHECK (
      "effective_from_year" > 0
      AND ("effective_to_year" IS NULL OR "effective_to_year" >= "effective_from_year")
    );

ALTER TABLE "curriculum_subjects"
  ADD CONSTRAINT "curriculum_subjects_valid_year_level" CHECK ("year_level" > 0),
  ADD CONSTRAINT "curriculum_subjects_valid_term_number" CHECK ("term_number" > 0),
  ADD CONSTRAINT "curriculum_subjects_positive_credit_units" CHECK ("credit_units" > 0),
  ADD CONSTRAINT "curriculum_subjects_nonnegative_lecture_hours" CHECK ("lecture_hours" >= 0),
  ADD CONSTRAINT "curriculum_subjects_nonnegative_laboratory_hours" CHECK ("laboratory_hours" >= 0);

-- Canonical identifiers use lower/trim/NFKC. BEFORE triggers overwrite
-- caller-supplied normalized values before unique indexes are checked.
CREATE OR REPLACE FUNCTION "canonical_school_identifier"("input_value" text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
AS $$
  SELECT lower(btrim(normalize("input_value", NFKC)));
$$;

CREATE OR REPLACE FUNCTION "set_school_code_normalized"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."code_normalized" := "canonical_school_identifier"(NEW."code");
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "set_student_number_normalized"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."student_number_normalized" := "canonical_school_identifier"(NEW."student_number");
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "set_employee_number_normalized"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."employee_number_normalized" := "canonical_school_identifier"(NEW."employee_number");
  RETURN NEW;
END;
$$;

CREATE TRIGGER "colleges_canonicalize_code"
BEFORE INSERT OR UPDATE OF "code", "code_normalized" ON "colleges"
FOR EACH ROW
EXECUTE FUNCTION "set_school_code_normalized"();

CREATE TRIGGER "programs_canonicalize_code"
BEFORE INSERT OR UPDATE OF "code", "code_normalized" ON "programs"
FOR EACH ROW
EXECUTE FUNCTION "set_school_code_normalized"();

CREATE TRIGGER "subjects_canonicalize_code"
BEFORE INSERT OR UPDATE OF "code", "code_normalized" ON "subjects"
FOR EACH ROW
EXECUTE FUNCTION "set_school_code_normalized"();

CREATE TRIGGER "students_canonicalize_number"
BEFORE INSERT OR UPDATE OF "student_number", "student_number_normalized" ON "students"
FOR EACH ROW
EXECUTE FUNCTION "set_student_number_normalized"();

CREATE TRIGGER "faculty_canonicalize_number"
BEFORE INSERT OR UPDATE OF "employee_number", "employee_number_normalized" ON "faculty"
FOR EACH ROW
EXECUTE FUNCTION "set_employee_number_normalized"();

-- Child inserts and updates must remain within their owning program limits.
CREATE OR REPLACE FUNCTION "validate_curriculum_subject_program_limits"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  "allowed_years" smallint;
  "allowed_terms" smallint;
BEGIN
  SELECT p."duration_years", p."terms_per_year"
    INTO "allowed_years", "allowed_terms"
  FROM "curricula" c
  JOIN "programs" p ON p."id" = c."program_id"
  WHERE c."id" = NEW."curriculum_id";

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF NEW."year_level" > "allowed_years" THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'curriculum_subjects_year_level_within_program',
      MESSAGE = 'curriculum subject year level exceeds program duration';
  END IF;

  IF NEW."term_number" > "allowed_terms" THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'curriculum_subjects_term_within_program',
      MESSAGE = 'curriculum subject term exceeds program terms per year';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "validate_student_program_year_level"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  "allowed_years" smallint;
BEGIN
  IF NEW."program_id" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT p."duration_years"
    INTO "allowed_years"
  FROM "programs" p
  WHERE p."id" = NEW."program_id";

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF NEW."current_year_level" > "allowed_years" THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'students_year_level_within_program',
      MESSAGE = 'student year level exceeds program duration';
  END IF;

  RETURN NEW;
END;
$$;

-- Parent updates must not invalidate existing students or curriculum rows.
CREATE OR REPLACE FUNCTION "validate_program_limit_reduction"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "students" s
    WHERE s."program_id" = NEW."id"
      AND s."current_year_level" > NEW."duration_years"
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'programs_duration_covers_students',
      MESSAGE = 'program duration cannot be shorter than an assigned student year level';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "curriculum_subjects" cs
    JOIN "curricula" c ON c."id" = cs."curriculum_id"
    WHERE c."program_id" = NEW."id"
      AND cs."year_level" > NEW."duration_years"
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'programs_duration_covers_curriculum',
      MESSAGE = 'program duration cannot be shorter than a curriculum subject year level';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "curriculum_subjects" cs
    JOIN "curricula" c ON c."id" = cs."curriculum_id"
    WHERE c."program_id" = NEW."id"
      AND cs."term_number" > NEW."terms_per_year"
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'programs_terms_cover_curriculum',
      MESSAGE = 'program terms per year cannot exclude an existing curriculum subject';
  END IF;

  RETURN NEW;
END;
$$;

-- Curriculum reassignment must also satisfy the target program limits.
CREATE OR REPLACE FUNCTION "validate_curriculum_program_reassignment"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  "allowed_years" smallint;
  "allowed_terms" smallint;
BEGIN
  IF NEW."program_id" = OLD."program_id" THEN
    RETURN NEW;
  END IF;

  SELECT p."duration_years", p."terms_per_year"
    INTO "allowed_years", "allowed_terms"
  FROM "programs" p
  WHERE p."id" = NEW."program_id";

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM "curriculum_subjects" cs
    WHERE cs."curriculum_id" = OLD."id"
      AND cs."year_level" > "allowed_years"
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'curricula_program_duration_covers_subjects',
      MESSAGE = 'new curriculum program duration excludes an existing subject year level';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "curriculum_subjects" cs
    WHERE cs."curriculum_id" = OLD."id"
      AND cs."term_number" > "allowed_terms"
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'curricula_program_terms_cover_subjects',
      MESSAGE = 'new curriculum program terms exclude an existing subject';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "students" s
    WHERE s."curriculum_id" = OLD."id"
      AND s."current_year_level" > "allowed_years"
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'curricula_program_duration_covers_students',
      MESSAGE = 'new curriculum program duration excludes an assigned student year level';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "curriculum_subjects_validate_program_limits"
BEFORE INSERT OR UPDATE OF "curriculum_id", "year_level", "term_number" ON "curriculum_subjects"
FOR EACH ROW
EXECUTE FUNCTION "validate_curriculum_subject_program_limits"();

CREATE TRIGGER "students_validate_program_year_level"
BEFORE INSERT OR UPDATE OF "program_id", "current_year_level" ON "students"
FOR EACH ROW
EXECUTE FUNCTION "validate_student_program_year_level"();

CREATE TRIGGER "programs_validate_limit_reduction"
BEFORE UPDATE OF "duration_years", "terms_per_year" ON "programs"
FOR EACH ROW
EXECUTE FUNCTION "validate_program_limit_reduction"();

CREATE TRIGGER "curricula_validate_program_reassignment"
BEFORE UPDATE OF "program_id" ON "curricula"
FOR EACH ROW
EXECUTE FUNCTION "validate_curriculum_program_reassignment"();

-- Curriculum lifecycle is forward-only: DRAFT -> ACTIVE -> RETIRED.
CREATE OR REPLACE FUNCTION "enforce_curriculum_status_transition"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."status" = OLD."status" THEN
    RETURN NEW;
  END IF;

  IF (OLD."status" = 'DRAFT' AND NEW."status" = 'ACTIVE')
     OR (OLD."status" = 'ACTIVE' AND NEW."status" = 'RETIRED') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION USING
    ERRCODE = '23514',
    CONSTRAINT = 'curricula_forward_only_status',
    MESSAGE = 'curriculum status must transition from DRAFT to ACTIVE to RETIRED';
END;
$$;

CREATE OR REPLACE FUNCTION "reject_published_curriculum_deletion"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD."status" IN ('ACTIVE', 'RETIRED') THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'curricula_published_rows_are_permanent',
      MESSAGE = 'active or retired curricula cannot be deleted';
  END IF;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION "reject_curricula_truncate"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '42501',
    MESSAGE = 'truncating curricula is forbidden';
END;
$$;

CREATE TRIGGER "curricula_enforce_status_transition"
BEFORE UPDATE OF "status" ON "curricula"
FOR EACH ROW
EXECUTE FUNCTION "enforce_curriculum_status_transition"();

CREATE TRIGGER "curricula_prevent_published_deletion"
BEFORE DELETE ON "curricula"
FOR EACH ROW
EXECUTE FUNCTION "reject_published_curriculum_deletion"();

CREATE TRIGGER "curricula_prevent_truncate"
BEFORE TRUNCATE ON "curricula"
FOR EACH STATEMENT
EXECUTE FUNCTION "reject_curricula_truncate"();

ALTER TABLE "curricula" ENABLE ALWAYS TRIGGER "curricula_enforce_status_transition";
ALTER TABLE "curricula" ENABLE ALWAYS TRIGGER "curricula_prevent_published_deletion";
ALTER TABLE "curricula" ENABLE ALWAYS TRIGGER "curricula_prevent_truncate";

REVOKE TRUNCATE ON TABLE "curricula" FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cjc_app') THEN
    REVOKE TRUNCATE ON TABLE "curricula" FROM "cjc_app";
  END IF;
END;
$$;
