-- Repair and harden the centralized financial module without replacing existing records.

ALTER TABLE "payment_types"
  ADD CONSTRAINT "payment_types_amount_positive" CHECK ("amount" > 0);

ALTER TABLE "student_obligations"
  ADD CONSTRAINT "student_obligations_amount_due_positive" CHECK ("amount_due" > 0),
  ADD CONSTRAINT "student_obligations_status_valid"
    CHECK ("status" IN ('UNPAID', 'PARTIAL', 'PAID', 'WAIVED', 'CANCELLED'));

ALTER TABLE "payment_transactions"
  ADD CONSTRAINT "payment_transactions_amount_paid_positive" CHECK ("amount_paid" > 0);

CREATE UNIQUE INDEX "payment_transactions_gateway_reference_key"
  ON "payment_transactions" ("gateway_transaction_reference")
  WHERE "gateway_transaction_reference" IS NOT NULL;

CREATE UNIQUE INDEX "student_obligations_global_active_key"
  ON "student_obligations" ("student_id", "payment_type_id")
  WHERE "semester" IS NULL
    AND "school_year" IS NULL
    AND "status" <> 'CANCELLED';

CREATE OR REPLACE FUNCTION prevent_payment_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'payment logs are immutable';
END;
$$;

CREATE TRIGGER payment_logs_prevent_update
BEFORE UPDATE ON "payment_logs"
FOR EACH ROW EXECUTE FUNCTION prevent_payment_log_mutation();

CREATE TRIGGER payment_logs_prevent_delete
BEFORE DELETE ON "payment_logs"
FOR EACH ROW EXECUTE FUNCTION prevent_payment_log_mutation();

INSERT INTO "permissions" ("slug", "description", "is_system", "created_at", "updated_at")
VALUES
  ('financial.payment_types.view', 'View payment types.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('financial.payment_types.manage', 'Create, update, and deactivate payment types.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('financial.obligations.view', 'View student obligations.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('financial.obligations.manage', 'Create, update, and manage student obligations.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('financial.summary.view', 'View student financial summary.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('financial.payments.initiate', 'Initiate payment for own obligations.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('financial.payments.process', 'Process payment through gateway.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('financial.payments.view', 'View own payment transactions.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('financial.payments.view_all', 'View all payment transactions.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('financial.payments.verify', 'Verify payment exceptions.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('financial.payments.view_failed', 'View failed payment transactions.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('financial.receipts.view', 'View and download receipts.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE SET
  "description" = EXCLUDED."description",
  "is_system" = true,
  "updated_at" = CURRENT_TIMESTAMP;

WITH grants("role_slug", "permission_slug") AS (
  VALUES
    ('administrator', 'financial.payment_types.view'),
    ('administrator', 'financial.payment_types.manage'),
    ('administrator', 'financial.obligations.view'),
    ('administrator', 'financial.obligations.manage'),
    ('administrator', 'financial.summary.view'),
    ('administrator', 'financial.payments.initiate'),
    ('administrator', 'financial.payments.process'),
    ('administrator', 'financial.payments.view'),
    ('administrator', 'financial.payments.view_all'),
    ('administrator', 'financial.payments.verify'),
    ('administrator', 'financial.payments.view_failed'),
    ('administrator', 'financial.receipts.view'),
    ('cashier', 'financial.payment_types.view'),
    ('cashier', 'financial.obligations.view'),
    ('cashier', 'financial.obligations.manage'),
    ('cashier', 'financial.summary.view'),
    ('cashier', 'financial.payments.view_all'),
    ('cashier', 'financial.payments.verify'),
    ('cashier', 'financial.payments.view_failed'),
    ('cashier', 'financial.receipts.view'),
    ('student', 'financial.obligations.view'),
    ('student', 'financial.summary.view'),
    ('student', 'financial.payments.initiate'),
    ('student', 'financial.payments.process'),
    ('student', 'financial.payments.view'),
    ('student', 'financial.receipts.view'),
    ('registrar', 'financial.payment_types.view'),
    ('registrar', 'financial.obligations.view'),
    ('registrar', 'financial.summary.view'),
    ('registrar', 'financial.payments.view'),
    ('registrar', 'financial.receipts.view')
)
INSERT INTO "role_permissions" ("role_id", "permission_id", "granted_at", "granted_by_user_id")
SELECT r."id", p."id", CURRENT_TIMESTAMP, NULL
FROM grants g
JOIN "roles" r ON r."slug" = g."role_slug"
JOIN "permissions" p ON p."slug" = g."permission_slug"
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "student_obligations" (
  "id", "student_id", "payment_type_id", "amount_due", "status",
  "created_by_user_id", "created_at", "updated_at"
)
SELECT
  gen_random_uuid(), s."id", pt."id", pt."amount", 'UNPAID',
  NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "students" s
JOIN "payment_types" pt ON pt."name" = 'Entrance Fee' AND pt."is_active" = true
WHERE s."status" = 'APPLICANT'
  AND NOT EXISTS (
    SELECT 1
    FROM "student_obligations" so
    WHERE so."student_id" = s."id"
      AND so."payment_type_id" = pt."id"
      AND so."status" <> 'CANCELLED'
  );
