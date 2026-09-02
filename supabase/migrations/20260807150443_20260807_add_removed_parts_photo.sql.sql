/*
# Add removed parts photo column to service_reports

1. Modified Tables
- `service_reports`: add `photo_removed_parts` (text, nullable) to store the R2 URL
  for a photo showing where removed parts/equipment were stored during a pool closing.

2. Security
- No RLS changes — the table already has policies in place.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_reports' AND column_name = 'photo_removed_parts'
  ) THEN
    ALTER TABLE service_reports ADD COLUMN photo_removed_parts text;
  END IF;
END $$;
