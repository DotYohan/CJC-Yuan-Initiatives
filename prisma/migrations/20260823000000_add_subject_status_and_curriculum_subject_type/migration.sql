-- AddEnum
CREATE TYPE "subject_status" AS ENUM ('ACTIVE', 'INACTIVE', 'RETIRED');

-- AddEnum
CREATE TYPE "curriculum_subject_type" AS ENUM ('REQUIRED', 'ELECTIVE');

-- AlterTable
ALTER TABLE "subjects"
ADD COLUMN "status" "subject_status" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "curriculum_subjects"
ADD COLUMN "type" "curriculum_subject_type" NOT NULL DEFAULT 'REQUIRED';
