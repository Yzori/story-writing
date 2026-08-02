-- OAuth users sign up through the NextAuth adapter, which fills `name` and
-- `image` but not the app-facing `display_name`/`avatar_url` — so every
-- OAuth author rendered as "Anonymous" with no avatar across ~40 routes.
-- The auth `createUser` event now copies these at creation; this backfills
-- everyone who signed up before it existed.
UPDATE "users" SET "display_name" = "name"
  WHERE "display_name" IS NULL AND "name" IS NOT NULL;

UPDATE "users" SET "avatar_url" = "image"
  WHERE "avatar_url" IS NULL AND "image" IS NOT NULL;
