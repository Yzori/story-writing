-- The cover: what fronts the profile's full-bleed first screen — the
-- writer's portrait (null) or one of their published works' cover art.
-- NOTE: the dev apply script strips comment lines and splits on ";", so each
-- statement ends with ";" and must contain no internal ";" (no DO/$$ blocks).
-- Duplicate-object errors (table/constraint/index already present) are skipped.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_cover_story_id" uuid;
ALTER TABLE "users" ADD CONSTRAINT "users_profile_cover_story_id_stories_id_fk" FOREIGN KEY ("profile_cover_story_id") REFERENCES "public"."stories"("id") ON DELETE set null ON UPDATE no action;
