-- Correct legacy paid obligations using the payment event's actual academic
-- term, then provision the fee for enrollment periods that are already open.

WITH payment_scope AS (
  SELECT
    obligation."id" AS obligation_id,
    MIN(COALESCE(payment_tx."verified_at", payment_tx."created_at")) AS paid_at
  FROM "student_obligations" AS obligation
  JOIN "payment_transactions" AS payment_tx
    ON payment_tx."obligation_id" = obligation."id"
   AND payment_tx."status" = 'VERIFIED'
  GROUP BY obligation."id"
), resolved_scope AS (
  SELECT
    payment_scope.obligation_id,
    matching_term."id" AS academic_term_id,
    matching_term."academic_year_id"
  FROM payment_scope
  JOIN LATERAL (
    SELECT term."id", term."academic_year_id"
    FROM "academic_terms" AS term
    WHERE payment_scope.paid_at::date BETWEEN term."starts_on" AND term."ends_on"
    ORDER BY term."starts_on" DESC
    LIMIT 1
  ) AS matching_term ON true
)
UPDATE "student_obligations" AS obligation
SET
  "academic_term_id" = resolved_scope.academic_term_id,
  "academic_year_id" = resolved_scope.academic_year_id
FROM resolved_scope
WHERE obligation."id" = resolved_scope.obligation_id
  AND (
    obligation."academic_term_id" IS DISTINCT FROM resolved_scope.academic_term_id
    OR obligation."academic_year_id" IS DISTINCT FROM resolved_scope.academic_year_id
  );

INSERT INTO "student_obligations" (
  "id", "student_id", "academic_year_id", "academic_term_id",
  "payment_type_id", "amount_due", "status", "created_by_user_id",
  "created_at", "updated_at"
)
SELECT
  gen_random_uuid(), student."id", period."academic_year_id", period."academic_term_id",
  payment_type."id", payment_type."amount", 'UNPAID', period."opened_by_user_id",
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "enrollment_periods" AS period
JOIN "students" AS student
  ON student."status" IN ('APPLICANT', 'ACTIVE', 'on_leave')
JOIN "payment_types" AS payment_type
  ON payment_type."name" = 'Entrance Fee'
 AND payment_type."is_active" = true
WHERE period."status" = 'OPEN'
  AND NOT EXISTS (
    SELECT 1
    FROM "student_obligations" AS existing
    WHERE existing."student_id" = student."id"
      AND existing."academic_year_id" = period."academic_year_id"
      AND existing."academic_term_id" = period."academic_term_id"
      AND existing."payment_type_id" = payment_type."id"
      AND existing."status" <> 'CANCELLED'
  )
ON CONFLICT DO NOTHING;
