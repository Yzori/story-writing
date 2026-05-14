-- Free the one-active-round slot when a round transitions to 'closed'.
-- Migration 0020 had locked 'closed' rounds in alongside 'open' and
-- 'voting', meaning a session could only ever have one Crossroads round
-- without an explicit retire/archive step (which the UI didn't offer).
-- Two-state-locked is simpler: open + voting are the in-flight states;
-- closed is "done, slot free, still queryable for history".
DROP INDEX IF EXISTS "idx_campaign_floor_rounds_one_active";

CREATE UNIQUE INDEX IF NOT EXISTS "idx_campaign_floor_rounds_one_active"
  ON "campaign_floor_rounds" USING btree ("session_id")
  WHERE "status" IN ('open', 'voting');
