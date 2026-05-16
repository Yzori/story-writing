ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "paragraph_indent" boolean DEFAULT false NOT NULL;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "line_spacing" text DEFAULT 'comfortable' NOT NULL;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "text_alignment" text DEFAULT 'left' NOT NULL;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "paragraph_spacing" text DEFAULT 'normal' NOT NULL;
