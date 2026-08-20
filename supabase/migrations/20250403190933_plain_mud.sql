/*
  # Add checklist items to service reports

  1. Changes
    - Add `checklist_items` column to `service_reports` table
      - Type: text[] (array of strings)
      - Nullable: true (allows reports without checklist items)
      - Default: empty array

  2. Security
    - No changes to RLS policies needed as existing policies cover the new column
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_reports' 
    AND column_name = 'checklist_items'
  ) THEN
    ALTER TABLE service_reports 
    ADD COLUMN checklist_items text[] DEFAULT '{}';
  END IF;
END $$;