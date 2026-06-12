-- The study, opened to visitors: candles (warm 7-day presence) and letters
-- (private correspondence, public once answered), plus host settings on users.
-- NOTE: the dev apply script strips comment lines and splits on ";", so each
-- statement ends with ";" and must contain no internal ";" (no DO/$$ blocks).
-- Duplicate-object errors (table/constraint/index already present) are skipped.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_hearth" boolean NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_letterbox" text NOT NULL DEFAULT 'open';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_show_gifts" boolean NOT NULL DEFAULT true;
CREATE TABLE IF NOT EXISTS "profile_candles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "profile_user_id" uuid NOT NULL,
  "visitor_id" uuid NOT NULL,
  "lit_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "profile_candles" ADD CONSTRAINT "profile_candles_profile_user_id_users_id_fk" FOREIGN KEY ("profile_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "profile_candles" ADD CONSTRAINT "profile_candles_visitor_id_users_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "profile_candles" ADD CONSTRAINT "profile_candles_visitor_unique" UNIQUE ("profile_user_id", "visitor_id");
CREATE INDEX IF NOT EXISTS "idx_profile_candles_recent" ON "profile_candles" USING btree ("profile_user_id", "lit_at");
CREATE TABLE IF NOT EXISTS "profile_letters" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "profile_user_id" uuid NOT NULL,
  "sender_id" uuid NOT NULL,
  "body" text NOT NULL,
  "reply" text,
  "replied_at" timestamp with time zone,
  "is_pinned" boolean DEFAULT false NOT NULL,
  "deleted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE "profile_letters" ADD CONSTRAINT "profile_letters_profile_user_id_users_id_fk" FOREIGN KEY ("profile_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "profile_letters" ADD CONSTRAINT "profile_letters_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX IF NOT EXISTS "idx_profile_letters_feed" ON "profile_letters" USING btree ("profile_user_id", "deleted_at", "replied_at", "created_at");
CREATE INDEX IF NOT EXISTS "idx_profile_letters_sender" ON "profile_letters" USING btree ("sender_id", "created_at");
