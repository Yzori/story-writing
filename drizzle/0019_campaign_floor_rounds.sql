CREATE TABLE IF NOT EXISTS "campaign_floor_rounds" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL REFERENCES "campaign_sessions"("id") ON DELETE cascade,
  "opened_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "prompt" text NOT NULL,
  "mode" text DEFAULT 'gm_pick' NOT NULL,
  "status" text DEFAULT 'open' NOT NULL,
  "selected_submission_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "campaign_floor_submissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "round_id" uuid NOT NULL REFERENCES "campaign_floor_rounds"("id") ON DELETE cascade,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "character_id" uuid NOT NULL REFERENCES "player_characters"("id") ON DELETE cascade,
  "type" text DEFAULT 'action' NOT NULL,
  "content" text NOT NULL,
  "status" text DEFAULT 'submitted' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "campaign_floor_submission_round_user_unique" UNIQUE("round_id","user_id")
);

CREATE TABLE IF NOT EXISTS "campaign_floor_votes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "round_id" uuid NOT NULL REFERENCES "campaign_floor_rounds"("id") ON DELETE cascade,
  "submission_id" uuid NOT NULL REFERENCES "campaign_floor_submissions"("id") ON DELETE cascade,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "campaign_floor_vote_round_user_unique" UNIQUE("round_id","user_id")
);

CREATE INDEX IF NOT EXISTS "idx_campaign_floor_rounds_session_status" ON "campaign_floor_rounds" USING btree ("session_id","status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_campaign_floor_rounds_one_active"
  ON "campaign_floor_rounds" USING btree ("session_id")
  WHERE "status" IN ('open', 'voting', 'closed');
CREATE INDEX IF NOT EXISTS "idx_campaign_floor_submissions_round" ON "campaign_floor_submissions" USING btree ("round_id");
CREATE INDEX IF NOT EXISTS "idx_campaign_floor_votes_submission" ON "campaign_floor_votes" USING btree ("submission_id");
