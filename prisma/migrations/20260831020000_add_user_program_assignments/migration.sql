CREATE TABLE "user_program_assignments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "assigned_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_program_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_program_assignments_user_id_key" ON "user_program_assignments"("user_id");
CREATE INDEX "user_program_assignments_program_id_idx" ON "user_program_assignments"("program_id");
CREATE INDEX "user_program_assignments_assigned_by_user_id_idx" ON "user_program_assignments"("assigned_by_user_id");
ALTER TABLE "user_program_assignments" ADD CONSTRAINT "user_program_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_program_assignments" ADD CONSTRAINT "user_program_assignments_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_program_assignments" ADD CONSTRAINT "user_program_assignments_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;