/*
  # Add service_type to team_daily_assignments

  Adds an optional service_type column to team_daily_assignments.
  Options: Silver Opening, Swim-Ready Opening, Service Call, Leak Detection, Pressure Test

  1. Changes
    - `team_daily_assignments`: new nullable `service_type` text column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_daily_assignments' AND column_name = 'service_type'
  ) THEN
    ALTER TABLE team_daily_assignments ADD COLUMN service_type text DEFAULT '';
  END IF;
END $$;
