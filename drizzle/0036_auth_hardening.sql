ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "session_version" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "password_changed_at" timestamptz;

-- Existing reset links were stored as bearer tokens. Remove them so only
-- hashed reset tokens exist after this migration is applied.
DELETE FROM "password_reset_tokens";

CREATE TABLE IF NOT EXISTS "auth_rate_limits" (
  "key" text PRIMARY KEY NOT NULL,
  "count" integer DEFAULT 0 NOT NULL,
  "window_start" timestamptz NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "login_attempts" (
  "key" text PRIMARY KEY NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "first_attempt_at" timestamptz NOT NULL,
  "locked_until" timestamptz,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_lower_unique" ON "users" (lower("email"));
