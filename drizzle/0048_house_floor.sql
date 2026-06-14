-- Open the floor to the house (house_fork) + champion a character.

ALTER TABLE "campaign_floor_rounds" ADD COLUMN IF NOT EXISTS "options" text;
ALTER TABLE "campaign_floor_rounds" ADD COLUMN IF NOT EXISTS "constituency" text NOT NULL DEFAULT 'table';
ALTER TABLE "campaign_floor_rounds" ADD COLUMN IF NOT EXISTS "binding" boolean NOT NULL DEFAULT false;
ALTER TABLE "campaign_floor_rounds" ADD COLUMN IF NOT EXISTS "resolved_option" integer;
ALTER TABLE "campaign_floor_rounds" ADD COLUMN IF NOT EXISTS "closes_at" timestamptz;

CREATE TABLE IF NOT EXISTS "campaign_floor_audience_votes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "round_id" uuid NOT NULL REFERENCES "campaign_floor_rounds"("id") ON DELETE CASCADE,
  "token" text NOT NULL,
  "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "option_index" integer NOT NULL,
  "drops_spent" integer NOT NULL DEFAULT 0,
  "weight" integer NOT NULL DEFAULT 1,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "campaign_floor_audience_votes_round_token_unique" UNIQUE ("round_id", "token")
);
CREATE INDEX IF NOT EXISTS "idx_campaign_floor_audience_votes_round" ON "campaign_floor_audience_votes" ("round_id");

CREATE TABLE IF NOT EXISTS "character_champions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "character_id" uuid NOT NULL REFERENCES "player_characters"("id") ON DELETE CASCADE,
  "story_id" uuid NOT NULL REFERENCES "stories"("id") ON DELETE CASCADE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "character_champions_user_character_unique" UNIQUE ("user_id", "character_id")
);
CREATE INDEX IF NOT EXISTS "idx_character_champions_character" ON "character_champions" ("character_id");
