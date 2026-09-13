-- CreateEnum
CREATE TYPE "subject_requirement_type" AS ENUM ('PREREQUISITE', 'COREQUISITE');

-- CreateTable
CREATE TABLE "subject_requirements" (
    "id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "required_subject_id" UUID NOT NULL,
    "type" "subject_requirement_type" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subject_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subject_requirements_required_subject_id_idx"
ON "subject_requirements"("required_subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "subject_requirements_subject_id_required_subject_id_type_key"
ON "subject_requirements"("subject_id", "required_subject_id", "type");

-- AddForeignKey
ALTER TABLE "subject_requirements"
ADD CONSTRAINT "subject_requirements_subject_id_fkey"
FOREIGN KEY ("subject_id") REFERENCES "subjects"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_requirements"
ADD CONSTRAINT "subject_requirements_required_subject_id_fkey"
FOREIGN KEY ("required_subject_id") REFERENCES "subjects"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
