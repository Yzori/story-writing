DROP INDEX IF EXISTS "idx_campaign_floor_rounds_one_active";

CREATE UNIQUE INDEX IF NOT EXISTS "idx_campaign_floor_rounds_one_active"
  ON "campaign_floor_rounds" USING btree ("session_id")
  WHERE "status" IN ('open', 'voting', 'closed');
