/*
  # Add Team Members and Assignment Editable Fields

  ## Purpose
  1. Allow admins to allocate technicians to teams (persisted, not per-day)
  2. Add editable override fields to daily assignments so admin can tweak
     displayed info without changing the actual client record
  3. Add completion and reschedule/cancel tracking

  ## New Tables

  ### `team_members`
  - `id` (uuid, primary key)
  - `team` (text) - one of: PRINCESSDAVID, TONYVAN, JARVISVAN, SONIC
  - `staff_id` (text) - references technicians.staff_id
  - `created_at` (timestamptz)

  ## Modified Tables

  ### `team_daily_assignments` - added columns
  - `title` (text) - editable display title (defaults to client name, can be changed for quick tasks)
  - `display_pool_type` (text, nullable) - override for pool type display
  - `display_address` (text, nullable) - override for address display
  - `display_phone` (text, nullable) - override for phone display
  - `display_pool_cover` (text, nullable) - override for pool cover display
  - `display_pool_opening` (text, nullable) - override for pool opening display
  - `display_pool_closing` (text, nullable) - override for pool closing display
  - `display_pool_maintenance` (text, nullable) - override for pool maintenance display
  - `display_backyard_access` (text, nullable) - override for backyard access display
  - `display_opening_add_ons` (text, nullable) - override for opening add-ons display
  - `display_closing_add_ons` (text, nullable) - override for closing add-ons display
  - `completed` (boolean, default false) - checkbox: service completed & report done
  - `reschedule_cancel` (boolean, default false) - checkbox: reschedule/cancel

  ## Security
  - RLS enabled on team_members with open policies matching existing pattern
*/

CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team text NOT NULL CHECK (team IN ('PRINCESSDAVID', 'TONYVAN', 'JARVISVAN', 'SONIC')),
  staff_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all reads on team_members"
  ON team_members FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow insert on team_members"
  ON team_members FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow update on team_members"
  ON team_members FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete on team_members"
  ON team_members FOR DELETE
  TO anon
  USING (true);

-- Add editable override columns to team_daily_assignments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_daily_assignments' AND column_name = 'title') THEN
    ALTER TABLE team_daily_assignments ADD COLUMN title text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_daily_assignments' AND column_name = 'display_pool_type') THEN
    ALTER TABLE team_daily_assignments ADD COLUMN display_pool_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_daily_assignments' AND column_name = 'display_address') THEN
    ALTER TABLE team_daily_assignments ADD COLUMN display_address text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_daily_assignments' AND column_name = 'display_phone') THEN
    ALTER TABLE team_daily_assignments ADD COLUMN display_phone text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_daily_assignments' AND column_name = 'display_pool_cover') THEN
    ALTER TABLE team_daily_assignments ADD COLUMN display_pool_cover text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_daily_assignments' AND column_name = 'display_pool_opening') THEN
    ALTER TABLE team_daily_assignments ADD COLUMN display_pool_opening text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_daily_assignments' AND column_name = 'display_pool_closing') THEN
    ALTER TABLE team_daily_assignments ADD COLUMN display_pool_closing text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_daily_assignments' AND column_name = 'display_pool_maintenance') THEN
    ALTER TABLE team_daily_assignments ADD COLUMN display_pool_maintenance text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_daily_assignments' AND column_name = 'display_backyard_access') THEN
    ALTER TABLE team_daily_assignments ADD COLUMN display_backyard_access text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_daily_assignments' AND column_name = 'display_opening_add_ons') THEN
    ALTER TABLE team_daily_assignments ADD COLUMN display_opening_add_ons text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_daily_assignments' AND column_name = 'display_closing_add_ons') THEN
    ALTER TABLE team_daily_assignments ADD COLUMN display_closing_add_ons text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_daily_assignments' AND column_name = 'completed') THEN
    ALTER TABLE team_daily_assignments ADD COLUMN completed boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_daily_assignments' AND column_name = 'reschedule_cancel') THEN
    ALTER TABLE team_daily_assignments ADD COLUMN reschedule_cancel boolean DEFAULT false;
  END IF;
END $$;
