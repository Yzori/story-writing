-- 0061: The audience — lanterns in the room.
-- Anonymous presence (the lantern count), paragraph sparks, backing a
-- character, reader suggestions the Director may write in (credited),
-- and crossroads.adventure_id so the Director can put a question to
-- the house (drop-weighted, the existing Crossroads machinery).

CREATE TABLE "adventure_backings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"adventure_id" uuid NOT NULL,
	"seat_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "adventure_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"adventure_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"canonized_passage_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "adventure_passage_sparks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"passage_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "adventure_audience_presence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"adventure_id" uuid NOT NULL,
	"token" text NOT NULL,
	"last_heartbeat" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "adventure_backings" ADD CONSTRAINT "adventure_backings_adventure_id_adventures_id_fk" FOREIGN KEY ("adventure_id") REFERENCES "adventures"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "adventure_backings" ADD CONSTRAINT "adventure_backings_seat_id_adventure_seats_id_fk" FOREIGN KEY ("seat_id") REFERENCES "adventure_seats"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "adventure_backings" ADD CONSTRAINT "adventure_backings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "adventure_suggestions" ADD CONSTRAINT "adventure_suggestions_adventure_id_adventures_id_fk" FOREIGN KEY ("adventure_id") REFERENCES "adventures"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "adventure_suggestions" ADD CONSTRAINT "adventure_suggestions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "adventure_suggestions" ADD CONSTRAINT "adventure_suggestions_canonized_passage_id_adventure_passages_id_fk" FOREIGN KEY ("canonized_passage_id") REFERENCES "adventure_passages"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "adventure_passage_sparks" ADD CONSTRAINT "adventure_passage_sparks_passage_id_adventure_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "adventure_passages"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "adventure_passage_sparks" ADD CONSTRAINT "adventure_passage_sparks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "adventure_audience_presence" ADD CONSTRAINT "adventure_audience_presence_adventure_id_adventures_id_fk" FOREIGN KEY ("adventure_id") REFERENCES "adventures"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_adventure_backings_adventure" ON "adventure_backings" ("adventure_id");
--> statement-breakpoint
ALTER TABLE "adventure_backings" ADD CONSTRAINT "adventure_backings_adventure_user_unique" UNIQUE ("adventure_id","user_id");
--> statement-breakpoint
CREATE INDEX "idx_adventure_suggestions_adventure" ON "adventure_suggestions" ("adventure_id","status");
--> statement-breakpoint
CREATE INDEX "idx_adventure_passage_sparks_passage" ON "adventure_passage_sparks" ("passage_id");
--> statement-breakpoint
ALTER TABLE "adventure_passage_sparks" ADD CONSTRAINT "adventure_passage_sparks_passage_user_unique" UNIQUE ("passage_id","user_id");
--> statement-breakpoint
CREATE INDEX "idx_adventure_audience_presence" ON "adventure_audience_presence" ("adventure_id","last_heartbeat");
--> statement-breakpoint
ALTER TABLE "adventure_audience_presence" ADD CONSTRAINT "adventure_audience_presence_token_unique" UNIQUE ("adventure_id","token");
--> statement-breakpoint
ALTER TABLE "crossroads" ADD COLUMN "adventure_id" uuid;
--> statement-breakpoint
ALTER TABLE "crossroads" ADD CONSTRAINT "crossroads_adventure_id_adventures_id_fk" FOREIGN KEY ("adventure_id") REFERENCES "adventures"("id") ON DELETE set null ON UPDATE no action;
