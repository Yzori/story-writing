CREATE TABLE "circle_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reader_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"tier" text DEFAULT 'confidant' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"price_at_subscription" integer NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"renewal_date" timestamp with time zone NOT NULL,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "circle_subs_reader_creator_unique" UNIQUE("reader_id","creator_id")
);
--> statement-breakpoint
CREATE TABLE "creator_circles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"confidant_price" integer DEFAULT 500 NOT NULL,
	"confidant_description" text,
	"early_access_days" integer DEFAULT 3 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_circles_creator_unique" UNIQUE("creator_id")
);
--> statement-breakpoint
ALTER TABLE "chapters" ADD COLUMN "early_access_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "circle_only" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "circle_subscriptions" ADD CONSTRAINT "circle_subscriptions_reader_id_users_id_fk" FOREIGN KEY ("reader_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_subscriptions" ADD CONSTRAINT "circle_subscriptions_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_circles" ADD CONSTRAINT "creator_circles_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_circle_subs_creator_status" ON "circle_subscriptions" USING btree ("creator_id","status");--> statement-breakpoint
CREATE INDEX "idx_circle_subs_reader" ON "circle_subscriptions" USING btree ("reader_id");--> statement-breakpoint
CREATE INDEX "idx_circle_subs_renewal" ON "circle_subscriptions" USING btree ("renewal_date");--> statement-breakpoint
CREATE INDEX "idx_creator_circles_active" ON "creator_circles" USING btree ("is_active");