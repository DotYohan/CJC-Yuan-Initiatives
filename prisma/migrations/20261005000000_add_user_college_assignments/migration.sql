CREATE TABLE "user_college_assignments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "college_id" UUID NOT NULL,
    "assigned_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_college_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_college_assignments_user_id_key" ON "user_college_assignments"("user_id");
CREATE INDEX "user_college_assignments_college_id_idx" ON "user_college_assignments"("college_id");
CREATE INDEX "user_college_assignments_assigned_by_user_id_idx" ON "user_college_assignments"("assigned_by_user_id");
ALTER TABLE "user_college_assignments" ADD CONSTRAINT "user_college_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_college_assignments" ADD CONSTRAINT "user_college_assignments_college_id_fkey" FOREIGN KEY ("college_id") REFERENCES "colleges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_college_assignments" ADD CONSTRAINT "user_college_assignments_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
