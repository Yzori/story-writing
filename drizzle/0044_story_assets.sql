-- Reusable per-story image library for the webtoon asset tray.
-- Authors upload characters/backgrounds/props once and drop them into panel
-- frames across episodes. Bytes are base64 data URLs (same as panels).
-- NOTE: the dev apply script strips comment lines and splits on ";", so each
-- statement ends with ";" and must contain no internal ";" (no DO/$$ blocks).
-- Duplicate-object errors (table/constraint/index already present) are skipped.
CREATE TABLE IF NOT EXISTS "story_assets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "story_id" uuid NOT NULL,
  "name" text NOT NULL DEFAULT '',
  "image_data" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "story_assets" ADD CONSTRAINT "story_assets_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX IF NOT EXISTS "idx_story_assets_story_id" ON "story_assets" USING btree ("story_id");
