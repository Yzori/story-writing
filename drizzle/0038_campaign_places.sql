-- Adventure-mode places.
--
-- A place is a named location a campaign references in its prose. Scene-break
-- turns carry an optional locationId pointing at a place; when a scene-break
-- is posted with a fresh title the server upserts a place on the fly so
-- the Places list populates with zero GM effort.
--
-- Coordinates (x, y) are percentages 0-100 over the (optional) story map
-- image. Null coords mean "not placed yet" — those places still appear in
-- the Places list view but not on the spatial map.
CREATE TABLE IF NOT EXISTS "places" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "story_id" uuid NOT NULL REFERENCES "stories"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  -- Lowercased, trimmed name used for dedup on auto-create. Two scene-breaks
  -- with the same title resolve to the same place. The unique index below
  -- makes that idempotent.
  "name_key" text NOT NULL,
  "mood" text,
  "description" text NOT NULL DEFAULT '',
  "x" integer,
  "y" integer,
  -- Whether the row was created by the auto-create-on-scene-break path
  -- (true) vs. an explicit GM action (false). Used as a UI hint.
  "auto_created" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "places_x_range" CHECK ("x" IS NULL OR ("x" >= 0 AND "x" <= 100)),
  CONSTRAINT "places_y_range" CHECK ("y" IS NULL OR ("y" >= 0 AND "y" <= 100))
);

CREATE INDEX IF NOT EXISTS "idx_places_story_id" ON "places" ("story_id");
CREATE UNIQUE INDEX IF NOT EXISTS "places_story_name_unique"
  ON "places" ("story_id", "name_key");

-- Stories gain an optional map image URL. Capped at the API layer (Zod
-- max 4096) so nobody slips a 27 KB base64 data URI in here the way the
-- avatar field used to permit.
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "map_image_url" text;
