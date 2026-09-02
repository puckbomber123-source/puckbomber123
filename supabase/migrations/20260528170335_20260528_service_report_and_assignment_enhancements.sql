/*
  # Service Report & Assignment Enhancements

  1. Changes to service_reports
     - Add `cash_amount` (numeric) — amount paid in cash
     - Add `property_left_clean` (boolean) — required property left clean confirmation
     - Add `client_email_sent` (boolean) — tracks whether report email was sent to client

  2. Changes to team_daily_assignments
     - Add `to_be_invoiced` (boolean) — admin manually marks for invoicing
     - Add `service_not_complete` (boolean) — denormalized flag for quick display
     - Add `cash_paid_amount` (numeric) — denormalized cash amount for assignment card display

  3. Notes
     - All new columns are nullable or have safe defaults
     - No existing data is affected
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_reports' AND column_name = 'cash_amount'
  ) THEN
    ALTER TABLE service_reports ADD COLUMN cash_amount numeric(10,2) DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_reports' AND column_name = 'property_left_clean'
  ) THEN
    ALTER TABLE service_reports ADD COLUMN property_left_clean boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_reports' AND column_name = 'client_email_sent'
  ) THEN
    ALTER TABLE service_reports ADD COLUMN client_email_sent boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_daily_assignments' AND column_name = 'to_be_invoiced'
  ) THEN
    ALTER TABLE team_daily_assignments ADD COLUMN to_be_invoiced boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_daily_assignments' AND column_name = 'service_not_complete'
  ) THEN
    ALTER TABLE team_daily_assignments ADD COLUMN service_not_complete boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_daily_assignments' AND column_name = 'cash_paid_amount'
  ) THEN
    ALTER TABLE team_daily_assignments ADD COLUMN cash_paid_amount numeric(10,2) DEFAULT NULL;
  END IF;
END $$;
