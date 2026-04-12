CREATE TABLE "ink_drop_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_user_id" uuid,
	"to_user_id" uuid NOT NULL,
	"session_id" uuid,
	"amount" integer NOT NULL,
	"type" text NOT NULL,
	"message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spectator_presence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"token" text NOT NULL,
	"user_id" uuid,
	"last_heartbeat" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "spectator_presence_session_token_unique" UNIQUE("session_id","token")
);
--> statement-breakpoint
CREATE TABLE "spectator_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"token" text NOT NULL,
	"user_id" uuid,
	"type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ink_drop_balance" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "ink_drop_transactions" ADD CONSTRAINT "ink_drop_transactions_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ink_drop_transactions" ADD CONSTRAINT "ink_drop_transactions_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ink_drop_transactions" ADD CONSTRAINT "ink_drop_transactions_session_id_campaign_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."campaign_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spectator_presence" ADD CONSTRAINT "spectator_presence_session_id_campaign_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."campaign_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spectator_presence" ADD CONSTRAINT "spectator_presence_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spectator_reactions" ADD CONSTRAINT "spectator_reactions_session_id_campaign_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."campaign_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spectator_reactions" ADD CONSTRAINT "spectator_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ink_drop_tx_to_user" ON "ink_drop_transactions" USING btree ("to_user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_ink_drop_tx_session" ON "ink_drop_transactions" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_spectator_presence_session" ON "spectator_presence" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_spectator_presence_heartbeat" ON "spectator_presence" USING btree ("last_heartbeat");--> statement-breakpoint
CREATE INDEX "idx_spectator_reactions_session_created" ON "spectator_reactions" USING btree ("session_id","created_at");