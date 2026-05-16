CREATE TABLE "story_intelligence_artifacts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "story_id" uuid NOT NULL,
  "chapter_id" uuid,
  "type" text NOT NULL,
  "source_hash" text NOT NULL,
  "content" text NOT NULL,
  "model" text,
  "generated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "story_intel_source_unique" UNIQUE("story_id","chapter_id","type","source_hash")
);
--> statement-breakpoint
ALTER TABLE "story_intelligence_artifacts" ADD CONSTRAINT "story_intelligence_artifacts_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "story_intelligence_artifacts" ADD CONSTRAINT "story_intelligence_artifacts_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_story_intel_story_type" ON "story_intelligence_artifacts" USING btree ("story_id","type");
--> statement-breakpoint
CREATE INDEX "idx_story_intel_chapter_type" ON "story_intelligence_artifacts" USING btree ("chapter_id","type");
