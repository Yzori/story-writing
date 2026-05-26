-- Webtoon panel "seam": the authored vertical pacing ABOVE a panel.
--
-- A vertical-scroll comic reads as one continuous strip, so the gap between
-- panels is a craft lever (the beat between moments), not a fixed gutter.
-- Values: none | beat | pause | breath | blackout (rendered by getSeamClass,
-- shared between the editor canvas, the reader-true preview, and WebtoonReader).
ALTER TABLE "panels"
  ADD COLUMN IF NOT EXISTS "seam" text NOT NULL DEFAULT 'none';
