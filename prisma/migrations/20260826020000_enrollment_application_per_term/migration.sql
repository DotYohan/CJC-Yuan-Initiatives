-- Support multiple enrollment applications per student by academic term (SY/term-aware history).
-- Keeps prior SY records while enforcing one application per student per term.

DROP INDEX IF EXISTS "enrollment_applications_student_id_key";

CREATE UNIQUE INDEX "enrollment_applications_student_id_academic_term_id_key"
ON "enrollment_applications"("student_id", "academic_term_id");
