-- Preparation only. Append this SQL to the reviewed initial Prisma migration
-- after Prisma has emitted the CREATE TABLE statements. Do not execute this
-- file independently against an uninitialized database.

-- A user may have several roles, but no more than one may be primary.
CREATE UNIQUE INDEX "one_primary_role_per_user"
  ON "user_roles" ("user_id")
  WHERE "is_primary" = TRUE;

-- Audit records are append-only. Statement-level triggers reject mutation even
-- when an UPDATE or DELETE would otherwise affect zero rows.
CREATE OR REPLACE FUNCTION "reject_audit_log_mutation"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit logs are immutable';
END;
$$;

CREATE TRIGGER "audit_logs_immutable_update_delete"
BEFORE UPDATE OR DELETE ON "audit_logs"
FOR EACH STATEMENT
EXECUTE FUNCTION "reject_audit_log_mutation"();

CREATE TRIGGER "audit_logs_immutable_truncate"
BEFORE TRUNCATE ON "audit_logs"
FOR EACH STATEMENT
EXECUTE FUNCTION "reject_audit_log_mutation"();
