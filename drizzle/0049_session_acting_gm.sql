-- Session-scoped acting GM, for live-play continuity (D2).
--
-- Null = the story owner is running the session. When set — via a planned
-- handoff ("I can't run tonight") or a table-consented takeover (the owner
-- dropped mid-session) — this player may RUN the session: narrate, assign the
-- spotlight, call rolls, manage clocks/scene, open the floor, end & compile.
-- They never gain campaign ownership (transfer, applications, charter stay
-- owner-only), and the owner auto-reclaims on return.
--
-- NOTE: the dev apply script strips comment lines and splits on ";", so each
-- statement ends with ";" and contains no internal ";". Duplicate-object
-- errors (column/constraint already present) are skipped, so this is re-runnable.
ALTER TABLE "campaign_sessions" ADD COLUMN IF NOT EXISTS "acting_gm_id" uuid;
ALTER TABLE "campaign_sessions" ADD CONSTRAINT "campaign_sessions_acting_gm_id_users_id_fk" FOREIGN KEY ("acting_gm_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "campaign_sessions" ADD COLUMN IF NOT EXISTS "takeover_proposer_id" uuid;
ALTER TABLE "campaign_sessions" ADD CONSTRAINT "campaign_sessions_takeover_proposer_id_users_id_fk" FOREIGN KEY ("takeover_proposer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
