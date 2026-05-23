-- Cliffhanger field on campaign sessions.
--
-- Distinct from `epilogue` (the contemplative closing line). Cliffhanger is
-- the future-tense hook: one line, designed to anchor the "Previously, on…"
-- card that opens the NEXT session. "X will die at dawn unless…"
ALTER TABLE "campaign_sessions"
  ADD COLUMN IF NOT EXISTS "cliffhanger" text;
