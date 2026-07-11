-- 0060: The board — matchmaking for Adventures.
-- Applications for open seats (either side of the table can be the
-- open one: cast seeking a Director, or a Director seeking writers).
-- The board query index shipped with 0059 (idx_adventures_board).

CREATE TABLE "adventure_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"adventure_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"seat_role" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "adventure_applications" ADD CONSTRAINT "adventure_applications_adventure_id_adventures_id_fk" FOREIGN KEY ("adventure_id") REFERENCES "adventures"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "adventure_applications" ADD CONSTRAINT "adventure_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_adventure_applications_adventure" ON "adventure_applications" ("adventure_id","status");
--> statement-breakpoint
ALTER TABLE "adventure_applications" ADD CONSTRAINT "adventure_applications_adventure_user_unique" UNIQUE ("adventure_id","user_id");
