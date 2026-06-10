-- Promote legacy "draft" sessions that have turns out of "draft".
--
-- The pre-session lobby ("Cross the Threshold") was added after sessions had
-- already been played. Sessions created before the lobby gate kept their
-- initial status of "draft" even though play history accumulated on them,
-- causing the lobby to (incorrectly) re-appear on returning visits.
--
-- A session with any turns has already crossed the threshold by definition.
-- Migration 0018 added the partial unique index
-- "campaign_sessions_one_active_per_story" (story_id WHERE status = 'active'),
-- so a blanket promotion to 'active' could collide with an existing active
-- session or with a sibling played draft and abort the deploy. Instead:
-- promote at most one played draft per story (the latest by sort order) to
-- 'active', and only when the story has no active session already; mark the
-- remaining played drafts 'completed', which matches their real lifecycle.
WITH played_drafts AS (
  SELECT
    cs."id",
    cs."story_id",
    row_number() OVER (
      PARTITION BY cs."story_id"
      ORDER BY cs."sort_order" DESC, cs."updated_at" DESC, cs."created_at" DESC, cs."id" DESC
    ) AS "rank"
  FROM "campaign_sessions" cs
  WHERE cs."status" = 'draft'
    AND EXISTS (
      SELECT 1
      FROM "campaign_turns" ct
      WHERE ct."session_id" = cs."id"
    )
),
promotable AS (
  SELECT pd."id"
  FROM played_drafts pd
  WHERE pd."rank" = 1
    AND NOT EXISTS (
      SELECT 1
      FROM "campaign_sessions" active_session
      WHERE active_session."story_id" = pd."story_id"
        AND active_session."status" = 'active'
    )
)
UPDATE "campaign_sessions"
SET
  "status" = CASE
    WHEN "campaign_sessions"."id" IN (SELECT "id" FROM promotable) THEN 'active'
    ELSE 'completed'
  END,
  "updated_at" = now()
WHERE "campaign_sessions"."id" IN (SELECT "id" FROM played_drafts);
