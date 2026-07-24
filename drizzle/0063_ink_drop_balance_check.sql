-- Defense in depth: every app path guards debits with FOR UPDATE + a balance
-- check, but nothing at the DB level stops a future path from forgetting.
-- NOT VALID: enforce on new writes without scanning (or failing on) existing
-- rows. Run `ALTER TABLE users VALIDATE CONSTRAINT ...` manually after
-- confirming no legacy row is negative.
ALTER TABLE "users"
  ADD CONSTRAINT "users_ink_drop_balance_nonnegative"
  CHECK ("ink_drop_balance" >= 0) NOT VALID;
