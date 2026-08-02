-- Unique indexes backing two check-then-insert races the 2026-08-02
-- correctness audit found. Both dedupe first so creation can't fail on
-- rows the races already produced.

-- One ACTIVE character per user per campaign story. Two concurrent
-- application approvals could both insert a player character (the
-- transition guard was read-then-write with no constraint behind it).
WITH ranked AS (
  SELECT id, row_number() OVER (
    PARTITION BY story_id, user_id
    ORDER BY created_at ASC
  ) AS rn
  FROM "player_characters"
  WHERE status = 'active'
)
UPDATE "player_characters" SET status = 'retired'
  WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS "player_characters_one_active_per_user"
  ON "player_characters" ("story_id", "user_id")
  WHERE status = 'active';

-- One OPEN house vote per adventure. The house-vote route checks then
-- inserts; the sibling adventure tables (scenes, hands) already enforce
-- their one-open invariants with partial uniques like this one.
WITH ranked AS (
  SELECT id, row_number() OVER (
    PARTITION BY adventure_id
    ORDER BY created_at DESC
  ) AS rn
  FROM "crossroads"
  WHERE status = 'open' AND adventure_id IS NOT NULL
)
UPDATE "crossroads" SET status = 'closed'
  WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS "crossroads_one_open_per_adventure"
  ON "crossroads" ("adventure_id")
  WHERE status = 'open' AND adventure_id IS NOT NULL;
