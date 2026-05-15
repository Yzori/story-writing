-- Enforce "one active session per story" at the DB level.
-- The previous "transaction" wrapper in the PATCH handler only did a SELECT
-- and returned — the actual UPDATE happened outside any locking, so two
-- concurrent activation requests could both pass the check and both succeed.
-- A partial unique index closes that race for free.
WITH ranked_active_sessions AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "story_id"
      ORDER BY "updated_at" DESC, "created_at" DESC, "id" DESC
    ) AS "rank"
  FROM "campaign_sessions"
  WHERE "status" = 'active'
)
UPDATE "campaign_sessions"
SET
  "status" = 'archived',
  "updated_at" = now()
WHERE "id" IN (
  SELECT "id"
  FROM ranked_active_sessions
  WHERE "rank" > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS "campaign_sessions_one_active_per_story"
  ON "campaign_sessions" ("story_id")
  WHERE "status" = 'active';
