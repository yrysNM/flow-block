-- Recurrence lives on the task. NONE is the default. A successor points at the completed row.
-- The unique recurred_from_id allows one next task per completed task. Reads do not insert future rows.

CREATE TYPE "TaskRecurrence" AS ENUM ('NONE', 'DAILY', 'WEEKLY');

ALTER TABLE "tasks" ADD COLUMN "recurrence" "TaskRecurrence" NOT NULL DEFAULT 'NONE';
ALTER TABLE "tasks" ADD COLUMN "recurred_from_id" UUID;

CREATE UNIQUE INDEX "tasks_recurred_from_id_key" ON "tasks"("recurred_from_id");

ALTER TABLE "tasks" ADD CONSTRAINT "tasks_recurred_from_id_fkey" FOREIGN KEY ("recurred_from_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
