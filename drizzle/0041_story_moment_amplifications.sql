-- Audience-held Story Moments.
--
-- A spectator can amplify a Story Moment once. The table stores the audience
-- memory signal separately from the turn so it can be counted, de-duped by
-- spectator token, and removed automatically if the session/turn is deleted.

CREATE TABLE IF NOT EXISTS "story_moment_amplifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id" uuid NOT NULL REFERENCES "campaign_sessions"("id") ON DELETE CASCADE,
  "turn_id" uuid NOT NULL REFERENCES "campaign_turns"("id") ON DELETE CASCADE,
  "token" text NOT NULL,
  "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "story_moment_amplifications_turn_token_unique"
  ON "story_moment_amplifications" ("turn_id", "token");

CREATE INDEX IF NOT EXISTS "idx_story_moment_amplifications_session"
  ON "story_moment_amplifications" ("session_id", "created_at");

CREATE INDEX IF NOT EXISTS "idx_story_moment_amplifications_turn"
  ON "story_moment_amplifications" ("turn_id");
