-- Account settings: default focus duration and a stored language code.
-- language is stored only. The web UI stays English.

ALTER TABLE "user_preferences" ADD COLUMN "focus_default_seconds" INTEGER NOT NULL DEFAULT 1500;
ALTER TABLE "user_preferences" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'en';
