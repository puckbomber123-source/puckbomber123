/*
  # Add report_completed flag to team_daily_assignments

  When a service report is submitted for a client assignment, this flag is
  set to true so the daily assignment card shows a "Report Done" badge.

  1. Changes
    - `team_daily_assignments`: new boolean column `report_completed` (default false)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_daily_assignments' AND column_name = 'report_completed'
  ) THEN
    ALTER TABLE team_daily_assignments ADD COLUMN report_completed boolean DEFAULT false;
  END IF;
END $$;
