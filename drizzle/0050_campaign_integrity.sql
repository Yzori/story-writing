-- Push campaign invariants that currently live only in app code down into the
-- database. All constraints are added NOT VALID so they only apply to future
-- writes and can never fail on existing rows.

-- FK: campaign_sessions.chapter_id -> chapters(id), nulled when the chapter is
-- deleted. Column exists today with no FK behind it.
ALTER TABLE "campaign_sessions" ADD CONSTRAINT "campaign_sessions_chapter_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE SET NULL NOT VALID;
--> statement-breakpoint

-- CHECK: campaign_turns.type pinned to the 12 known turn types
-- (see src/lib/campaign-turns.ts CAMPAIGN_TURN_TYPES).
ALTER TABLE "campaign_turns" ADD CONSTRAINT "campaign_turns_type_check" CHECK ("type" IN ('narration', 'consequence', 'action', 'dialogue', 'reaction', 'description', 'roll', 'roll-request', 'ooc', 'illustration', 'scene-break', 'story-moment')) NOT VALID;
--> statement-breakpoint

-- CHECK: campaign_sessions.status pinned to the known session lifecycle states.
ALTER TABLE "campaign_sessions" ADD CONSTRAINT "campaign_sessions_status_check" CHECK ("status" IN ('draft', 'active', 'completed', 'archived')) NOT VALID;
--> statement-breakpoint

-- CHECK: player_characters.status pinned to the known character states.
ALTER TABLE "player_characters" ADD CONSTRAINT "player_characters_status_check" CHECK ("status" IN ('active', 'retired', 'dead')) NOT VALID;
--> statement-breakpoint

-- CHECK: session_roster.status pinned to the known roster states.
ALTER TABLE "session_roster" ADD CONSTRAINT "session_roster_status_check" CHECK ("status" IN ('present', 'absent', 'introduced', 'spectating')) NOT VALID;
