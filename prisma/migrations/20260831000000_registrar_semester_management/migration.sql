BEGIN;

-- Keep every term-scoped payment tied to the Registrar-controlled enrollment period.
ALTER TABLE "payment_transactions"
ADD COLUMN "enrollment_period_id" UUID;

UPDATE "payment_transactions" AS payment
SET "enrollment_period_id" = period."id"
FROM "student_obligations" AS obligation
JOIN "enrollment_periods" AS period
  ON period."academic_term_id" = obligation."academic_term_id"
WHERE payment."obligation_id" = obligation."id"
  AND payment."enrollment_period_id" IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "payment_transactions" AS payment
    JOIN "student_obligations" AS obligation
      ON obligation."id" = payment."obligation_id"
    JOIN "payment_types" AS payment_type
      ON payment_type."id" = obligation."payment_type_id"
    WHERE payment_type."name" = 'Entrance Fee'
      AND payment."enrollment_period_id" IS NULL
  ) THEN
    RAISE EXCEPTION
      'Cannot link every existing enrollment-fee transaction to an enrollment period';
  END IF;
END;
$$;

CREATE INDEX "payment_transactions_enrollment_period_id_status_idx"
ON "payment_transactions"("enrollment_period_id", "status");

ALTER TABLE "payment_transactions"
ADD CONSTRAINT "payment_transactions_enrollment_period_id_fkey"
FOREIGN KEY ("enrollment_period_id")
REFERENCES "enrollment_periods"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- Only one enrollment semester may be open at any instant.
CREATE UNIQUE INDEX "enrollment_periods_one_open_period_key"
ON "enrollment_periods" (("status"))
WHERE "status" = 'OPEN';

CREATE FUNCTION "validate_payment_transaction_enrollment_period"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  obligation_term_id uuid;
  obligation_payment_type text;
  period_term_id uuid;
BEGIN
  SELECT obligation."academic_term_id", payment_type."name"
    INTO obligation_term_id, obligation_payment_type
  FROM "student_obligations"
  AS obligation
  JOIN "payment_types" AS payment_type
    ON payment_type."id" = obligation."payment_type_id"
  WHERE obligation."id" = NEW."obligation_id";

  IF NEW."enrollment_period_id" IS NULL AND obligation_payment_type <> 'Entrance Fee' THEN
    RETURN NEW;
  END IF;

  IF NEW."enrollment_period_id" IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'payment_transactions_period_required',
      MESSAGE = 'a term-scoped payment transaction requires an enrollment period';
  END IF;

  IF obligation_term_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'payment_transactions_period_matches_obligation',
      MESSAGE = 'a payment transaction cannot reference a period without an academic-term obligation';
  END IF;

  SELECT "academic_term_id"
    INTO period_term_id
  FROM "enrollment_periods"
  WHERE "id" = NEW."enrollment_period_id";

  IF period_term_id IS DISTINCT FROM obligation_term_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'payment_transactions_period_matches_obligation',
      MESSAGE = 'payment transaction enrollment period does not match the obligation academic term';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "payment_transactions_validate_enrollment_period"
BEFORE INSERT OR UPDATE OF "obligation_id", "enrollment_period_id"
ON "payment_transactions"
FOR EACH ROW
EXECUTE FUNCTION "validate_payment_transaction_enrollment_period"();

COMMIT;
