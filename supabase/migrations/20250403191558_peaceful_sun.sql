/*
  # Add photos column to service_reports table

  1. Changes
    - Add `photos` column to `service_reports` table
      - Type: `jsonb` to store an array of photo URLs
      - Nullable: true (not all reports may have photos)
      - Default: empty array `'[]'::jsonb`

  2. Notes
    - Using `jsonb` instead of `text[]` to allow for more flexible photo metadata storage
    - Existing RLS policies will automatically apply to the new column
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'service_reports' 
    AND column_name = 'photos'
  ) THEN
    ALTER TABLE service_reports 
    ADD COLUMN photos jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;