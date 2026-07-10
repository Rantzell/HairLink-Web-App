-- Audit log table for admin-visible activity across all user roles.
-- Apply via Supabase SQL editor (or `prisma db push` with proper env).

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id"          SERIAL PRIMARY KEY,
  "actor_id"    UUID,
  "actor_name"  TEXT,
  "actor_role"  TEXT,
  "action"      TEXT NOT NULL,
  "target_type" TEXT,
  "target_id"   TEXT,
  "description" TEXT,
  "metadata"    JSONB,
  "ip_address"  TEXT,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "audit_logs_actor_id_idx"   ON "audit_logs"("actor_id");
CREATE INDEX IF NOT EXISTS "audit_logs_actor_role_idx" ON "audit_logs"("actor_role");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx"     ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("created_at");
