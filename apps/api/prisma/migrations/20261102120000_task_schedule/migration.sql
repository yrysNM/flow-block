-- One planned block per task. Null start and end means the task is unscheduled.
ALTER TABLE "tasks" ADD COLUMN "scheduled_start" TIMESTAMP(3),
ADD COLUMN "scheduled_end" TIMESTAMP(3);

CREATE INDEX "tasks_user_id_scheduled_start_idx" ON "tasks"("user_id", "scheduled_start");
