-- Idempotency for Audience Sparks.
--
-- Without a unique constraint on (round_id, token), two concurrent posts from
-- the same network identity could both insert AND both debit drops. The
-- pulse table already has this constraint; sparks were missing it.
--
-- Dedupe defensively before adding the constraint — keep the earliest row
-- per (round_id, token); the rest were unintended doubles.
DELETE FROM "campaign_floor_audience_sparks" a
USING "campaign_floor_audience_sparks" b
WHERE a.round_id = b.round_id
  AND a.token = b.token
  AND a.created_at > b.created_at;

ALTER TABLE "campaign_floor_audience_sparks"
  ADD CONSTRAINT "campaign_floor_audience_sparks_round_token_unique"
  UNIQUE ("round_id", "token");
