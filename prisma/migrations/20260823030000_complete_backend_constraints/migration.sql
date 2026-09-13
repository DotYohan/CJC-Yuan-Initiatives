-- PLATFORM FOUNDATION MIGRATION TAIL
-- Append after Prisma-generated enums, tables, indexes, and foreign keys.
-- This file contains schema protections only and performs no data mutation.

ALTER TABLE "subject_requirements"
  ADD CONSTRAINT "subject_requirements_no_self_reference"
  CHECK ("subject_id" <> "required_subject_id");

ALTER TABLE "academic_years"
  ADD CONSTRAINT "academic_years_valid_date_range"
  CHECK ("ends_on" >= "starts_on");

ALTER TABLE "academic_terms"
  ADD CONSTRAINT "academic_terms_positive_term_number"
  CHECK ("term_number" > 0),
  ADD CONSTRAINT "academic_terms_valid_date_range"
  CHECK ("ends_on" >= "starts_on"),
  ADD CONSTRAINT "academic_terms_valid_enrollment_window"
  CHECK (
    "enrollment_starts" IS NULL
    OR "enrollment_ends" IS NULL
    OR "enrollment_ends" >= "enrollment_starts"
  );

ALTER TABLE "program_history"
  ADD CONSTRAINT "program_history_positive_version"
  CHECK ("version" > 0),
  ADD CONSTRAINT "program_history_positive_duration"
  CHECK ("duration_years" > 0),
  ADD CONSTRAINT "program_history_positive_terms"
  CHECK ("terms_per_year" > 0),
  ADD CONSTRAINT "program_history_valid_date_range"
  CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from");

ALTER TABLE "program_head_assignments"
  ADD CONSTRAINT "program_head_assignments_valid_date_range"
  CHECK ("ends_on" IS NULL OR "ends_on" >= "starts_on");

ALTER TABLE "student_program_history"
  ADD CONSTRAINT "student_program_history_valid_date_range"
  CHECK ("ends_on" IS NULL OR "ends_on" >= "starts_on");

ALTER TABLE "student_curriculum_assignments"
  ADD CONSTRAINT "student_curriculum_assignments_valid_date_range"
  CHECK ("ends_on" IS NULL OR "ends_on" >= "starts_on");

ALTER TABLE "faculty_department_assignments"
  ADD CONSTRAINT "faculty_department_assignments_valid_date_range"
  CHECK ("ends_on" IS NULL OR "ends_on" >= "starts_on");

ALTER TABLE "faculty_employment"
  ADD CONSTRAINT "faculty_employment_valid_date_range"
  CHECK ("ends_on" IS NULL OR "ends_on" >= "starts_on");

ALTER TABLE "enrollments"
  ADD CONSTRAINT "enrollments_positive_year_level"
  CHECK ("year_level" > 0);

ALTER TABLE "rooms"
  ADD CONSTRAINT "rooms_positive_capacity"
  CHECK ("capacity" IS NULL OR "capacity" > 0);

ALTER TABLE "class_sections"
  ADD CONSTRAINT "class_sections_positive_year_level"
  CHECK ("year_level" > 0),
  ADD CONSTRAINT "class_sections_positive_capacity"
  CHECK ("capacity" IS NULL OR "capacity" > 0);

ALTER TABLE "course_offerings"
  ADD CONSTRAINT "course_offerings_positive_credit_units"
  CHECK ("credit_units" > 0),
  ADD CONSTRAINT "course_offerings_nonnegative_lecture_hours"
  CHECK ("lecture_hours" >= 0),
  ADD CONSTRAINT "course_offerings_nonnegative_laboratory_hours"
  CHECK ("laboratory_hours" >= 0),
  ADD CONSTRAINT "course_offerings_positive_capacity"
  CHECK ("capacity" IS NULL OR "capacity" > 0);

ALTER TABLE "faculty_course_assignments"
  ADD CONSTRAINT "faculty_course_assignments_valid_date_range"
  CHECK ("starts_on" IS NULL OR "ends_on" IS NULL OR "ends_on" >= "starts_on");

ALTER TABLE "class_schedules"
  ADD CONSTRAINT "class_schedules_valid_time_range"
  CHECK ("ends_at" > "starts_at"),
  ADD CONSTRAINT "class_schedules_valid_date_range"
  CHECK ("effective_from" IS NULL OR "effective_to" IS NULL OR "effective_to" >= "effective_from");

ALTER TABLE "enrollment_items"
  ADD CONSTRAINT "enrollment_items_complete_override"
  CHECK (
    ("override_reason" IS NULL AND "override_approved_by_user_id" IS NULL)
    OR ("override_reason" IS NOT NULL AND "override_approved_by_user_id" IS NOT NULL)
  ),
  ADD CONSTRAINT "enrollment_items_valid_drop_time"
  CHECK ("dropped_at" IS NULL OR "dropped_at" >= "registered_at");

ALTER TABLE "grading_periods"
  ADD CONSTRAINT "grading_periods_positive_sequence"
  CHECK ("sequence" > 0),
  ADD CONSTRAINT "grading_periods_valid_weight"
  CHECK ("weight_percent" IS NULL OR ("weight_percent" >= 0 AND "weight_percent" <= 100)),
  ADD CONSTRAINT "grading_periods_valid_date_range"
  CHECK ("starts_on" IS NULL OR "ends_on" IS NULL OR "ends_on" >= "starts_on");

ALTER TABLE "grades"
  ADD CONSTRAINT "grades_value_required_after_draft"
  CHECK ("status" = 'DRAFT' OR "numeric_grade" IS NOT NULL OR "letter_grade" IS NOT NULL),
  ADD CONSTRAINT "grades_valid_approval_time"
  CHECK ("approved_at" IS NULL OR "submitted_at" IS NULL OR "approved_at" >= "submitted_at");

ALTER TABLE "clearance_cycles"
  ADD CONSTRAINT "clearance_cycles_valid_window"
  CHECK ("opens_at" IS NULL OR "closes_at" IS NULL OR "closes_at" >= "opens_at");

ALTER TABLE "student_clearances"
  ADD CONSTRAINT "student_clearances_valid_completion_time"
  CHECK ("completed_at" IS NULL OR "completed_at" >= "started_at");

ALTER TABLE "assessment_items"
  ADD CONSTRAINT "assessment_items_nonzero_amount"
  CHECK ("amount" <> 0);

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_nonnegative_total"
  CHECK ("total_amount" >= 0);

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_positive_amount"
  CHECK ("amount" > 0),
  ADD CONSTRAINT "payments_valid_posted_time"
  CHECK ("posted_at" IS NULL OR "posted_at" >= "received_at");

ALTER TABLE "payment_allocations"
  ADD CONSTRAINT "payment_allocations_positive_amount"
  CHECK ("amount" > 0);

ALTER TABLE "financial_transactions"
  ADD CONSTRAINT "financial_transactions_positive_amount"
  CHECK ("amount" > 0),
  ADD CONSTRAINT "financial_transactions_have_source"
  CHECK (
    "assessment_id" IS NOT NULL
    OR "invoice_id" IS NOT NULL
    OR "payment_id" IS NOT NULL
    OR "reversal_of_id" IS NOT NULL
  ),
  ADD CONSTRAINT "financial_transactions_no_self_reversal"
  CHECK ("reversal_of_id" IS NULL OR "reversal_of_id" <> "id");

ALTER TABLE "request_types"
  ADD CONSTRAINT "request_types_nonnegative_fee"
  CHECK ("default_fee_amount" IS NULL OR "default_fee_amount" >= 0),
  ADD CONSTRAINT "request_types_positive_service_days"
  CHECK ("service_days" IS NULL OR "service_days" > 0);

ALTER TABLE "student_requests"
  ADD CONSTRAINT "student_requests_positive_copies"
  CHECK ("copies" > 0),
  ADD CONSTRAINT "student_requests_valid_processing_time"
  CHECK ("processed_at" IS NULL OR "processed_at" >= "submitted_at"),
  ADD CONSTRAINT "student_requests_valid_completion_time"
  CHECK ("completed_at" IS NULL OR "completed_at" >= "submitted_at");

-- Only one open-ended assignment can represent the current value.
CREATE UNIQUE INDEX "program_history_one_current_per_program"
ON "program_history" ("program_id")
WHERE "effective_to" IS NULL;

CREATE UNIQUE INDEX "program_head_assignments_one_current_per_program"
ON "program_head_assignments" ("program_id")
WHERE "ends_on" IS NULL;

CREATE UNIQUE INDEX "student_program_history_one_current_per_student"
ON "student_program_history" ("student_id")
WHERE "ends_on" IS NULL;

CREATE UNIQUE INDEX "student_curriculum_assignments_one_current_per_student"
ON "student_curriculum_assignments" ("student_id")
WHERE "ends_on" IS NULL;

CREATE UNIQUE INDEX "faculty_department_assignments_one_current_primary"
ON "faculty_department_assignments" ("faculty_id")
WHERE "is_primary" = true AND "ends_on" IS NULL;

CREATE UNIQUE INDEX "grading_periods_one_final_per_term"
ON "grading_periods" ("academic_term_id")
WHERE "is_final" = true;

-- Application numbers are canonicalized by the same trusted function used by
-- school codes and profile identifiers.
CREATE OR REPLACE FUNCTION "set_application_number_normalized"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."application_number_normalized" := "canonical_school_identifier"(NEW."application_number");
  RETURN NEW;
END;
$$;

CREATE TRIGGER "admission_applications_canonicalize_number"
BEFORE INSERT OR UPDATE OF "application_number", "application_number_normalized"
ON "admission_applications"
FOR EACH ROW
EXECUTE FUNCTION "set_application_number_normalized"();

-- A section and each offering assigned to it must belong to the same term.
CREATE OR REPLACE FUNCTION "validate_course_offering_section_term"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."class_section_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "class_sections" cs
    WHERE cs."id" = NEW."class_section_id"
      AND cs."academic_term_id" = NEW."academic_term_id"
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'course_offerings_section_same_term',
      MESSAGE = 'course offering and class section must belong to the same academic term';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "course_offerings_validate_section_term"
BEFORE INSERT OR UPDATE OF "academic_term_id", "class_section_id" ON "course_offerings"
FOR EACH ROW
EXECUTE FUNCTION "validate_course_offering_section_term"();

-- Registration must target an offering in the enrollment term. Curriculum,
-- placement, prerequisite, and corequisite checks can only be bypassed by a
-- recorded user approval and reason.
CREATE OR REPLACE FUNCTION "validate_enrollment_item_registration"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_student_id uuid;
  v_curriculum_id uuid;
  v_year_level smallint;
  v_term_id uuid;
  v_term_number smallint;
  v_subject_id uuid;
BEGIN
  SELECT e."student_id", e."curriculum_id", e."year_level", e."academic_term_id", at."term_number"
    INTO v_student_id, v_curriculum_id, v_year_level, v_term_id, v_term_number
  FROM "enrollments" e
  JOIN "academic_terms" at ON at."id" = e."academic_term_id"
  WHERE e."id" = NEW."enrollment_id";

  SELECT co."subject_id"
    INTO v_subject_id
  FROM "course_offerings" co
  WHERE co."id" = NEW."course_offering_id"
    AND co."academic_term_id" = v_term_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'enrollment_items_offering_same_term',
      MESSAGE = 'enrollment item offering must belong to the enrollment academic term';
  END IF;

  IF NEW."override_approved_by_user_id" IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW."status" IN ('DROPPED', 'WITHDRAWN') THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM "curriculum_subjects" cs
    WHERE cs."curriculum_id" = v_curriculum_id
      AND cs."subject_id" = v_subject_id
      AND cs."year_level" = v_year_level
      AND cs."term_number" = v_term_number
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'enrollment_items_match_curriculum_placement',
      MESSAGE = 'subject is not placed in the student curriculum for this year and term';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "subject_requirements" sr
    WHERE sr."subject_id" = v_subject_id
      AND sr."type" = 'PREREQUISITE'
      AND NOT EXISTS (
        SELECT 1
        FROM "enrollment_items" prior_item
        JOIN "enrollments" prior_enrollment ON prior_enrollment."id" = prior_item."enrollment_id"
        JOIN "course_offerings" prior_offering ON prior_offering."id" = prior_item."course_offering_id"
        JOIN "grades" g ON g."enrollment_item_id" = prior_item."id"
        JOIN "grading_periods" gp ON gp."id" = g."grading_period_id"
        WHERE prior_enrollment."student_id" = v_student_id
          AND prior_offering."subject_id" = sr."required_subject_id"
          AND prior_item."status" = 'COMPLETED'
          AND gp."is_final" = true
          AND g."status" = 'POSTED'
          AND g."is_passing" = true
      )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'enrollment_items_prerequisites_satisfied',
      MESSAGE = 'one or more prerequisite subjects have not been completed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "subject_requirements" sr
    WHERE sr."subject_id" = v_subject_id
      AND sr."type" = 'COREQUISITE'
      AND NOT EXISTS (
        SELECT 1
        FROM "enrollment_items" same_item
        JOIN "course_offerings" same_offering ON same_offering."id" = same_item."course_offering_id"
        WHERE same_item."enrollment_id" = NEW."enrollment_id"
          AND same_offering."subject_id" = sr."required_subject_id"
          AND same_item."status" NOT IN ('DROPPED', 'WITHDRAWN')
      )
      AND NOT EXISTS (
        SELECT 1
        FROM "enrollment_items" prior_item
        JOIN "enrollments" prior_enrollment ON prior_enrollment."id" = prior_item."enrollment_id"
        JOIN "course_offerings" prior_offering ON prior_offering."id" = prior_item."course_offering_id"
        JOIN "grades" g ON g."enrollment_item_id" = prior_item."id"
        JOIN "grading_periods" gp ON gp."id" = g."grading_period_id"
        WHERE prior_enrollment."student_id" = v_student_id
          AND prior_offering."subject_id" = sr."required_subject_id"
          AND gp."is_final" = true
          AND g."status" = 'POSTED'
          AND g."is_passing" = true
      )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'enrollment_items_corequisites_satisfied',
      MESSAGE = 'one or more corequisite subjects are missing';
  END IF;

  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER "enrollment_items_validate_registration"
AFTER INSERT OR UPDATE
ON "enrollment_items"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "validate_enrollment_item_registration"();

-- Revalidate the complete registration after a corequisite is dropped or
-- removed; validating only the changed subject would miss its dependents.
CREATE OR REPLACE FUNCTION "validate_enrollment_corequisite_integrity"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_enrollment_id uuid;
  v_student_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_enrollment_id := OLD."enrollment_id";
  ELSE
    v_enrollment_id := NEW."enrollment_id";
  END IF;

  SELECT e."student_id" INTO v_student_id
  FROM "enrollments" e WHERE e."id" = v_enrollment_id;

  IF EXISTS (
    SELECT 1
    FROM "enrollment_items" dependent_item
    JOIN "course_offerings" dependent_offering ON dependent_offering."id" = dependent_item."course_offering_id"
    JOIN "subject_requirements" sr ON sr."subject_id" = dependent_offering."subject_id"
      AND sr."type" = 'COREQUISITE'
    WHERE dependent_item."enrollment_id" = v_enrollment_id
      AND dependent_item."status" NOT IN ('DROPPED', 'WITHDRAWN')
      AND dependent_item."override_approved_by_user_id" IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "enrollment_items" required_item
        JOIN "course_offerings" required_offering ON required_offering."id" = required_item."course_offering_id"
        WHERE required_item."enrollment_id" = v_enrollment_id
          AND required_offering."subject_id" = sr."required_subject_id"
          AND required_item."status" NOT IN ('DROPPED', 'WITHDRAWN')
      )
      AND NOT EXISTS (
        SELECT 1
        FROM "enrollment_items" prior_item
        JOIN "enrollments" prior_enrollment ON prior_enrollment."id" = prior_item."enrollment_id"
        JOIN "course_offerings" prior_offering ON prior_offering."id" = prior_item."course_offering_id"
        JOIN "grades" g ON g."enrollment_item_id" = prior_item."id"
        JOIN "grading_periods" gp ON gp."id" = g."grading_period_id"
        WHERE prior_enrollment."student_id" = v_student_id
          AND prior_offering."subject_id" = sr."required_subject_id"
          AND gp."is_final" = true
          AND g."status" = 'POSTED'
          AND g."is_passing" = true
      )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'enrollments_preserve_corequisites',
      MESSAGE = 'dropping this subject would leave another registration without its corequisite';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER "enrollment_items_preserve_corequisites"
AFTER INSERT OR UPDATE OR DELETE
ON "enrollment_items"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "validate_enrollment_corequisite_integrity"();

-- A grade period must belong to the same term as the registered offering.
CREATE OR REPLACE FUNCTION "validate_grade_academic_term"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "enrollment_items" ei
    JOIN "enrollments" e ON e."id" = ei."enrollment_id"
    JOIN "grading_periods" gp ON gp."id" = NEW."grading_period_id"
    WHERE ei."id" = NEW."enrollment_item_id"
      AND e."academic_term_id" = gp."academic_term_id"
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'grades_period_matches_enrollment_term',
      MESSAGE = 'grade period must match the enrollment academic term';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "grades_validate_academic_term"
BEFORE INSERT OR UPDATE OF "enrollment_item_id", "grading_period_id" ON "grades"
FOR EACH ROW
EXECUTE FUNCTION "validate_grade_academic_term"();

-- Optional transaction links must agree with their owning student and term.
CREATE OR REPLACE FUNCTION "validate_assessment_context"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."enrollment_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "enrollments" e
    WHERE e."id" = NEW."enrollment_id"
      AND e."student_id" = NEW."student_id"
      AND e."academic_term_id" = NEW."academic_term_id"
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'assessments_match_enrollment_context',
      MESSAGE = 'assessment student and term must match its enrollment';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "assessments_validate_context"
BEFORE INSERT OR UPDATE OF "student_id", "academic_term_id", "enrollment_id" ON "assessments"
FOR EACH ROW
EXECUTE FUNCTION "validate_assessment_context"();

CREATE OR REPLACE FUNCTION "validate_request_assessment_item"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."student_request_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM "assessments" a
    JOIN "student_requests" sr ON sr."id" = NEW."student_request_id"
    WHERE a."id" = NEW."assessment_id"
      AND a."student_id" = sr."student_id"
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'assessment_items_request_same_student',
      MESSAGE = 'request fee and assessment must belong to the same student';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "assessment_items_validate_request_student"
BEFORE INSERT OR UPDATE OF "assessment_id", "student_request_id" ON "assessment_items"
FOR EACH ROW
EXECUTE FUNCTION "validate_request_assessment_item"();

-- Room schedules cannot overlap. Faculty conflict validation remains in the
-- scheduling service because assignments are independently effective-dated.
CREATE OR REPLACE FUNCTION "reject_room_schedule_overlap"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."room_id" IS NOT NULL AND EXISTS (
    SELECT 1 FROM "class_schedules" existing
    WHERE existing."room_id" = NEW."room_id"
      AND existing."weekday" = NEW."weekday"
      AND existing."id" <> NEW."id"
      AND existing."starts_at" < NEW."ends_at"
      AND existing."ends_at" > NEW."starts_at"
      AND COALESCE(existing."effective_from", '-infinity'::date) <= COALESCE(NEW."effective_to", 'infinity'::date)
      AND COALESCE(NEW."effective_from", '-infinity'::date) <= COALESCE(existing."effective_to", 'infinity'::date)
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'class_schedules_no_room_overlap',
      MESSAGE = 'room schedule overlaps an existing meeting';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "class_schedules_reject_room_overlap"
BEFORE INSERT OR UPDATE OF "room_id", "weekday", "starts_at", "ends_at", "effective_from", "effective_to"
ON "class_schedules"
FOR EACH ROW
EXECUTE FUNCTION "reject_room_schedule_overlap"();

-- Payment allocations must remain within one student account and one currency.
CREATE OR REPLACE FUNCTION "validate_payment_allocation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_payment_student uuid;
  v_invoice_student uuid;
  v_payment_currency char(3);
  v_invoice_currency char(3);
  v_payment_amount numeric(12,2);
  v_invoice_amount numeric(12,2);
  v_payment_allocated numeric(12,2);
  v_invoice_allocated numeric(12,2);
BEGIN
  SELECT p."student_id", p."currency", p."amount"
    INTO v_payment_student, v_payment_currency, v_payment_amount
  FROM "payments" p WHERE p."id" = NEW."payment_id" FOR UPDATE;

  SELECT a."student_id", i."currency", i."total_amount"
    INTO v_invoice_student, v_invoice_currency, v_invoice_amount
  FROM "invoices" i
  JOIN "assessments" a ON a."id" = i."assessment_id"
  WHERE i."id" = NEW."invoice_id" FOR UPDATE OF i;

  IF v_payment_student <> v_invoice_student OR v_payment_currency <> v_invoice_currency THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'payment_allocations_same_account_currency',
      MESSAGE = 'payment and invoice must belong to the same student and currency';
  END IF;

  SELECT COALESCE(sum(pa."amount"), 0) INTO v_payment_allocated
  FROM "payment_allocations" pa
  WHERE pa."payment_id" = NEW."payment_id" AND pa."id" <> NEW."id";

  SELECT COALESCE(sum(pa."amount"), 0) INTO v_invoice_allocated
  FROM "payment_allocations" pa
  WHERE pa."invoice_id" = NEW."invoice_id" AND pa."id" <> NEW."id";

  IF v_payment_allocated + NEW."amount" > v_payment_amount
     OR v_invoice_allocated + NEW."amount" > v_invoice_amount THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      CONSTRAINT = 'payment_allocations_within_available_amounts',
      MESSAGE = 'payment allocation exceeds the payment or invoice amount';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "payment_allocations_validate_amounts"
BEFORE INSERT OR UPDATE OF "payment_id", "invoice_id", "amount" ON "payment_allocations"
FOR EACH ROW
EXECUTE FUNCTION "validate_payment_allocation"();

CREATE OR REPLACE FUNCTION "validate_financial_transaction_context"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."assessment_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "assessments" a
    WHERE a."id" = NEW."assessment_id"
      AND a."student_id" = NEW."student_id"
      AND a."currency" = NEW."currency"
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      CONSTRAINT = 'financial_transactions_assessment_context',
      MESSAGE = 'financial transaction does not match assessment student or currency';
  END IF;

  IF NEW."invoice_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "invoices" i
    JOIN "assessments" a ON a."id" = i."assessment_id"
    WHERE i."id" = NEW."invoice_id"
      AND a."student_id" = NEW."student_id"
      AND i."currency" = NEW."currency"
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      CONSTRAINT = 'financial_transactions_invoice_context',
      MESSAGE = 'financial transaction does not match invoice student or currency';
  END IF;

  IF NEW."payment_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "payments" p
    WHERE p."id" = NEW."payment_id"
      AND p."student_id" = NEW."student_id"
      AND p."currency" = NEW."currency"
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      CONSTRAINT = 'financial_transactions_payment_context',
      MESSAGE = 'financial transaction does not match payment student or currency';
  END IF;

  IF NEW."reversal_of_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "financial_transactions" original
    WHERE original."id" = NEW."reversal_of_id"
      AND original."student_id" = NEW."student_id"
      AND original."currency" = NEW."currency"
      AND original."amount" = NEW."amount"
      AND original."direction" <> NEW."direction"
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      CONSTRAINT = 'financial_transactions_valid_reversal',
      MESSAGE = 'reversal must offset the original transaction for the same account';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "financial_transactions_validate_context"
BEFORE INSERT ON "financial_transactions"
FOR EACH ROW
EXECUTE FUNCTION "validate_financial_transaction_context"();

-- Immutable histories and ledgers are corrected by appending a new event or a
-- reversing financial transaction, never by rewriting an earlier record.
CREATE OR REPLACE FUNCTION "reject_immutable_school_record_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '55000',
    MESSAGE = format('%s records are append-only; %s is forbidden', TG_TABLE_NAME, TG_OP);
END;
$$;

CREATE TRIGGER "admission_application_status_history_immutable"
BEFORE UPDATE OR DELETE OR TRUNCATE ON "admission_application_status_history"
FOR EACH STATEMENT EXECUTE FUNCTION "reject_immutable_school_record_mutation"();

CREATE TRIGGER "student_status_history_immutable"
BEFORE UPDATE OR DELETE OR TRUNCATE ON "student_status_history"
FOR EACH STATEMENT EXECUTE FUNCTION "reject_immutable_school_record_mutation"();

CREATE TRIGGER "enrollment_status_history_immutable"
BEFORE UPDATE OR DELETE OR TRUNCATE ON "enrollment_status_history"
FOR EACH STATEMENT EXECUTE FUNCTION "reject_immutable_school_record_mutation"();

CREATE TRIGGER "grade_history_immutable"
BEFORE UPDATE OR DELETE OR TRUNCATE ON "grade_history"
FOR EACH STATEMENT EXECUTE FUNCTION "reject_immutable_school_record_mutation"();

CREATE TRIGGER "student_request_status_history_immutable"
BEFORE UPDATE OR DELETE OR TRUNCATE ON "student_request_status_history"
FOR EACH STATEMENT EXECUTE FUNCTION "reject_immutable_school_record_mutation"();

CREATE TRIGGER "payment_allocations_immutable"
BEFORE UPDATE OR DELETE OR TRUNCATE ON "payment_allocations"
FOR EACH STATEMENT EXECUTE FUNCTION "reject_immutable_school_record_mutation"();

CREATE TRIGGER "financial_transactions_immutable"
BEFORE UPDATE OR DELETE OR TRUNCATE ON "financial_transactions"
FOR EACH STATEMENT EXECUTE FUNCTION "reject_immutable_school_record_mutation"();

ALTER TABLE "admission_application_status_history" ENABLE ALWAYS TRIGGER "admission_application_status_history_immutable";
ALTER TABLE "student_status_history" ENABLE ALWAYS TRIGGER "student_status_history_immutable";
ALTER TABLE "enrollment_status_history" ENABLE ALWAYS TRIGGER "enrollment_status_history_immutable";
ALTER TABLE "grade_history" ENABLE ALWAYS TRIGGER "grade_history_immutable";
ALTER TABLE "student_request_status_history" ENABLE ALWAYS TRIGGER "student_request_status_history_immutable";
ALTER TABLE "payment_allocations" ENABLE ALWAYS TRIGGER "payment_allocations_immutable";
ALTER TABLE "financial_transactions" ENABLE ALWAYS TRIGGER "financial_transactions_immutable";

REVOKE TRUNCATE ON TABLE
  "admission_application_status_history",
  "student_status_history",
  "enrollment_status_history",
  "grade_history",
  "student_request_status_history",
  "payment_allocations",
  "financial_transactions"
FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cjc_app') THEN
    REVOKE TRUNCATE ON TABLE
      "admission_application_status_history",
      "student_status_history",
      "enrollment_status_history",
      "grade_history",
      "student_request_status_history",
      "payment_allocations",
      "financial_transactions"
    FROM "cjc_app";
  END IF;
END;
$$;
