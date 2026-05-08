-- Email digest mode.
-- "instant" (default) — send per-event email immediately.
-- "daily" / "weekly"  — queue notifications and send a digest on the cron schedule.
-- "off"               — never send (matches emailNotifications=false).
ALTER TABLE "users" ADD COLUMN "email_digest_mode" text NOT NULL DEFAULT 'instant';
ALTER TABLE "users" ADD COLUMN "last_digest_sent_at" timestamptz;

-- Notification email tracking.
-- emailed_at IS NULL → either suppressed or queued for the next digest.
ALTER TABLE "notifications" ADD COLUMN "emailed_at" timestamptz;
CREATE INDEX IF NOT EXISTS "idx_notifications_user_emailed" ON "notifications" ("user_id", "emailed_at");
