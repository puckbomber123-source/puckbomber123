/*
# Add closing_add_ons and closing_checklist to service_reports

Stores the pool closing add-on selections and checklist completion in the
service report, matching the opening_add_ons pattern.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_reports' AND column_name = 'closing_add_ons'
  ) THEN
    ALTER TABLE service_reports ADD COLUMN closing_add_ons text[];
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_reports' AND column_name = 'closing_checklist'
  ) THEN
    ALTER TABLE service_reports ADD COLUMN closing_checklist text[];
  END IF;
END $$;