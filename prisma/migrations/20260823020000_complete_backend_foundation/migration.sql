-- CreateEnum
CREATE TYPE "academic_period_status" AS ENUM ('PLANNED', 'enrollment_open', 'ACTIVE', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "admission_application_status" AS ENUM ('DRAFT', 'SUBMITTED', 'under_review', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "faculty_employment_type" AS ENUM ('full_time', 'part_time', 'ADJUNCT', 'CONTRACTUAL', 'VISITING');

-- CreateEnum
CREATE TYPE "enrollment_status" AS ENUM ('DRAFT', 'PENDING', 'ASSESSED', 'ENROLLED', 'CANCELLED', 'WITHDRAWN', 'COMPLETED');

-- CreateEnum
CREATE TYPE "enrollment_item_status" AS ENUM ('PENDING', 'ENROLLED', 'DROPPED', 'WITHDRAWN', 'COMPLETED');

-- CreateEnum
CREATE TYPE "course_offering_status" AS ENUM ('PLANNED', 'OPEN', 'CLOSED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "faculty_assignment_role" AS ENUM ('primary_instructor', 'co_instructor', 'laboratory');

-- CreateEnum
CREATE TYPE "weekday" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "grading_period_type" AS ENUM ('PRELIM', 'MIDTERM', 'PREFINAL', 'FINAL', 'COMPLETION', 'OTHER');

-- CreateEnum
CREATE TYPE "grade_status" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'VOIDED');

-- CreateEnum
CREATE TYPE "clearance_cycle_status" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "clearance_office_type" AS ENUM ('REGISTRAR', 'FINANCE', 'LIBRARY', 'DEPARTMENT', 'LABORATORY', 'OTHER');

-- CreateEnum
CREATE TYPE "clearance_status" AS ENUM ('PENDING', 'in_progress', 'CLEARED', 'BLOCKED', 'WAIVED');

-- CreateEnum
CREATE TYPE "clearance_item_status" AS ENUM ('PENDING', 'APPROVED', 'BLOCKED', 'WAIVED');

-- CreateEnum
CREATE TYPE "assessment_status" AS ENUM ('DRAFT', 'FINALIZED', 'VOIDED');

-- CreateEnum
CREATE TYPE "invoice_status" AS ENUM ('DRAFT', 'ISSUED', 'partially_paid', 'PAID', 'VOIDED');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('PENDING', 'POSTED', 'VOIDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('CASH', 'CARD', 'bank_transfer', 'ONLINE', 'CHECK', 'OTHER');

-- CreateEnum
CREATE TYPE "financial_entry_type" AS ENUM ('ASSESSMENT', 'PAYMENT', 'ADJUSTMENT', 'REFUND', 'REVERSAL');

-- CreateEnum
CREATE TYPE "financial_direction" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "student_request_status" AS ENUM ('SUBMITTED', 'under_review', 'APPROVED', 'REJECTED', 'PROCESSING', 'ready_for_release', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "academic_years" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE NOT NULL,
    "status" "academic_period_status" NOT NULL DEFAULT 'PLANNED',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_terms" (
    "id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "term_number" SMALLINT NOT NULL,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE NOT NULL,
    "enrollment_starts" TIMESTAMPTZ(3),
    "enrollment_ends" TIMESTAMPTZ(3),
    "status" "academic_period_status" NOT NULL DEFAULT 'PLANNED',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academic_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_history" (
    "id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "department_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "credential" VARCHAR(100) NOT NULL,
    "duration_years" SMALLINT NOT NULL,
    "terms_per_year" SMALLINT NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "change_reason" VARCHAR(500),
    "changed_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "program_head_assignments" (
    "id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "faculty_id" UUID NOT NULL,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE,
    "assigned_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_head_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admission_applications" (
    "id" UUID NOT NULL,
    "application_number" VARCHAR(40) NOT NULL,
    "application_number_normalized" VARCHAR(40) NOT NULL,
    "applicant_user_id" UUID,
    "intended_program_id" UUID NOT NULL,
    "academic_term_id" UUID NOT NULL,
    "converted_student_id" UUID,
    "first_name" VARCHAR(100) NOT NULL,
    "middle_name" VARCHAR(100),
    "last_name" VARCHAR(100) NOT NULL,
    "suffix" VARCHAR(20),
    "birth_date" DATE,
    "email" VARCHAR(254) NOT NULL,
    "phone" VARCHAR(32),
    "status" "admission_application_status" NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMPTZ(3),
    "decided_at" TIMESTAMPTZ(3),
    "decision_by_user_id" UUID,
    "decision_notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admission_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admission_application_status_history" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "from_status" "admission_application_status",
    "to_status" "admission_application_status" NOT NULL,
    "remarks" TEXT,
    "changed_by_user_id" UUID,
    "changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admission_application_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_program_history" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "academic_term_id" UUID,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE,
    "reason" VARCHAR(500),
    "assigned_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_program_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_curriculum_assignments" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "curriculum_id" UUID NOT NULL,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE,
    "reason" VARCHAR(500),
    "assigned_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_curriculum_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_status_history" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "academic_term_id" UUID,
    "from_status" "student_status",
    "to_status" "student_status" NOT NULL,
    "reason" VARCHAR(500),
    "changed_by_user_id" UUID,
    "changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faculty_department_assignments" (
    "id" UUID NOT NULL,
    "faculty_id" UUID NOT NULL,
    "department_id" UUID NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE,
    "assigned_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "faculty_department_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faculty_specializations" (
    "id" UUID NOT NULL,
    "faculty_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "details" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "faculty_specializations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faculty_employment" (
    "id" UUID NOT NULL,
    "faculty_id" UUID NOT NULL,
    "employment_type" "faculty_employment_type" NOT NULL,
    "position_title" VARCHAR(150) NOT NULL,
    "academic_rank" VARCHAR(100),
    "status" "faculty_status" NOT NULL DEFAULT 'ACTIVE',
    "starts_on" DATE NOT NULL,
    "ends_on" DATE,
    "recorded_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "faculty_employment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "academic_term_id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "curriculum_id" UUID NOT NULL,
    "year_level" SMALLINT NOT NULL,
    "status" "enrollment_status" NOT NULL DEFAULT 'DRAFT',
    "enrolled_at" TIMESTAMPTZ(3),
    "processed_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollment_status_history" (
    "id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "from_status" "enrollment_status",
    "to_status" "enrollment_status" NOT NULL,
    "reason" VARCHAR(500),
    "changed_by_user_id" UUID,
    "changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollment_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" UUID NOT NULL,
    "department_id" UUID,
    "code" VARCHAR(50) NOT NULL,
    "building" VARCHAR(100),
    "name" VARCHAR(150) NOT NULL,
    "room_type" VARCHAR(80),
    "capacity" SMALLINT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_sections" (
    "id" UUID NOT NULL,
    "academic_term_id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "curriculum_id" UUID,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(150),
    "year_level" SMALLINT NOT NULL,
    "capacity" SMALLINT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_offerings" (
    "id" UUID NOT NULL,
    "academic_term_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "class_section_id" UUID,
    "offering_code" VARCHAR(50) NOT NULL,
    "credit_units" DECIMAL(4,2) NOT NULL,
    "lecture_hours" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "laboratory_hours" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "capacity" SMALLINT,
    "status" "course_offering_status" NOT NULL DEFAULT 'PLANNED',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_offerings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faculty_course_assignments" (
    "id" UUID NOT NULL,
    "course_offering_id" UUID NOT NULL,
    "faculty_id" UUID NOT NULL,
    "role" "faculty_assignment_role" NOT NULL DEFAULT 'primary_instructor',
    "starts_on" DATE,
    "ends_on" DATE,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "faculty_course_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_schedules" (
    "id" UUID NOT NULL,
    "course_offering_id" UUID NOT NULL,
    "room_id" UUID,
    "weekday" "weekday" NOT NULL,
    "starts_at" TIME(0) NOT NULL,
    "ends_at" TIME(0) NOT NULL,
    "effective_from" DATE,
    "effective_to" DATE,
    "recurrence_note" VARCHAR(255),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollment_items" (
    "id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "course_offering_id" UUID NOT NULL,
    "status" "enrollment_item_status" NOT NULL DEFAULT 'PENDING',
    "registered_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dropped_at" TIMESTAMPTZ(3),
    "remarks" VARCHAR(500),
    "override_reason" VARCHAR(500),
    "override_approved_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grading_periods" (
    "id" UUID NOT NULL,
    "academic_term_id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" "grading_period_type" NOT NULL,
    "sequence" SMALLINT NOT NULL,
    "weight_percent" DECIMAL(5,2),
    "starts_on" DATE,
    "ends_on" DATE,
    "is_final" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grading_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grades" (
    "id" UUID NOT NULL,
    "enrollment_item_id" UUID NOT NULL,
    "grading_period_id" UUID NOT NULL,
    "numeric_grade" DECIMAL(7,3),
    "letter_grade" VARCHAR(20),
    "is_passing" BOOLEAN,
    "remarks" VARCHAR(500),
    "status" "grade_status" NOT NULL DEFAULT 'DRAFT',
    "submitted_by_faculty_id" UUID,
    "submitted_at" TIMESTAMPTZ(3),
    "approved_by_user_id" UUID,
    "approved_at" TIMESTAMPTZ(3),
    "completion_due_at" DATE,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_history" (
    "id" UUID NOT NULL,
    "grade_id" UUID NOT NULL,
    "previous_numeric" DECIMAL(7,3),
    "previous_letter" VARCHAR(20),
    "previous_status" "grade_status",
    "new_numeric" DECIMAL(7,3),
    "new_letter" VARCHAR(20),
    "new_status" "grade_status" NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "changed_by_user_id" UUID,
    "changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grade_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clearance_cycles" (
    "id" UUID NOT NULL,
    "academic_term_id" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "opens_at" TIMESTAMPTZ(3),
    "closes_at" TIMESTAMPTZ(3),
    "status" "clearance_cycle_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clearance_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clearance_requirements" (
    "id" UUID NOT NULL,
    "cycle_id" UUID NOT NULL,
    "department_id" UUID,
    "code" VARCHAR(40) NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "office_type" "clearance_office_type" NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clearance_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_clearances" (
    "id" UUID NOT NULL,
    "cycle_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "status" "clearance_status" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_clearances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clearance_items" (
    "id" UUID NOT NULL,
    "student_clearance_id" UUID NOT NULL,
    "requirement_id" UUID NOT NULL,
    "status" "clearance_item_status" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "acted_by_user_id" UUID,
    "acted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clearance_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" UUID NOT NULL,
    "assessment_number" VARCHAR(50) NOT NULL,
    "student_id" UUID NOT NULL,
    "academic_term_id" UUID NOT NULL,
    "enrollment_id" UUID,
    "status" "assessment_status" NOT NULL DEFAULT 'DRAFT',
    "currency" CHAR(3) NOT NULL DEFAULT 'PHP',
    "assessed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalized_at" TIMESTAMPTZ(3),
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_items" (
    "id" UUID NOT NULL,
    "assessment_id" UUID NOT NULL,
    "student_request_id" UUID,
    "code" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "due_on" DATE,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "invoice_number" VARCHAR(50) NOT NULL,
    "assessment_id" UUID NOT NULL,
    "status" "invoice_status" NOT NULL DEFAULT 'DRAFT',
    "currency" CHAR(3) NOT NULL DEFAULT 'PHP',
    "total_amount" DECIMAL(12,2) NOT NULL,
    "issued_at" TIMESTAMPTZ(3),
    "due_on" DATE,
    "issued_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "receipt_number" VARCHAR(50) NOT NULL,
    "student_id" UUID NOT NULL,
    "external_reference" VARCHAR(100),
    "method" "payment_method" NOT NULL,
    "status" "payment_status" NOT NULL DEFAULT 'PENDING',
    "currency" CHAR(3) NOT NULL DEFAULT 'PHP',
    "amount" DECIMAL(12,2) NOT NULL,
    "received_at" TIMESTAMPTZ(3) NOT NULL,
    "posted_at" TIMESTAMPTZ(3),
    "recorded_by_user_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_allocations" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "allocated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_transactions" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "academic_term_id" UUID,
    "assessment_id" UUID,
    "invoice_id" UUID,
    "payment_id" UUID,
    "reversal_of_id" UUID,
    "reference_number" VARCHAR(64) NOT NULL,
    "entry_type" "financial_entry_type" NOT NULL,
    "direction" "financial_direction" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'PHP',
    "description" VARCHAR(255) NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "recorded_by_user_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_types" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "default_fee_amount" DECIMAL(12,2) DEFAULT 0,
    "service_days" SMALLINT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_requests" (
    "id" UUID NOT NULL,
    "request_number" VARCHAR(50) NOT NULL,
    "student_id" UUID NOT NULL,
    "request_type_id" UUID NOT NULL,
    "requester_user_id" UUID,
    "processor_user_id" UUID,
    "status" "student_request_status" NOT NULL DEFAULT 'SUBMITTED',
    "purpose" VARCHAR(500),
    "copies" SMALLINT NOT NULL DEFAULT 1,
    "submitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_request_status_history" (
    "id" UUID NOT NULL,
    "student_request_id" UUID NOT NULL,
    "from_status" "student_request_status",
    "to_status" "student_request_status" NOT NULL,
    "remarks" TEXT,
    "changed_by_user_id" UUID,
    "changed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_request_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "academic_years_code_key" ON "academic_years"("code");

-- CreateIndex
CREATE INDEX "academic_years_status_starts_on_idx" ON "academic_years"("status", "starts_on");

-- CreateIndex
CREATE UNIQUE INDEX "academic_terms_code_key" ON "academic_terms"("code");

-- CreateIndex
CREATE INDEX "academic_terms_status_starts_on_idx" ON "academic_terms"("status", "starts_on");

-- CreateIndex
CREATE UNIQUE INDEX "academic_terms_academic_year_id_term_number_key" ON "academic_terms"("academic_year_id", "term_number");

-- CreateIndex
CREATE INDEX "program_history_program_id_effective_from_effective_to_idx" ON "program_history"("program_id", "effective_from", "effective_to");

-- CreateIndex
CREATE INDEX "program_history_department_id_idx" ON "program_history"("department_id");

-- CreateIndex
CREATE INDEX "program_history_changed_by_user_id_idx" ON "program_history"("changed_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "program_history_program_id_version_key" ON "program_history"("program_id", "version");

-- CreateIndex
CREATE INDEX "program_head_assignments_program_id_starts_on_ends_on_idx" ON "program_head_assignments"("program_id", "starts_on", "ends_on");

-- CreateIndex
CREATE INDEX "program_head_assignments_faculty_id_starts_on_ends_on_idx" ON "program_head_assignments"("faculty_id", "starts_on", "ends_on");

-- CreateIndex
CREATE INDEX "program_head_assignments_assigned_by_user_id_idx" ON "program_head_assignments"("assigned_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "admission_applications_application_number_normalized_key" ON "admission_applications"("application_number_normalized");

-- CreateIndex
CREATE UNIQUE INDEX "admission_applications_converted_student_id_key" ON "admission_applications"("converted_student_id");

-- CreateIndex
CREATE INDEX "admission_applications_applicant_user_id_status_idx" ON "admission_applications"("applicant_user_id", "status");

-- CreateIndex
CREATE INDEX "admission_applications_intended_program_id_academic_term_id_idx" ON "admission_applications"("intended_program_id", "academic_term_id", "status");

-- CreateIndex
CREATE INDEX "admission_applications_decision_by_user_id_idx" ON "admission_applications"("decision_by_user_id");

-- CreateIndex
CREATE INDEX "admission_application_status_history_application_id_changed_idx" ON "admission_application_status_history"("application_id", "changed_at");

-- CreateIndex
CREATE INDEX "admission_application_status_history_changed_by_user_id_idx" ON "admission_application_status_history"("changed_by_user_id");

-- CreateIndex
CREATE INDEX "student_program_history_student_id_starts_on_ends_on_idx" ON "student_program_history"("student_id", "starts_on", "ends_on");

-- CreateIndex
CREATE INDEX "student_program_history_program_id_starts_on_idx" ON "student_program_history"("program_id", "starts_on");

-- CreateIndex
CREATE INDEX "student_program_history_academic_term_id_idx" ON "student_program_history"("academic_term_id");

-- CreateIndex
CREATE INDEX "student_program_history_assigned_by_user_id_idx" ON "student_program_history"("assigned_by_user_id");

-- CreateIndex
CREATE INDEX "student_curriculum_assignments_student_id_starts_on_ends_on_idx" ON "student_curriculum_assignments"("student_id", "starts_on", "ends_on");

-- CreateIndex
CREATE INDEX "student_curriculum_assignments_curriculum_id_starts_on_idx" ON "student_curriculum_assignments"("curriculum_id", "starts_on");

-- CreateIndex
CREATE INDEX "student_curriculum_assignments_assigned_by_user_id_idx" ON "student_curriculum_assignments"("assigned_by_user_id");

-- CreateIndex
CREATE INDEX "student_status_history_student_id_changed_at_idx" ON "student_status_history"("student_id", "changed_at");

-- CreateIndex
CREATE INDEX "student_status_history_academic_term_id_to_status_idx" ON "student_status_history"("academic_term_id", "to_status");

-- CreateIndex
CREATE INDEX "student_status_history_changed_by_user_id_idx" ON "student_status_history"("changed_by_user_id");

-- CreateIndex
CREATE INDEX "faculty_department_assignments_faculty_id_starts_on_ends_on_idx" ON "faculty_department_assignments"("faculty_id", "starts_on", "ends_on");

-- CreateIndex
CREATE INDEX "faculty_department_assignments_department_id_starts_on_ends_idx" ON "faculty_department_assignments"("department_id", "starts_on", "ends_on");

-- CreateIndex
CREATE INDEX "faculty_department_assignments_assigned_by_user_id_idx" ON "faculty_department_assignments"("assigned_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "faculty_specializations_faculty_id_name_key" ON "faculty_specializations"("faculty_id", "name");

-- CreateIndex
CREATE INDEX "faculty_employment_faculty_id_starts_on_ends_on_idx" ON "faculty_employment"("faculty_id", "starts_on", "ends_on");

-- CreateIndex
CREATE INDEX "faculty_employment_status_starts_on_idx" ON "faculty_employment"("status", "starts_on");

-- CreateIndex
CREATE INDEX "faculty_employment_recorded_by_user_id_idx" ON "faculty_employment"("recorded_by_user_id");

-- CreateIndex
CREATE INDEX "enrollments_academic_term_id_program_id_status_idx" ON "enrollments"("academic_term_id", "program_id", "status");

-- CreateIndex
CREATE INDEX "enrollments_curriculum_id_idx" ON "enrollments"("curriculum_id");

-- CreateIndex
CREATE INDEX "enrollments_processed_by_user_id_idx" ON "enrollments"("processed_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_student_id_academic_term_id_key" ON "enrollments"("student_id", "academic_term_id");

-- CreateIndex
CREATE INDEX "enrollment_status_history_enrollment_id_changed_at_idx" ON "enrollment_status_history"("enrollment_id", "changed_at");

-- CreateIndex
CREATE INDEX "enrollment_status_history_changed_by_user_id_idx" ON "enrollment_status_history"("changed_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_code_key" ON "rooms"("code");

-- CreateIndex
CREATE INDEX "rooms_department_id_is_active_idx" ON "rooms"("department_id", "is_active");

-- CreateIndex
CREATE INDEX "class_sections_program_id_year_level_is_active_idx" ON "class_sections"("program_id", "year_level", "is_active");

-- CreateIndex
CREATE INDEX "class_sections_curriculum_id_idx" ON "class_sections"("curriculum_id");

-- CreateIndex
CREATE UNIQUE INDEX "class_sections_academic_term_id_program_id_code_key" ON "class_sections"("academic_term_id", "program_id", "code");

-- CreateIndex
CREATE INDEX "course_offerings_subject_id_academic_term_id_status_idx" ON "course_offerings"("subject_id", "academic_term_id", "status");

-- CreateIndex
CREATE INDEX "course_offerings_class_section_id_idx" ON "course_offerings"("class_section_id");

-- CreateIndex
CREATE UNIQUE INDEX "course_offerings_academic_term_id_offering_code_key" ON "course_offerings"("academic_term_id", "offering_code");

-- CreateIndex
CREATE INDEX "faculty_course_assignments_faculty_id_starts_on_ends_on_idx" ON "faculty_course_assignments"("faculty_id", "starts_on", "ends_on");

-- CreateIndex
CREATE UNIQUE INDEX "faculty_course_assignments_course_offering_id_faculty_id_ro_key" ON "faculty_course_assignments"("course_offering_id", "faculty_id", "role");

-- CreateIndex
CREATE INDEX "class_schedules_room_id_weekday_starts_at_ends_at_idx" ON "class_schedules"("room_id", "weekday", "starts_at", "ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "class_schedules_course_offering_id_weekday_starts_at_ends_a_key" ON "class_schedules"("course_offering_id", "weekday", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "enrollment_items_course_offering_id_status_idx" ON "enrollment_items"("course_offering_id", "status");

-- CreateIndex
CREATE INDEX "enrollment_items_override_approved_by_user_id_idx" ON "enrollment_items"("override_approved_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "enrollment_items_enrollment_id_course_offering_id_key" ON "enrollment_items"("enrollment_id", "course_offering_id");

-- CreateIndex
CREATE INDEX "grading_periods_academic_term_id_type_idx" ON "grading_periods"("academic_term_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "grading_periods_academic_term_id_code_key" ON "grading_periods"("academic_term_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "grading_periods_academic_term_id_sequence_key" ON "grading_periods"("academic_term_id", "sequence");

-- CreateIndex
CREATE INDEX "grades_grading_period_id_status_idx" ON "grades"("grading_period_id", "status");

-- CreateIndex
CREATE INDEX "grades_submitted_by_faculty_id_idx" ON "grades"("submitted_by_faculty_id");

-- CreateIndex
CREATE INDEX "grades_approved_by_user_id_idx" ON "grades"("approved_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "grades_enrollment_item_id_grading_period_id_key" ON "grades"("enrollment_item_id", "grading_period_id");

-- CreateIndex
CREATE INDEX "grade_history_grade_id_changed_at_idx" ON "grade_history"("grade_id", "changed_at");

-- CreateIndex
CREATE INDEX "grade_history_changed_by_user_id_idx" ON "grade_history"("changed_by_user_id");

-- CreateIndex
CREATE INDEX "clearance_cycles_status_opens_at_idx" ON "clearance_cycles"("status", "opens_at");

-- CreateIndex
CREATE UNIQUE INDEX "clearance_cycles_academic_term_id_code_key" ON "clearance_cycles"("academic_term_id", "code");

-- CreateIndex
CREATE INDEX "clearance_requirements_department_id_office_type_idx" ON "clearance_requirements"("department_id", "office_type");

-- CreateIndex
CREATE UNIQUE INDEX "clearance_requirements_cycle_id_code_key" ON "clearance_requirements"("cycle_id", "code");

-- CreateIndex
CREATE INDEX "student_clearances_student_id_status_idx" ON "student_clearances"("student_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "student_clearances_cycle_id_student_id_key" ON "student_clearances"("cycle_id", "student_id");

-- CreateIndex
CREATE INDEX "clearance_items_requirement_id_status_idx" ON "clearance_items"("requirement_id", "status");

-- CreateIndex
CREATE INDEX "clearance_items_acted_by_user_id_idx" ON "clearance_items"("acted_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "clearance_items_student_clearance_id_requirement_id_key" ON "clearance_items"("student_clearance_id", "requirement_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessments_assessment_number_key" ON "assessments"("assessment_number");

-- CreateIndex
CREATE INDEX "assessments_student_id_academic_term_id_status_idx" ON "assessments"("student_id", "academic_term_id", "status");

-- CreateIndex
CREATE INDEX "assessments_enrollment_id_idx" ON "assessments"("enrollment_id");

-- CreateIndex
CREATE INDEX "assessments_created_by_user_id_idx" ON "assessments"("created_by_user_id");

-- CreateIndex
CREATE INDEX "assessment_items_student_request_id_idx" ON "assessment_items"("student_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_items_assessment_id_code_key" ON "assessment_items"("assessment_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_assessment_id_key" ON "invoices"("assessment_id");

-- CreateIndex
CREATE INDEX "invoices_status_due_on_idx" ON "invoices"("status", "due_on");

-- CreateIndex
CREATE INDEX "invoices_issued_by_user_id_idx" ON "invoices"("issued_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_receipt_number_key" ON "payments"("receipt_number");

-- CreateIndex
CREATE INDEX "payments_student_id_received_at_idx" ON "payments"("student_id", "received_at");

-- CreateIndex
CREATE INDEX "payments_status_received_at_idx" ON "payments"("status", "received_at");

-- CreateIndex
CREATE INDEX "payments_external_reference_idx" ON "payments"("external_reference");

-- CreateIndex
CREATE INDEX "payments_recorded_by_user_id_idx" ON "payments"("recorded_by_user_id");

-- CreateIndex
CREATE INDEX "payment_allocations_invoice_id_allocated_at_idx" ON "payment_allocations"("invoice_id", "allocated_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_allocations_payment_id_invoice_id_key" ON "payment_allocations"("payment_id", "invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "financial_transactions_reversal_of_id_key" ON "financial_transactions"("reversal_of_id");

-- CreateIndex
CREATE UNIQUE INDEX "financial_transactions_reference_number_key" ON "financial_transactions"("reference_number");

-- CreateIndex
CREATE INDEX "financial_transactions_student_id_occurred_at_idx" ON "financial_transactions"("student_id", "occurred_at");

-- CreateIndex
CREATE INDEX "financial_transactions_academic_term_id_occurred_at_idx" ON "financial_transactions"("academic_term_id", "occurred_at");

-- CreateIndex
CREATE INDEX "financial_transactions_assessment_id_idx" ON "financial_transactions"("assessment_id");

-- CreateIndex
CREATE INDEX "financial_transactions_invoice_id_idx" ON "financial_transactions"("invoice_id");

-- CreateIndex
CREATE INDEX "financial_transactions_payment_id_idx" ON "financial_transactions"("payment_id");

-- CreateIndex
CREATE INDEX "financial_transactions_recorded_by_user_id_idx" ON "financial_transactions"("recorded_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "request_types_code_key" ON "request_types"("code");

-- CreateIndex
CREATE INDEX "request_types_is_active_name_idx" ON "request_types"("is_active", "name");

-- CreateIndex
CREATE UNIQUE INDEX "student_requests_request_number_key" ON "student_requests"("request_number");

-- CreateIndex
CREATE INDEX "student_requests_student_id_submitted_at_idx" ON "student_requests"("student_id", "submitted_at");

-- CreateIndex
CREATE INDEX "student_requests_request_type_id_status_submitted_at_idx" ON "student_requests"("request_type_id", "status", "submitted_at");

-- CreateIndex
CREATE INDEX "student_requests_processor_user_id_status_idx" ON "student_requests"("processor_user_id", "status");

-- CreateIndex
CREATE INDEX "student_requests_requester_user_id_idx" ON "student_requests"("requester_user_id");

-- CreateIndex
CREATE INDEX "student_request_status_history_student_request_id_changed_a_idx" ON "student_request_status_history"("student_request_id", "changed_at");

-- CreateIndex
CREATE INDEX "student_request_status_history_changed_by_user_id_idx" ON "student_request_status_history"("changed_by_user_id");

-- AddForeignKey
ALTER TABLE "academic_terms" ADD CONSTRAINT "academic_terms_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_history" ADD CONSTRAINT "program_history_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_history" ADD CONSTRAINT "program_history_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_history" ADD CONSTRAINT "program_history_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_head_assignments" ADD CONSTRAINT "program_head_assignments_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_head_assignments" ADD CONSTRAINT "program_head_assignments_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "faculty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_head_assignments" ADD CONSTRAINT "program_head_assignments_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_applications" ADD CONSTRAINT "admission_applications_applicant_user_id_fkey" FOREIGN KEY ("applicant_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_applications" ADD CONSTRAINT "admission_applications_intended_program_id_fkey" FOREIGN KEY ("intended_program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_applications" ADD CONSTRAINT "admission_applications_academic_term_id_fkey" FOREIGN KEY ("academic_term_id") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_applications" ADD CONSTRAINT "admission_applications_converted_student_id_fkey" FOREIGN KEY ("converted_student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_applications" ADD CONSTRAINT "admission_applications_decision_by_user_id_fkey" FOREIGN KEY ("decision_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_application_status_history" ADD CONSTRAINT "admission_application_status_history_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "admission_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_application_status_history" ADD CONSTRAINT "admission_application_status_history_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_program_history" ADD CONSTRAINT "student_program_history_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_program_history" ADD CONSTRAINT "student_program_history_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_program_history" ADD CONSTRAINT "student_program_history_academic_term_id_fkey" FOREIGN KEY ("academic_term_id") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_program_history" ADD CONSTRAINT "student_program_history_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_curriculum_assignments" ADD CONSTRAINT "student_curriculum_assignments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_curriculum_assignments" ADD CONSTRAINT "student_curriculum_assignments_curriculum_id_fkey" FOREIGN KEY ("curriculum_id") REFERENCES "curricula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_curriculum_assignments" ADD CONSTRAINT "student_curriculum_assignments_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_status_history" ADD CONSTRAINT "student_status_history_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_status_history" ADD CONSTRAINT "student_status_history_academic_term_id_fkey" FOREIGN KEY ("academic_term_id") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_status_history" ADD CONSTRAINT "student_status_history_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty_department_assignments" ADD CONSTRAINT "faculty_department_assignments_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "faculty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty_department_assignments" ADD CONSTRAINT "faculty_department_assignments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty_department_assignments" ADD CONSTRAINT "faculty_department_assignments_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty_specializations" ADD CONSTRAINT "faculty_specializations_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "faculty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty_employment" ADD CONSTRAINT "faculty_employment_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "faculty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty_employment" ADD CONSTRAINT "faculty_employment_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_academic_term_id_fkey" FOREIGN KEY ("academic_term_id") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_curriculum_id_program_id_fkey" FOREIGN KEY ("curriculum_id", "program_id") REFERENCES "curricula"("id", "program_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_processed_by_user_id_fkey" FOREIGN KEY ("processed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment_status_history" ADD CONSTRAINT "enrollment_status_history_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment_status_history" ADD CONSTRAINT "enrollment_status_history_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sections" ADD CONSTRAINT "class_sections_academic_term_id_fkey" FOREIGN KEY ("academic_term_id") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sections" ADD CONSTRAINT "class_sections_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sections" ADD CONSTRAINT "class_sections_curriculum_id_program_id_fkey" FOREIGN KEY ("curriculum_id", "program_id") REFERENCES "curricula"("id", "program_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_academic_term_id_fkey" FOREIGN KEY ("academic_term_id") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_class_section_id_fkey" FOREIGN KEY ("class_section_id") REFERENCES "class_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty_course_assignments" ADD CONSTRAINT "faculty_course_assignments_course_offering_id_fkey" FOREIGN KEY ("course_offering_id") REFERENCES "course_offerings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty_course_assignments" ADD CONSTRAINT "faculty_course_assignments_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "faculty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_schedules" ADD CONSTRAINT "class_schedules_course_offering_id_fkey" FOREIGN KEY ("course_offering_id") REFERENCES "course_offerings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_schedules" ADD CONSTRAINT "class_schedules_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment_items" ADD CONSTRAINT "enrollment_items_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment_items" ADD CONSTRAINT "enrollment_items_course_offering_id_fkey" FOREIGN KEY ("course_offering_id") REFERENCES "course_offerings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment_items" ADD CONSTRAINT "enrollment_items_override_approved_by_user_id_fkey" FOREIGN KEY ("override_approved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grading_periods" ADD CONSTRAINT "grading_periods_academic_term_id_fkey" FOREIGN KEY ("academic_term_id") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_enrollment_item_id_fkey" FOREIGN KEY ("enrollment_item_id") REFERENCES "enrollment_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_grading_period_id_fkey" FOREIGN KEY ("grading_period_id") REFERENCES "grading_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_submitted_by_faculty_id_fkey" FOREIGN KEY ("submitted_by_faculty_id") REFERENCES "faculty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_history" ADD CONSTRAINT "grade_history_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_history" ADD CONSTRAINT "grade_history_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clearance_cycles" ADD CONSTRAINT "clearance_cycles_academic_term_id_fkey" FOREIGN KEY ("academic_term_id") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clearance_requirements" ADD CONSTRAINT "clearance_requirements_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "clearance_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clearance_requirements" ADD CONSTRAINT "clearance_requirements_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_clearances" ADD CONSTRAINT "student_clearances_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "clearance_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_clearances" ADD CONSTRAINT "student_clearances_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clearance_items" ADD CONSTRAINT "clearance_items_student_clearance_id_fkey" FOREIGN KEY ("student_clearance_id") REFERENCES "student_clearances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clearance_items" ADD CONSTRAINT "clearance_items_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "clearance_requirements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clearance_items" ADD CONSTRAINT "clearance_items_acted_by_user_id_fkey" FOREIGN KEY ("acted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_academic_term_id_fkey" FOREIGN KEY ("academic_term_id") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_items" ADD CONSTRAINT "assessment_items_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_items" ADD CONSTRAINT "assessment_items_student_request_id_fkey" FOREIGN KEY ("student_request_id") REFERENCES "student_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_issued_by_user_id_fkey" FOREIGN KEY ("issued_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_academic_term_id_fkey" FOREIGN KEY ("academic_term_id") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_reversal_of_id_fkey" FOREIGN KEY ("reversal_of_id") REFERENCES "financial_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_requests" ADD CONSTRAINT "student_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_requests" ADD CONSTRAINT "student_requests_request_type_id_fkey" FOREIGN KEY ("request_type_id") REFERENCES "request_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_requests" ADD CONSTRAINT "student_requests_requester_user_id_fkey" FOREIGN KEY ("requester_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_requests" ADD CONSTRAINT "student_requests_processor_user_id_fkey" FOREIGN KEY ("processor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_request_status_history" ADD CONSTRAINT "student_request_status_history_student_request_id_fkey" FOREIGN KEY ("student_request_id") REFERENCES "student_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_request_status_history" ADD CONSTRAINT "student_request_status_history_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
