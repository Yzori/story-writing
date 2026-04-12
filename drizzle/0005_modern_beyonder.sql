CREATE TABLE "annotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chapter_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"start_offset" integer NOT NULL,
	"end_offset" integer NOT NULL,
	"content" text NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jam_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jam_id" uuid NOT NULL,
	"story_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jam_entries_jam_story_unique" UNIQUE("jam_id","story_id")
);
--> statement-breakpoint
CREATE TABLE "jam_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jam_id" uuid NOT NULL,
	"entry_id" uuid NOT NULL,
	"voter_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jam_votes_entry_voter_unique" UNIQUE("entry_id","voter_id")
);
--> statement-breakpoint
CREATE TABLE "story_boosts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"ink_drops_cost" integer NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_jams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"theme" text NOT NULL,
	"banner_url" text,
	"created_by" uuid NOT NULL,
	"submission_starts_at" timestamp with time zone NOT NULL,
	"submission_ends_at" timestamp with time zone NOT NULL,
	"voting_starts_at" timestamp with time zone NOT NULL,
	"voting_ends_at" timestamp with time zone NOT NULL,
	"word_count_min" integer,
	"word_count_max" integer,
	"max_entries" integer,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ink_drop_transactions" ADD COLUMN "stripe_session_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_notifications" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jam_entries" ADD CONSTRAINT "jam_entries_jam_id_story_jams_id_fk" FOREIGN KEY ("jam_id") REFERENCES "public"."story_jams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jam_entries" ADD CONSTRAINT "jam_entries_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jam_entries" ADD CONSTRAINT "jam_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jam_votes" ADD CONSTRAINT "jam_votes_jam_id_story_jams_id_fk" FOREIGN KEY ("jam_id") REFERENCES "public"."story_jams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jam_votes" ADD CONSTRAINT "jam_votes_entry_id_jam_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."jam_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jam_votes" ADD CONSTRAINT "jam_votes_voter_id_users_id_fk" FOREIGN KEY ("voter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_boosts" ADD CONSTRAINT "story_boosts_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_boosts" ADD CONSTRAINT "story_boosts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_jams" ADD CONSTRAINT "story_jams_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_annotations_chapter" ON "annotations" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX "idx_annotations_user_chapter" ON "annotations" USING btree ("user_id","chapter_id");--> statement-breakpoint
CREATE INDEX "idx_jam_entries_jam" ON "jam_entries" USING btree ("jam_id");--> statement-breakpoint
CREATE INDEX "idx_jam_votes_entry" ON "jam_votes" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "idx_jam_votes_jam" ON "jam_votes" USING btree ("jam_id");--> statement-breakpoint
CREATE INDEX "idx_story_boosts_expires" ON "story_boosts" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_story_boosts_story" ON "story_boosts" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "idx_story_jams_status" ON "story_jams" USING btree ("status");--> statement-breakpoint
ALTER TABLE "ink_drop_transactions" ADD CONSTRAINT "ink_drop_transactions_stripe_session_id_unique" UNIQUE("stripe_session_id");