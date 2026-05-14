-- Enforce "one active session per story" at the DB level.
-- The previous "transaction" wrapper in the PATCH handler only did a SELECT
-- and returned — the actual UPDATE happened outside any locking, so two
-- concurrent activation requests could both pass the check and both succeed.
-- A partial unique index closes that race for free.
CREATE UNIQUE INDEX IF NOT EXISTS "campaign_sessions_one_active_per_story"
  ON "campaign_sessions" ("story_id")
  WHERE "status" = 'active';
