CREATE TABLE "content_unlocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"chapter_id" uuid NOT NULL,
	"story_id" uuid NOT NULL,
	"drops_spent" integer NOT NULL,
	"gifted_by" uuid,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_unlocks_user_chapter_unique" UNIQUE("user_id","chapter_id")
);
--> statement-breakpoint
ALTER TABLE "chapters" ADD COLUMN "gating_tier" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "chapters" ADD COLUMN "early_access_days" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "monetization_model" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "free_chapter_count" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "default_gating_tier" text DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "content_unlocks" ADD CONSTRAINT "content_unlocks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_unlocks" ADD CONSTRAINT "content_unlocks_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_unlocks" ADD CONSTRAINT "content_unlocks_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_unlocks" ADD CONSTRAINT "content_unlocks_gifted_by_users_id_fk" FOREIGN KEY ("gifted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_content_unlocks_user_story" ON "content_unlocks" USING btree ("user_id","story_id");--> statement-breakpoint
CREATE INDEX "idx_content_unlocks_chapter" ON "content_unlocks" USING btree ("chapter_id");