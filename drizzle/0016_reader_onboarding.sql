-- Reader onboarding preferences — captured during the post-signup flow
-- and used to prime the For You queue from day one. Without these, new
-- readers see a generic feed and Day-1 retention craters.
ALTER TABLE "users" ADD COLUMN "preferred_genres" text[] NOT NULL DEFAULT '{}';
ALTER TABLE "users" ADD COLUMN "preferred_read_length" text;
ALTER TABLE "users" ADD COLUMN "onboarded_at" timestamptz;
