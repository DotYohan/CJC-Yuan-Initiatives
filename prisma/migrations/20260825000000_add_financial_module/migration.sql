-- Financial Management Module Migration
-- Creates tables for Payment Types, Student Obligations, Payment Transactions, Payment Logs, and Receipts

-- Enums
CREATE TYPE "payment_transaction_status" AS ENUM (
  'CREATED', 'PENDING', 'PROCESSING', 'SUCCESS', 'VERIFIED', 'FAILED', 'REFUNDED'
);

CREATE TYPE "payment_log_event_type" AS ENUM (
  'PAYMENT_CREATED', 'PAYMENT_RECEIVED', 'PAYMENT_VERIFIED', 'PAYMENT_FAILED',
  'PAYMENT_REFUNDED', 'PAYMENT_REVERSED', 'GATEWAY_RESPONSE_RECEIVED',
  'VERIFICATION_PASSED', 'VERIFICATION_FAILED'
);

-- Payment Types table
CREATE TABLE "payment_types" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "category" VARCHAR(50) NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_types_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_types_name_key" UNIQUE ("name")
);

CREATE INDEX "payment_types_category_is_active_idx" ON "payment_types" ("category", "is_active");

-- Student Obligations table
CREATE TABLE "student_obligations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "student_id" UUID NOT NULL,
  "payment_type_id" UUID NOT NULL,
  "amount_due" DECIMAL(12, 2) NOT NULL,
  "semester" VARCHAR(20),
  "school_year" VARCHAR(20),
  "status" VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
  "created_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_obligations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "student_obligations_student_id_status_idx" ON "student_obligations" ("student_id", "status");
CREATE INDEX "student_obligations_payment_type_id_idx" ON "student_obligations" ("payment_type_id");
CREATE INDEX "student_obligations_semester_school_year_idx" ON "student_obligations" ("semester", "school_year");

ALTER TABLE "student_obligations" ADD CONSTRAINT "student_obligations_student_id_fkey"
  FOREIGN KEY ("student_id") REFERENCES "students" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "student_obligations" ADD CONSTRAINT "student_obligations_payment_type_id_fkey"
  FOREIGN KEY ("payment_type_id") REFERENCES "payment_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "student_obligations" ADD CONSTRAINT "student_obligations_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Payment Transactions table
CREATE TABLE "payment_transactions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "obligation_id" UUID NOT NULL,
  "student_id" UUID NOT NULL,
  "gateway_name" VARCHAR(50) NOT NULL,
  "gateway_transaction_reference" VARCHAR(100),
  "payment_method" "payment_method" NOT NULL,
  "amount_paid" DECIMAL(12, 2) NOT NULL,
  "status" "payment_transaction_status" NOT NULL DEFAULT 'CREATED',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verified_at" TIMESTAMPTZ(3),
  "verified_by_user_id" UUID,
  CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payment_transactions_student_id_created_at_idx" ON "payment_transactions" ("student_id", "created_at");
CREATE INDEX "payment_transactions_obligation_id_idx" ON "payment_transactions" ("obligation_id");
CREATE INDEX "payment_transactions_gateway_transaction_reference_idx" ON "payment_transactions" ("gateway_transaction_reference");
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions" ("status");

ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_obligation_id_fkey"
  FOREIGN KEY ("obligation_id") REFERENCES "student_obligations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_student_id_fkey"
  FOREIGN KEY ("student_id") REFERENCES "students" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_verified_by_user_id_fkey"
  FOREIGN KEY ("verified_by_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Payment Logs table
CREATE TABLE "payment_logs" (
  "id" BIGSERIAL NOT NULL,
  "transaction_id" UUID NOT NULL,
  "event_type" "payment_log_event_type" NOT NULL,
  "description" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payment_logs_transaction_id_created_at_idx" ON "payment_logs" ("transaction_id", "created_at");
CREATE INDEX "payment_logs_event_type_idx" ON "payment_logs" ("event_type");

ALTER TABLE "payment_logs" ADD CONSTRAINT "payment_logs_transaction_id_fkey"
  FOREIGN KEY ("transaction_id") REFERENCES "payment_transactions" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Receipts table
CREATE TABLE "receipts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "transaction_id" UUID NOT NULL,
  "receipt_number" VARCHAR(50) NOT NULL,
  "issued_by_user_id" UUID,
  "issued_date" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "file_path" VARCHAR(500),
  CONSTRAINT "receipts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "receipts_transaction_id_key" UNIQUE ("transaction_id"),
  CONSTRAINT "receipts_receipt_number_key" UNIQUE ("receipt_number")
);

CREATE INDEX "receipts_issued_date_idx" ON "receipts" ("issued_date");

ALTER TABLE "receipts" ADD CONSTRAINT "receipts_transaction_id_fkey"
  FOREIGN KEY ("transaction_id") REFERENCES "payment_transactions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "receipts" ADD CONSTRAINT "receipts_issued_by_user_id_fkey"
  FOREIGN KEY ("issued_by_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed initial payment types
INSERT INTO "payment_types" ("id", "name", "description", "category", "amount", "is_active", "created_at", "updated_at") VALUES
  (gen_random_uuid(), 'Entrance Fee', 'Non-refundable entrance fee required before enrollment', 'ADMISSION', 500.00, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Tuition Fee', 'Semester tuition fee', 'TUITION', 15000.00, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Laboratory Fee', 'Laboratory usage fee per subject', 'LABORATORY', 1000.00, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Document Request Fee', 'Fee for document requests (TOR, Certifications, etc.)', 'DOCUMENT', 50.00, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Library Fee', 'Library services fee', 'LIBRARY', 300.00, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Medical/Dental Fee', 'Medical and dental services fee', 'MEDICAL', 200.00, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Student Activity Fee', 'Student organizations and activities fee', 'ACTIVITY', 150.00, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Insurance Fee', 'Student insurance coverage', 'INSURANCE', 100.00, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);