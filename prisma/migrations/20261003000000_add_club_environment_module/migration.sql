-- CreateEnum
CREATE TYPE "club_category" AS ENUM ('ACADEMIC', 'NON_ACADEMIC');

-- CreateEnum
CREATE TYPE "club_status" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "club_document_category" AS ENUM ('RESOLUTION', 'MEMORANDUM', 'CONSTITUTION_BYLAWS', 'FINANCIAL_REPORT', 'ACTIVITY_PROPOSAL', 'OTHER');

-- CreateEnum
CREATE TYPE "club_clearance_status" AS ENUM ('PENDING', 'CLEARED', 'NOT_CLEARED');

-- CreateTable
CREATE TABLE "clubs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "category" "club_category" NOT NULL DEFAULT 'ACADEMIC',
    "adviser" VARCHAR(150) NOT NULL,
    "college_id" UUID,
    "department_id" UUID,
    "user_id" UUID,
    "effectivity_start_date" TIMESTAMPTZ(3) NOT NULL,
    "effectivity_end_date" TIMESTAMPTZ(3) NOT NULL,
    "status" "club_status" NOT NULL DEFAULT 'ACTIVE',
    "created_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "club_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_officers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "club_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "position" VARCHAR(100) NOT NULL,
    "can_clear_clearance" BOOLEAN NOT NULL DEFAULT false,
    "assigned_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_officers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_announcements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "club_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "posted_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "club_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "category" "club_document_category" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "file_url" VARCHAR(500),
    "file_name" VARCHAR(255),
    "uploaded_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_clearances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "club_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "status" "club_clearance_status" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "cleared_by_user_id" UUID,
    "cleared_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_clearances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "club_clearance_audits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "club_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "action" "club_clearance_status" NOT NULL,
    "remarks" TEXT,
    "performed_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "club_clearance_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clubs_code_key" ON "clubs"("code");
CREATE UNIQUE INDEX "clubs_name_key" ON "clubs"("name");
CREATE UNIQUE INDEX "clubs_user_id_key" ON "clubs"("user_id");
CREATE INDEX "clubs_status_effectivity_start_date_effectivity_end_date_idx" ON "clubs"("status", "effectivity_start_date", "effectivity_end_date");
CREATE INDEX "clubs_college_id_idx" ON "clubs"("college_id");
CREATE INDEX "clubs_department_id_idx" ON "clubs"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "club_members_club_id_student_id_key" ON "club_members"("club_id", "student_id");
CREATE INDEX "club_members_student_id_status_idx" ON "club_members"("student_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "club_officers_club_id_student_id_key" ON "club_officers"("club_id", "student_id");
CREATE INDEX "club_officers_student_id_idx" ON "club_officers"("student_id");

-- CreateIndex
CREATE INDEX "club_announcements_club_id_created_at_idx" ON "club_announcements"("club_id", "created_at");

-- CreateIndex
CREATE INDEX "club_documents_club_id_category_idx" ON "club_documents"("club_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "club_clearances_club_id_student_id_key" ON "club_clearances"("club_id", "student_id");
CREATE INDEX "club_clearances_student_id_status_idx" ON "club_clearances"("student_id", "status");

-- CreateIndex
CREATE INDEX "club_clearance_audits_club_id_student_id_created_at_idx" ON "club_clearance_audits"("club_id", "student_id", "created_at");

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_college_id_fkey" FOREIGN KEY ("college_id") REFERENCES "colleges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_officers" ADD CONSTRAINT "club_officers_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "club_officers" ADD CONSTRAINT "club_officers_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "club_officers" ADD CONSTRAINT "club_officers_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_announcements" ADD CONSTRAINT "club_announcements_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "club_announcements" ADD CONSTRAINT "club_announcements_posted_by_user_id_fkey" FOREIGN KEY ("posted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_documents" ADD CONSTRAINT "club_documents_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "club_documents" ADD CONSTRAINT "club_documents_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_clearances" ADD CONSTRAINT "club_clearances_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "club_clearances" ADD CONSTRAINT "club_clearances_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "club_clearances" ADD CONSTRAINT "club_clearances_cleared_by_user_id_fkey" FOREIGN KEY ("cleared_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "club_clearance_audits" ADD CONSTRAINT "club_clearance_audits_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "club_clearance_audits" ADD CONSTRAINT "club_clearance_audits_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "club_clearance_audits" ADD CONSTRAINT "club_clearance_audits_performed_by_user_id_fkey" FOREIGN KEY ("performed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
