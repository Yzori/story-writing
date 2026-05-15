CREATE TABLE IF NOT EXISTS "desk_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "body" text NOT NULL,
  "story_id" uuid REFERENCES "stories"("id") ON DELETE set null,
  "is_pinned" boolean DEFAULT false NOT NULL,
  "edited_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_desk_notes_user_feed"
  ON "desk_notes" USING btree ("user_id", "deleted_at", "is_pinned" DESC, "created_at" DESC);

-- Enforce only one pinned note per user (where not deleted).
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_desk_notes_user_pinned"
  ON "desk_notes" ("user_id")
  WHERE "is_pinned" = true AND "deleted_at" IS NULL;
