ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "feed_impressions" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stories_feed_impressions" ON "stories" ("feed_impressions");
