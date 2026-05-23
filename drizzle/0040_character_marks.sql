-- Character marks — Scars, Vows, Debts, Memories.
--
-- Player-authored one-line marks that persist on a character across sessions.
-- The system flags "mark-worthy" events (partial/failure rolls, fatal rolls
-- survived, accepted bargains) and prompts the player; the player decides
-- whether and what to write. The character literally accumulates from play.
--
-- session_id and source_turn_id are set null on delete (rather than cascade)
-- so a deleted session or turn doesn't erase the character's history.

CREATE TABLE IF NOT EXISTS "character_marks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "character_id" uuid NOT NULL REFERENCES "player_characters"("id") ON DELETE CASCADE,
  "story_id" uuid NOT NULL REFERENCES "stories"("id") ON DELETE CASCADE,
  "session_id" uuid REFERENCES "campaign_sessions"("id") ON DELETE SET NULL,
  "source_turn_id" uuid REFERENCES "campaign_turns"("id") ON DELETE SET NULL,
  "kind" text NOT NULL,
  "text" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_character_marks_character_created"
  ON "character_marks" ("character_id", "created_at");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_character_marks_character_source_unique"
  ON "character_marks" ("character_id", "source_turn_id");

CREATE INDEX IF NOT EXISTS "idx_character_marks_session"
  ON "character_marks" ("session_id", "created_at");
