CREATE TABLE "commission_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commission_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"content" text NOT NULL,
	"attachment_url" text,
	"is_delivery" boolean DEFAULT false NOT NULL,
	"is_system_message" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commission_testimonials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commission_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"artisan_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"tags" text DEFAULT '[]',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "testimonials_commission_unique" UNIQUE("commission_id")
);
--> statement-breakpoint
CREATE TABLE "commissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offering_id" uuid NOT NULL,
	"patron_id" uuid NOT NULL,
	"artisan_id" uuid NOT NULL,
	"story_id" uuid,
	"status" text DEFAULT 'requested' NOT NULL,
	"brief" text NOT NULL,
	"quoted_price" integer,
	"agreed_price" integer,
	"revisions_used" integer DEFAULT 0 NOT NULL,
	"max_revisions" integer DEFAULT 1 NOT NULL,
	"delivery_deadline" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offerings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artisan_id" uuid NOT NULL,
	"craft" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"price_min" integer NOT NULL,
	"price_max" integer NOT NULL,
	"delivery_days" integer DEFAULT 7 NOT NULL,
	"revision_rounds" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"portfolio_urls" text DEFAULT '[]',
	"completed_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "commission_messages" ADD CONSTRAINT "commission_messages_commission_id_commissions_id_fk" FOREIGN KEY ("commission_id") REFERENCES "public"."commissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_messages" ADD CONSTRAINT "commission_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_testimonials" ADD CONSTRAINT "commission_testimonials_commission_id_commissions_id_fk" FOREIGN KEY ("commission_id") REFERENCES "public"."commissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_testimonials" ADD CONSTRAINT "commission_testimonials_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_testimonials" ADD CONSTRAINT "commission_testimonials_artisan_id_users_id_fk" FOREIGN KEY ("artisan_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_offering_id_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."offerings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_patron_id_users_id_fk" FOREIGN KEY ("patron_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_artisan_id_users_id_fk" FOREIGN KEY ("artisan_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offerings" ADD CONSTRAINT "offerings_artisan_id_users_id_fk" FOREIGN KEY ("artisan_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_commission_messages_commission" ON "commission_messages" USING btree ("commission_id");--> statement-breakpoint
CREATE INDEX "idx_testimonials_artisan" ON "commission_testimonials" USING btree ("artisan_id");--> statement-breakpoint
CREATE INDEX "idx_commissions_patron" ON "commissions" USING btree ("patron_id");--> statement-breakpoint
CREATE INDEX "idx_commissions_artisan_status" ON "commissions" USING btree ("artisan_id","status");--> statement-breakpoint
CREATE INDEX "idx_commissions_offering" ON "commissions" USING btree ("offering_id");--> statement-breakpoint
CREATE INDEX "idx_offerings_artisan" ON "offerings" USING btree ("artisan_id");--> statement-breakpoint
CREATE INDEX "idx_offerings_craft_active" ON "offerings" USING btree ("craft","is_active");