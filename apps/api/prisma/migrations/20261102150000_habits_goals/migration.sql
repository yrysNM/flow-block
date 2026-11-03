-- Habit target counts, per-day entry counts, milestone order, and goal-task links.
-- Goal progress is derived on read and is not stored.

ALTER TABLE "habits" ADD COLUMN "target_count" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "habit_entries" ADD COLUMN "count" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "milestones" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "goal_tasks" (
    "goal_id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_tasks_pkey" PRIMARY KEY ("goal_id","task_id")
);

CREATE INDEX "goal_tasks_user_id_idx" ON "goal_tasks"("user_id");
CREATE INDEX "goal_tasks_task_id_idx" ON "goal_tasks"("task_id");

ALTER TABLE "goal_tasks" ADD CONSTRAINT "goal_tasks_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "goal_tasks" ADD CONSTRAINT "goal_tasks_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "goal_tasks" ADD CONSTRAINT "goal_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
