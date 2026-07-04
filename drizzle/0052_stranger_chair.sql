-- 0052: The Stranger — a chair left for the dark.
-- Opt-in per campaign: a recurring character in the fiction that the
-- audience plays together. The Director wakes it and frames its possible
-- deeds; the house chooses; the deed joins the story in moon-silver ink.
-- Choosing is free — gold never buys the story — and the Director's veto
-- is absolute. Ballots reuse campaign_floor_rounds (mode 'stranger') with
-- Director-written submissions (user_id NULL) and audience pulses as votes.

ALTER TABLE "stories" ADD COLUMN "campaign_stranger_enabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "campaign_stranger_name" text;
--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "campaign_stranger_nature" text;
