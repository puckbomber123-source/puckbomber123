/*
  # Add pool_size fields

  1. Changes
    - `clients`: add `pool_size` text column (stores HubSpot pool_size property, e.g. "32x16", "45x22")
    - `team_daily_assignments`: add `display_pool_size` text column (denormalized from client at booking time)

  2. Notes
    - Both columns are nullable; existing rows unaffected
    - No RLS changes needed — existing policies cover these columns
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'pool_size'
  ) THEN
    ALTER TABLE clients ADD COLUMN pool_size text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_daily_assignments' AND column_name = 'display_pool_size'
  ) THEN
    ALTER TABLE team_daily_assignments ADD COLUMN display_pool_size text;
  END IF;
END $$;
