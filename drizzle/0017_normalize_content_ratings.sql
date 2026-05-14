-- Normalize legacy content_rating values to the canonical scheme.
-- The create form used to POST G/PG/PG13/R/MA, but readers' comfort filter
-- and the browse RATING_LEVELS map only know everyone/teen/mature/explicit.
-- The mismatch meant R and MA stories silently fell through to all-ages.
UPDATE "stories"
SET "content_rating" = CASE "content_rating"
  WHEN 'G' THEN 'everyone'
  WHEN 'PG' THEN 'everyone'
  WHEN 'PG13' THEN 'teen'
  WHEN 'R' THEN 'mature'
  WHEN 'MA' THEN 'explicit'
  ELSE "content_rating"
END
WHERE "content_rating" IN ('G', 'PG', 'PG13', 'R', 'MA');
