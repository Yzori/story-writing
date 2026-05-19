ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "campaign_seats" integer DEFAULT 6 NOT NULL;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "campaign_tone_mood" integer DEFAULT 62 NOT NULL;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "campaign_tone_scale" integer DEFAULT 45 NOT NULL;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "campaign_tone_influence" integer DEFAULT 35 NOT NULL;
