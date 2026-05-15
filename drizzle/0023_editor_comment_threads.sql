CREATE TABLE IF NOT EXISTS "editor_comment_threads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "story_id" uuid NOT NULL REFERENCES "stories"("id") ON DELETE cascade,
  "chapter_id" uuid NOT NULL REFERENCES "chapters"("id") ON DELETE cascade,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "quoted_text" text NOT NULL,
  "from_pos" integer NOT NULL,
  "to_pos" integer NOT NULL,
  "resolved" boolean DEFAULT false NOT NULL,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_editor_comment_threads_chapter"
  ON "editor_comment_threads" USING btree ("story_id", "chapter_id", "deleted_at");

CREATE TABLE IF NOT EXISTS "editor_comment_replies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "thread_id" uuid NOT NULL REFERENCES "editor_comment_threads"("id") ON DELETE cascade,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "content" text NOT NULL,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_editor_comment_replies_thread"
  ON "editor_comment_replies" USING btree ("thread_id", "deleted_at", "created_at");
