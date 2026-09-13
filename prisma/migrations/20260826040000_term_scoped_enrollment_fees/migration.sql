-- Scope enrollment-fee obligations to one exact academic year and term.
-- Existing obligations and payments are retained as historical records.

ALTER TABLE "student_obligations"
ADD COLUMN "academic_year_id" UUID;

-- Repair legacy obligations using the most recent admission application for
-- the student. Records with no reliable source term remain historical/global.
UPDATE "student_obligations" AS so
SET "academic_term_id" = (
  SELECT aa."academic_term_id"
  FROM "admission_applications" AS aa
  WHERE aa."converted_student_id" = so."student_id"
  ORDER BY aa."created_at" DESC
  LIMIT 1
)
WHERE so."academic_term_id" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "admission_applications" AS aa
    WHERE aa."converted_student_id" = so."student_id"
  );

UPDATE "student_obligations" AS so
SET "academic_year_id" = term."academic_year_id"
FROM "academic_terms" AS term
WHERE term."id" = so."academic_term_id"
  AND so."academic_year_id" IS NULL;

ALTER TABLE "student_obligations"
ADD CONSTRAINT "student_obligations_academic_year_id_fkey"
FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION enforce_student_obligation_academic_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  term_year_id UUID;
BEGIN
  IF NEW."academic_term_id" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT "academic_year_id" INTO term_year_id
  FROM "academic_terms"
  WHERE "id" = NEW."academic_term_id";

  IF term_year_id IS NULL THEN
    RAISE EXCEPTION 'student obligation academic term does not exist';
  END IF;

  IF NEW."academic_year_id" IS NULL THEN
    NEW."academic_year_id" := term_year_id;
  ELSIF NEW."academic_year_id" <> term_year_id THEN
    RAISE EXCEPTION 'student obligation academic year does not match its academic term';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER student_obligations_enforce_academic_scope
BEFORE INSERT OR UPDATE OF "academic_year_id", "academic_term_id"
ON "student_obligations"
FOR EACH ROW EXECUTE FUNCTION enforce_student_obligation_academic_scope();

DROP INDEX "student_obligations_global_active_key";

-- One active obligation for the exact student + school year + term + fee type.
CREATE UNIQUE INDEX "student_obligations_term_active_key"
ON "student_obligations" (
  "student_id", "academic_year_id", "academic_term_id", "payment_type_id"
)
WHERE "academic_term_id" IS NOT NULL
  AND "academic_year_id" IS NOT NULL
  AND "status" <> 'CANCELLED';

-- Preserve support for intentional non-academic/global obligations.
CREATE UNIQUE INDEX "student_obligations_global_active_key"
ON "student_obligations" ("student_id", "payment_type_id")
WHERE "academic_term_id" IS NULL
  AND "academic_year_id" IS NULL
  AND "semester" IS NULL
  AND "school_year" IS NULL
  AND "status" <> 'CANCELLED';

CREATE INDEX "student_obligations_student_id_academic_year_id_status_idx"
ON "student_obligations" ("student_id", "academic_year_id", "status");

CREATE INDEX "student_obligations_academic_year_id_payment_type_id_status_idx"
ON "student_obligations" ("academic_year_id", "payment_type_id", "status");
