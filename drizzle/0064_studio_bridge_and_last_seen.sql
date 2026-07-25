-- The Hemingway bridge, off this device at last.
--
-- The studio has been able to hold a note to tomorrow-you since 2026-06-12,
-- but only in localStorage — so a note written on the laptop was invisible on
-- the phone, and the server could never put it in a digest, a push, or the
-- editor. These two columns move it where it belongs: onto the chapter it
-- belongs to.
ALTER TABLE "chapters" ADD COLUMN IF NOT EXISTS "bridge_note" text;
ALTER TABLE "chapters" ADD COLUMN IF NOT EXISTS "bridge_note_at" timestamp with time zone;

-- The narrator's greeting scales to how long you were gone, but "how long"
-- lived in localStorage too — so signing in on a new device after a month away
-- was greeted as your first night. Server-side, the absence is true everywhere.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_seen_at" timestamp with time zone;
