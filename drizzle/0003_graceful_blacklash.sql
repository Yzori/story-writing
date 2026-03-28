CREATE TABLE "editor_presence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"chapter_id" uuid,
	"status" text DEFAULT 'viewing' NOT NULL,
	"last_heartbeat" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "editor_presence_story_user_unique" UNIQUE("story_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "workshop_messages" ADD COLUMN "type" text DEFAULT 'chat' NOT NULL;--> statement-breakpoint
ALTER TABLE "workshop_messages" ADD COLUMN "metadata" text DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "editor_presence" ADD CONSTRAINT "editor_presence_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editor_presence" ADD CONSTRAINT "editor_presence_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editor_presence" ADD CONSTRAINT "editor_presence_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_editor_presence_story" ON "editor_presence" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "idx_campaign_turns_user_id" ON "campaign_turns" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_chapter_snapshots_chapter_id" ON "chapter_snapshots" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX "idx_comments_user_id" ON "comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_open_calls_story_id" ON "open_calls" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "idx_reactions_chapter_id" ON "reactions" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX "idx_reactions_story_id" ON "reactions" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "idx_stories_user_id" ON "stories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_stories_browse" ON "stories" USING btree ("is_public","status","deleted_at","published_at");--> statement-breakpoint
CREATE INDEX "idx_stories_status" ON "stories" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_suggestions_chapter_id" ON "suggestions" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX "idx_writing_sessions_user_id" ON "writing_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_writing_sessions_story_id" ON "writing_sessions" USING btree ("story_id");