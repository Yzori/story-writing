ALTER TABLE "campaign_floor_submissions"
  ALTER COLUMN "user_id" DROP NOT NULL,
  ALTER COLUMN "character_id" DROP NOT NULL;

ALTER TABLE "campaign_floor_submissions"
  ADD COLUMN IF NOT EXISTS "source" text NOT NULL DEFAULT 'player',
  ADD COLUMN IF NOT EXISTS "source_label" text,
  ADD COLUMN IF NOT EXISTS "audience_spark_id" uuid;

CREATE TABLE IF NOT EXISTS "campaign_floor_audience_sparks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "round_id" uuid NOT NULL REFERENCES "campaign_floor_rounds"("id") ON DELETE cascade,
  "token" text NOT NULL,
  "user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "content" text NOT NULL,
  "amount" integer NOT NULL DEFAULT 25,
  "status" text NOT NULL DEFAULT 'pending',
  "promoted_submission_id" uuid REFERENCES "campaign_floor_submissions"("id") ON DELETE set null,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_campaign_floor_audience_sparks_round"
  ON "campaign_floor_audience_sparks" USING btree ("round_id","status");

CREATE INDEX IF NOT EXISTS "idx_campaign_floor_audience_sparks_user"
  ON "campaign_floor_audience_sparks" USING btree ("user_id","created_at");
