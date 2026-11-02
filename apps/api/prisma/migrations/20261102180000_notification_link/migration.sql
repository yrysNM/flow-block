-- notifications already has title, type, body, and read_at.
-- link_path is the in-app path (/focus or /tasks). No email, push, or scheduler columns.

ALTER TABLE "notifications" ADD COLUMN "link_path" TEXT;
