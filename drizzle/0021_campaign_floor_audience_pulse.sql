ALTER TABLE "campaign_floor_rounds"
  ADD COLUMN IF NOT EXISTS "audience_pulse_enabled" boolean DEFAULT false NOT NULL;

CREATE TABLE IF NOT EXISTS "campaign_floor_audience_pulses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "round_id" uuid NOT NULL REFERENCES "campaign_floor_rounds"("id") ON DELETE cascade,
  "submission_id" uuid NOT NULL REFERENCES "campaign_floor_submissions"("id") ON DELETE cascade,
  "token" text NOT NULL,
  "user_id" uuid REFERENCES "users"("id") ON DELETE cascade,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "campaign_floor_audience_pulse_round_token_unique" UNIQUE("round_id","token")
);

CREATE INDEX IF NOT EXISTS "idx_campaign_floor_audience_pulses_submission"
  ON "campaign_floor_audience_pulses" USING btree ("submission_id");
