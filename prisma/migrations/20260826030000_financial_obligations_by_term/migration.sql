-- Make student obligations term-aware for SY-specific billing and payment status.

ALTER TABLE "student_obligations"
ADD COLUMN IF NOT EXISTS "academic_term_id" UUID;

ALTER TABLE "student_obligations"
ADD CONSTRAINT "student_obligations_academic_term_id_fkey"
FOREIGN KEY ("academic_term_id") REFERENCES "academic_terms"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "student_obligations_student_id_academic_term_id_status_idx"
ON "student_obligations"("student_id", "academic_term_id", "status");

CREATE INDEX IF NOT EXISTS "student_obligations_academic_term_id_payment_type_id_status_idx"
ON "student_obligations"("academic_term_id", "payment_type_id", "status");
