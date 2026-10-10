CREATE TABLE "user_department_assignments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "department_id" UUID NOT NULL,
    "assigned_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_department_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_department_assignments_user_id_key" ON "user_department_assignments"("user_id");
CREATE INDEX "user_department_assignments_department_id_idx" ON "user_department_assignments"("department_id");
CREATE INDEX "user_department_assignments_assigned_by_user_id_idx" ON "user_department_assignments"("assigned_by_user_id");
ALTER TABLE "user_department_assignments" ADD CONSTRAINT "user_department_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_department_assignments" ADD CONSTRAINT "user_department_assignments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_department_assignments" ADD CONSTRAINT "user_department_assignments_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
