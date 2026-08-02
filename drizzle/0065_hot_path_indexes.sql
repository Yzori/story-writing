-- Hot-path indexes the 2026-08-02 audit found missing.
--
-- The audience watch stream asks "is there an open house vote?" once per
-- viewer per tick; without this the polls table is sequentially scanned
-- at streaming frequency.
CREATE INDEX IF NOT EXISTS "idx_crossroads_adventure_status"
  ON "crossroads" ("adventure_id", "status");

-- The dashboard's live-readers count joins reading_progress by story; the
-- only existing key leads with user_id, so story lookups scan.
CREATE INDEX IF NOT EXISTS "idx_reading_progress_story"
  ON "reading_progress" ("story_id", "updated_at");

-- The hub's "recent comments on your stories" and the home feed filter
-- comments by story alone; the existing composite leads with chapter_id.
CREATE INDEX IF NOT EXISTS "idx_comments_story_created"
  ON "comments" ("story_id", "created_at");

-- Cron sweeps: the digest job scanned the full users table, the
-- abandonment sweeps scanned campaign_sessions and adventures.
CREATE INDEX IF NOT EXISTS "idx_users_digest_due"
  ON "users" ("email_digest_mode", "last_digest_sent_at")
  WHERE "email_notifications" = true AND "email_digest_mode" IN ('daily', 'weekly');

CREATE INDEX IF NOT EXISTS "idx_campaign_sessions_status_updated"
  ON "campaign_sessions" ("status", "updated_at");

CREATE INDEX IF NOT EXISTS "idx_adventures_spotlight_due"
  ON "adventures" ("status", "spotlight_due_at");
