-- Pause intervals for focus sessions. elapsed_seconds stays unused.
-- Elapsed time is computed from started_at, paused_at, paused_seconds, and ended_at.
ALTER TABLE "focus_sessions" ADD COLUMN "paused_at" TIMESTAMP(3);
ALTER TABLE "focus_sessions" ADD COLUMN "paused_seconds" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "focus_sessions_user_id_ended_at_idx" ON "focus_sessions"("user_id", "ended_at");

-- One active session per user. Prisma cannot model a partial unique index.
CREATE UNIQUE INDEX "focus_sessions_one_active_per_user" ON "focus_sessions"("user_id") WHERE "ended_at" IS NULL;
