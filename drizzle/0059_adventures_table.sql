-- 0059: Adventures — "the table".
-- One Director + 2–4 writers around a table, spotlight turns,
-- raise-hand / step-forward initiative. New surface, distinct from
-- campaign v2 (campaign_* tables untouched). stories.writing_mode
-- gains the value 'adventure' (text column, no DDL needed).

CREATE TABLE "adventures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"premise" text DEFAULT '' NOT NULL,
	"genre" text DEFAULT '' NOT NULL,
	"pace" text DEFAULT 'turn-2-days' NOT NULL,
	"turn_due_hours" integer DEFAULT 48 NOT NULL,
	"status" text DEFAULT 'casting' NOT NULL,
	"act_no" integer DEFAULT 1 NOT NULL,
	"scene_no" integer DEFAULT 0 NOT NULL,
	"spotlight_seat_id" uuid,
	"spotlight_since" timestamp with time zone,
	"spotlight_due_at" timestamp with time zone,
	"board_visibility" text DEFAULT 'private' NOT NULL,
	"invite_token_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "adventure_seats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"adventure_id" uuid NOT NULL,
	"user_id" uuid,
	"role" text NOT NULL,
	"character_name" text DEFAULT '' NOT NULL,
	"character_brief" text DEFAULT '' NOT NULL,
	"ink_color" text DEFAULT 'amber' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"step_forward_act" integer DEFAULT 0 NOT NULL,
	"turns_on_time" integer DEFAULT 0 NOT NULL,
	"turns_late" integer DEFAULT 0 NOT NULL,
	"joined_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "adventure_scenes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"adventure_id" uuid NOT NULL,
	"act_no" integer NOT NULL,
	"scene_no" integer NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "adventure_passages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"adventure_id" uuid NOT NULL,
	"scene_id" uuid NOT NULL,
	"seat_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"content" text NOT NULL,
	"word_count" integer DEFAULT 0 NOT NULL,
	"sort_order" integer NOT NULL,
	"signed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "adventure_hands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"adventure_id" uuid NOT NULL,
	"seat_id" uuid NOT NULL,
	"whisper" text DEFAULT '' NOT NULL,
	"raised_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolution" text
);
--> statement-breakpoint
ALTER TABLE "adventures" ADD CONSTRAINT "adventures_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "adventures" ADD CONSTRAINT "adventures_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "adventures" ADD CONSTRAINT "adventures_spotlight_seat_id_adventure_seats_id_fk" FOREIGN KEY ("spotlight_seat_id") REFERENCES "adventure_seats"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "adventure_seats" ADD CONSTRAINT "adventure_seats_adventure_id_adventures_id_fk" FOREIGN KEY ("adventure_id") REFERENCES "adventures"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "adventure_seats" ADD CONSTRAINT "adventure_seats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "adventure_scenes" ADD CONSTRAINT "adventure_scenes_adventure_id_adventures_id_fk" FOREIGN KEY ("adventure_id") REFERENCES "adventures"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "adventure_passages" ADD CONSTRAINT "adventure_passages_adventure_id_adventures_id_fk" FOREIGN KEY ("adventure_id") REFERENCES "adventures"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "adventure_passages" ADD CONSTRAINT "adventure_passages_scene_id_adventure_scenes_id_fk" FOREIGN KEY ("scene_id") REFERENCES "adventure_scenes"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "adventure_passages" ADD CONSTRAINT "adventure_passages_seat_id_adventure_seats_id_fk" FOREIGN KEY ("seat_id") REFERENCES "adventure_seats"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "adventure_hands" ADD CONSTRAINT "adventure_hands_adventure_id_adventures_id_fk" FOREIGN KEY ("adventure_id") REFERENCES "adventures"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "adventure_hands" ADD CONSTRAINT "adventure_hands_seat_id_adventure_seats_id_fk" FOREIGN KEY ("seat_id") REFERENCES "adventure_seats"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_adventures_story" ON "adventures" ("story_id");
--> statement-breakpoint
CREATE INDEX "idx_adventures_owner" ON "adventures" ("owner_id");
--> statement-breakpoint
CREATE INDEX "idx_adventures_board" ON "adventures" ("board_visibility","status","genre","pace");
--> statement-breakpoint
CREATE INDEX "idx_adventure_seats_adventure" ON "adventure_seats" ("adventure_id");
--> statement-breakpoint
CREATE INDEX "idx_adventure_seats_user" ON "adventure_seats" ("user_id");
--> statement-breakpoint
ALTER TABLE "adventure_seats" ADD CONSTRAINT "adventure_seats_adventure_user_unique" UNIQUE ("adventure_id","user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "adventure_seats_one_director" ON "adventure_seats" ("adventure_id") WHERE role = 'director';
--> statement-breakpoint
CREATE INDEX "idx_adventure_scenes_adventure" ON "adventure_scenes" ("adventure_id");
--> statement-breakpoint
ALTER TABLE "adventure_scenes" ADD CONSTRAINT "adventure_scenes_act_scene_unique" UNIQUE ("adventure_id","act_no","scene_no");
--> statement-breakpoint
CREATE UNIQUE INDEX "adventure_scenes_one_open" ON "adventure_scenes" ("adventure_id") WHERE status = 'open';
--> statement-breakpoint
CREATE INDEX "idx_adventure_passages_adventure" ON "adventure_passages" ("adventure_id","sort_order");
--> statement-breakpoint
ALTER TABLE "adventure_passages" ADD CONSTRAINT "adventure_passages_sort_unique" UNIQUE ("adventure_id","sort_order");
--> statement-breakpoint
CREATE INDEX "idx_adventure_hands_adventure" ON "adventure_hands" ("adventure_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "adventure_hands_one_active_per_seat" ON "adventure_hands" ("seat_id") WHERE resolved_at IS NULL;
