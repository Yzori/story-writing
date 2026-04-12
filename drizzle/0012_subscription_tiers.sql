-- Add subscription and AI usage fields to users table
ALTER TABLE "users" ADD COLUMN "subscription_tier" text DEFAULT 'free' NOT NULL;
ALTER TABLE "users" ADD COLUMN "subscription_status" text DEFAULT 'active' NOT NULL;
ALTER TABLE "users" ADD COLUMN "stripe_customer_id" text;
ALTER TABLE "users" ADD COLUMN "stripe_subscription_id" text;
ALTER TABLE "users" ADD COLUMN "subscription_ends_at" timestamp with time zone;
ALTER TABLE "users" ADD COLUMN "trial_ends_at" timestamp with time zone;
ALTER TABLE "users" ADD COLUMN "ai_requests_this_month" integer DEFAULT 0 NOT NULL;
ALTER TABLE "users" ADD COLUMN "ai_requests_reset_at" timestamp with time zone;

-- Create index on subscription fields for faster queries
CREATE INDEX "idx_users_subscription_tier" ON "users" ("subscription_tier");
CREATE INDEX "idx_users_stripe_customer" ON "users" ("stripe_customer_id");
