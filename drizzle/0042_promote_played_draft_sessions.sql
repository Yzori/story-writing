-- Promote legacy "draft" sessions that have turns to "active".
--
-- The pre-session lobby ("Cross the Threshold") was added after sessions had
-- already been played. Sessions created before the lobby gate kept their
-- initial status of "draft" even though play history accumulated on them,
-- causing the lobby to (incorrectly) re-appear on returning visits.
--
-- A session with any turns has already crossed the threshold by definition.
UPDATE "campaign_sessions"
SET "status" = 'active'
WHERE "status" = 'draft'
  AND "id" IN (
    SELECT DISTINCT "session_id"
    FROM "campaign_turns"
    WHERE "session_id" IS NOT NULL
  );
