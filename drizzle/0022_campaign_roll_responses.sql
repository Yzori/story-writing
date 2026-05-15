CREATE TABLE IF NOT EXISTS "campaign_roll_responses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL REFERENCES "campaign_sessions"("id") ON DELETE cascade,
  "roll_request_turn_id" uuid NOT NULL REFERENCES "campaign_turns"("id") ON DELETE cascade,
  "roll_turn_id" uuid NOT NULL REFERENCES "campaign_turns"("id") ON DELETE cascade,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "campaign_roll_response_request_user_unique" UNIQUE("roll_request_turn_id","user_id"),
  CONSTRAINT "campaign_roll_response_turn_unique" UNIQUE("roll_turn_id")
);

CREATE INDEX IF NOT EXISTS "idx_campaign_roll_responses_session"
  ON "campaign_roll_responses" USING btree ("session_id");

INSERT INTO "campaign_roll_responses" ("session_id", "roll_request_turn_id", "roll_turn_id", "user_id")
SELECT
  roll."session_id",
  (roll."metadata"::jsonb ->> 'rollRequestTurnId')::uuid,
  roll."id",
  roll."user_id"
FROM "campaign_turns" roll
WHERE roll."type" = 'roll'
  AND roll."metadata" IS NOT NULL
  AND roll."metadata"::jsonb ? 'rollRequestTurnId'
ON CONFLICT DO NOTHING;
