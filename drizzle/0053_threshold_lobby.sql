-- 0053: The Threshold — the room before the light.
-- Cast presence (who has actually taken their seat), the audience's
-- prediction slips (glory, never gold — no payout, no names in the room),
-- and the Director's one-shot "let your followers know" gathering call.
-- Live-now reads gathering_called_at with a 2h freshness window; sessions
-- is a small table, no extra index needed at current scale.

CREATE TABLE "campaign_cast_presence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"last_heartbeat" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_cast_presence" ADD CONSTRAINT "campaign_cast_presence_session_id_campaign_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "campaign_sessions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "campaign_cast_presence" ADD CONSTRAINT "campaign_cast_presence_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "campaign_cast_presence" ADD CONSTRAINT "campaign_cast_presence_session_user_unique" UNIQUE ("session_id","user_id");
--> statement-breakpoint
CREATE INDEX "idx_campaign_cast_presence_session" ON "campaign_cast_presence" ("session_id","last_heartbeat");
--> statement-breakpoint
CREATE TABLE "campaign_wagers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"story_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_wagers" ADD CONSTRAINT "campaign_wagers_session_id_campaign_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "campaign_sessions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "campaign_wagers" ADD CONSTRAINT "campaign_wagers_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "campaign_wagers" ADD CONSTRAINT "campaign_wagers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_campaign_wagers_session" ON "campaign_wagers" ("session_id","created_at");
--> statement-breakpoint
CREATE TABLE "campaign_wager_holds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wager_id" uuid NOT NULL,
	"token" text NOT NULL,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_wager_holds" ADD CONSTRAINT "campaign_wager_holds_wager_id_campaign_wagers_id_fk" FOREIGN KEY ("wager_id") REFERENCES "campaign_wagers"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "campaign_wager_holds" ADD CONSTRAINT "campaign_wager_holds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "campaign_wager_holds" ADD CONSTRAINT "campaign_wager_holds_wager_token_unique" UNIQUE ("wager_id","token");
--> statement-breakpoint
CREATE INDEX "idx_campaign_wager_holds_wager" ON "campaign_wager_holds" ("wager_id");
--> statement-breakpoint
ALTER TABLE "campaign_sessions" ADD COLUMN "gathering_called_at" timestamp with time zone;
