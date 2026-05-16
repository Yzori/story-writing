-- Free-tier AI "taste" quota.
-- Tracks lifetime free editorial generations consumed by Free users
-- so we can offer 5 free editorial passes before requiring an upgrade.
-- Pro/Premium users ignore this column.

ALTER TABLE "users" ADD COLUMN "ai_free_generations_used" integer NOT NULL DEFAULT 0;

-- Default email notifications to ON so users actually get retention pings.
-- Existing rows are explicitly flipped on; new rows default true via the
-- updated NOT NULL default. Users can opt out from /settings.
ALTER TABLE "users" ALTER COLUMN "email_notifications" SET DEFAULT true;
UPDATE "users" SET "email_notifications" = true WHERE "email_notifications" = false;

-- Reader streaks — daily-active reading habit loop.
-- Updated by /api/reading-progress when a user reads on a new UTC day.
ALTER TABLE "users" ADD COLUMN "reading_streak_days" integer NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "reading_streak_last_day" text;
ALTER TABLE "users" ADD COLUMN "reading_streak_best" integer NOT NULL DEFAULT 0;
