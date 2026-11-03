-- Allowlist mode, optional local schedule window, and idempotent usage events.
ALTER TYPE "WebsiteRuleMode" ADD VALUE 'ALLOW';

ALTER TABLE "website_rules" ADD COLUMN "schedule_start_minute" INTEGER;
ALTER TABLE "website_rules" ADD COLUMN "schedule_end_minute" INTEGER;

CREATE TABLE "website_usage_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "client_event_id" TEXT NOT NULL,
    "website_rule_id" UUID,
    "domain" TEXT NOT NULL,
    "seconds" INTEGER NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "website_usage_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "website_usage_events_user_id_client_event_id_key" ON "website_usage_events"("user_id", "client_event_id");
CREATE INDEX "website_usage_events_user_id_idx" ON "website_usage_events"("user_id");

ALTER TABLE "website_usage_events" ADD CONSTRAINT "website_usage_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "website_usage_events" ADD CONSTRAINT "website_usage_events_website_rule_id_fkey" FOREIGN KEY ("website_rule_id") REFERENCES "website_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
