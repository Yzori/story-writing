-- Cover mode: 'auto' (best work fronts the disc, portrait fallback),
-- 'portrait', or 'story' (the work in profile_cover_story_id).
-- NOTE: the dev apply script strips comment lines and splits on ";", so each
-- statement ends with ";" and must contain no internal ";" (no DO/$$ blocks).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_cover_mode" text NOT NULL DEFAULT 'auto';
