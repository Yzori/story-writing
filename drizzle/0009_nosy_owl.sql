CREATE TABLE "crossroads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"question" text NOT NULL,
	"options" text DEFAULT '[]' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolved_option" integer,
	"closes_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crossroads_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crossroad_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"option_index" integer NOT NULL,
	"drops_spent" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_donations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_user_id" uuid NOT NULL,
	"to_user_id" uuid NOT NULL,
	"story_id" uuid,
	"amount" integer NOT NULL,
	"message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crossroads" ADD CONSTRAINT "crossroads_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crossroads" ADD CONSTRAINT "crossroads_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crossroads_votes" ADD CONSTRAINT "crossroads_votes_crossroad_id_crossroads_id_fk" FOREIGN KEY ("crossroad_id") REFERENCES "public"."crossroads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crossroads_votes" ADD CONSTRAINT "crossroads_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_donations" ADD CONSTRAINT "story_donations_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_donations" ADD CONSTRAINT "story_donations_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_donations" ADD CONSTRAINT "story_donations_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_crossroads_story_status" ON "crossroads" USING btree ("story_id","status");--> statement-breakpoint
CREATE INDEX "idx_crossroads_creator" ON "crossroads" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "idx_crossroads_votes_crossroad" ON "crossroads_votes" USING btree ("crossroad_id");--> statement-breakpoint
CREATE INDEX "idx_crossroads_votes_user" ON "crossroads_votes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_donations_to_user" ON "story_donations" USING btree ("to_user_id");--> statement-breakpoint
CREATE INDEX "idx_donations_story" ON "story_donations" USING btree ("story_id");