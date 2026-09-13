-- PostgreSQL requires newly-added enum values to be committed before later
-- migration statements can safely use them in constraints and trigger bodies.

ALTER TYPE "admission_application_status"
  RENAME VALUE 'SUBMITTED' TO 'PENDING';

ALTER TYPE "admission_application_status"
  RENAME VALUE 'ACCEPTED' TO 'APPROVED';

ALTER TYPE "admission_application_status"
  ADD VALUE IF NOT EXISTS 'RETURNED_FOR_CORRECTION';

ALTER TYPE "enrollment_application_status"
  ADD VALUE IF NOT EXISTS 'returned_for_correction';
