-- Subjects are identified within their owning Program. The target Neon
-- database was audited before this migration and contains zero Subject rows,
-- so adding the required program_id does not require a data backfill.
ALTER TABLE "subjects"
  ADD COLUMN "program_id" UUID NOT NULL;

ALTER TABLE "subjects"
  ADD CONSTRAINT "subjects_program_id_fkey"
  FOREIGN KEY ("program_id") REFERENCES "programs"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX "subjects_code_normalized_key";

CREATE UNIQUE INDEX "subjects_program_id_code_normalized_key"
  ON "subjects"("program_id", "code_normalized");

CREATE INDEX "subjects_program_id_is_active_idx"
  ON "subjects"("program_id", "is_active");

CREATE OR REPLACE FUNCTION enforce_curriculum_subject_program_match()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  curriculum_program UUID;
  subject_program UUID;
BEGIN
  SELECT "program_id" INTO curriculum_program
    FROM "curricula" WHERE "id" = NEW."curriculum_id";
  SELECT "program_id" INTO subject_program
    FROM "subjects" WHERE "id" = NEW."subject_id";

  IF curriculum_program IS NOT NULL AND subject_program IS NOT NULL
     AND curriculum_program <> subject_program THEN
    RAISE EXCEPTION 'Curriculum subject and Subject must belong to the same Program.'
      USING ERRCODE = '23514', CONSTRAINT = 'curriculum_subjects_same_program';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "curriculum_subjects_same_program_trigger"
BEFORE INSERT OR UPDATE OF "curriculum_id", "subject_id"
ON "curriculum_subjects"
FOR EACH ROW EXECUTE FUNCTION enforce_curriculum_subject_program_match();

CREATE OR REPLACE FUNCTION enforce_subject_requirement_program_match()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  subject_program UUID;
  required_program UUID;
BEGIN
  SELECT "program_id" INTO subject_program
    FROM "subjects" WHERE "id" = NEW."subject_id";
  SELECT "program_id" INTO required_program
    FROM "subjects" WHERE "id" = NEW."required_subject_id";

  IF subject_program IS NOT NULL AND required_program IS NOT NULL
     AND subject_program <> required_program THEN
    RAISE EXCEPTION 'Subject requirements must reference a Subject in the same Program.'
      USING ERRCODE = '23514', CONSTRAINT = 'subject_requirements_same_program';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "subject_requirements_same_program_trigger"
BEFORE INSERT OR UPDATE OF "subject_id", "required_subject_id"
ON "subject_requirements"
FOR EACH ROW EXECUTE FUNCTION enforce_subject_requirement_program_match();
