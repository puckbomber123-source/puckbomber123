/*
  # Add checklist_data JSONB column to service_reports

  Stores the structured Swim-Ready checklist keyed by subsection
  (winter_plu, pool_reins, pool_light, etc.) as a JSONB object.
  Only populated when opening_type = 'Swim Ready'.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_reports' AND column_name = 'checklist_data'
  ) THEN
    ALTER TABLE service_reports ADD COLUMN checklist_data jsonb DEFAULT NULL;
  END IF;
END $$;
