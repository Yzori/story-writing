-- 0051: The House — gold left by the audience during live sessions.
-- Law: money never buys the story; it buys light. A row is one gesture from
-- the dark — gold for the table (turn_id NULL) or a line set in gold
-- (turn_id names the passage). The room shows only the shimmer, never totals.

CREATE TABLE "campaign_gold" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"story_id" uuid NOT NULL,
	"turn_id" uuid,
	"from_user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_gold" ADD CONSTRAINT "campaign_gold_session_id_campaign_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "campaign_sessions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "campaign_gold" ADD CONSTRAINT "campaign_gold_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "campaign_gold" ADD CONSTRAINT "campaign_gold_turn_id_campaign_turns_id_fk" FOREIGN KEY ("turn_id") REFERENCES "campaign_turns"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "campaign_gold" ADD CONSTRAINT "campaign_gold_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_campaign_gold_session" ON "campaign_gold" ("session_id","created_at");
--> statement-breakpoint
CREATE INDEX "idx_campaign_gold_turn" ON "campaign_gold" ("turn_id");
--> statement-breakpoint
CREATE INDEX "idx_campaign_gold_story" ON "campaign_gold" ("story_id");
