-- Author-curated "hook" — 1-2 sentence pitch surfaced on cards and feeds.
-- Designed for snackable on-ramps to long work — the first line that earns
-- the reader's next 5-25 minutes.
ALTER TABLE "stories" ADD COLUMN "hook" text DEFAULT '';
