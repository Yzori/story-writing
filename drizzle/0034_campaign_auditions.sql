ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "campaign_cadence" text DEFAULT 'Cadence set by the GM' NOT NULL;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "campaign_audition_prompt" text DEFAULT 'Write the moment we first meet your character. Where are they? What are they doing? What do they want, and what stops them from getting it?' NOT NULL;

ALTER TABLE "campaign_applications" ADD COLUMN IF NOT EXISTS "character_name" text;
ALTER TABLE "campaign_applications" ADD COLUMN IF NOT EXISTS "character_archetype" text;
ALTER TABLE "campaign_applications" ADD COLUMN IF NOT EXISTS "character_known_for" text;
ALTER TABLE "campaign_applications" ADD COLUMN IF NOT EXISTS "first_glimpse" text;
ALTER TABLE "campaign_applications" ADD COLUMN IF NOT EXISTS "player_cadence" text;
ALTER TABLE "campaign_applications" ADD COLUMN IF NOT EXISTS "player_spotlight" text;
ALTER TABLE "campaign_applications" ADD COLUMN IF NOT EXISTS "writing_sample_url" text;
ALTER TABLE "campaign_applications" ADD COLUMN IF NOT EXISTS "voice_cadence" text;
ALTER TABLE "campaign_applications" ADD COLUMN IF NOT EXISTS "voice_mood" text;
ALTER TABLE "campaign_applications" ADD COLUMN IF NOT EXISTS "voice_restraint" text;
