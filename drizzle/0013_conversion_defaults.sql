-- Free-tier AI "taste" quota.
-- Tracks lifetime "Continue Writing" generations consumed by Free users
-- so we can offer 5 free generations before requiring an upgrade.
-- Pro/Premium users ignore this column.

ALTER TABLE "users" ADD COLUMN "ai_free_generations_used" integer NOT NULL DEFAULT 0;

-- Default email notifications to ON so users actually get retention pings.
-- Existing rows are explicitly flipped on; new rows default true via the
-- updated NOT NULL default. Users can opt out from /settings.
ALTER TABLE "users" ALTER COLUMN "email_notifications" SET DEFAULT true;
UPDATE "users" SET "email_notifications" = true WHERE "email_notifications" = false;
