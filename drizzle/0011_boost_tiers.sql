ALTER TABLE "story_boosts" ADD COLUMN IF NOT EXISTS "tier" text DEFAULT 'standard' NOT NULL;
--> statement-breakpoint
ALTER TABLE "story_boosts" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active' NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_story_boosts_tier_status" ON "story_boosts" ("tier","status","starts_at");
