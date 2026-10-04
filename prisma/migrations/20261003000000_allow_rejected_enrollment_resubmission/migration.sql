-- Allow a rejected enrollment application to be submitted again as a fresh form.
-- The per-student/per-term unique application is intentionally reused; admission
-- attempts remain separately tracked in admission_applications and their history.

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
     OR (OLD."status" IN ('returned_for_correction', 'REJECTED') AND NEW."status" = 'SUBMITTED') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid enrollment application status transition: % -> %', OLD."status", NEW."status"
    USING ERRCODE = 'check_violation';
END;
$$;
