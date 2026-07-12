-- 0062: The room is alive — cast presence.
-- One row per seat: last_seen heartbeats while the play page is open,
-- writing_at pulses while the spotlight-holder is actually typing.
-- Powers the ember dots and the honest "writing…" in the cast bar.

CREATE TABLE "adventure_seat_presence" (
	"adventure_id" uuid NOT NULL,
	"seat_id" uuid NOT NULL,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"writing_at" timestamp with time zone,
	CONSTRAINT "adventure_seat_presence_pk" PRIMARY KEY ("adventure_id","seat_id")
);
--> statement-breakpoint
ALTER TABLE "adventure_seat_presence" ADD CONSTRAINT "adventure_seat_presence_adventure_id_adventures_id_fk" FOREIGN KEY ("adventure_id") REFERENCES "adventures"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "adventure_seat_presence" ADD CONSTRAINT "adventure_seat_presence_seat_id_adventure_seats_id_fk" FOREIGN KEY ("seat_id") REFERENCES "adventure_seats"("id") ON DELETE cascade ON UPDATE no action;
