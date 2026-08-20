/*
# Add pool_type_override column to service_reports

1. Modified Tables
- `service_reports`: add `pool_type_override` (text, nullable) to store the
  technician's corrected pool type when the client record has the wrong type.

2. Security
- No RLS changes — the table already has policies in place.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_reports' AND column_name = 'pool_type_override'
  ) THEN
    ALTER TABLE service_reports ADD COLUMN pool_type_override text;
  END IF;
END $$;
