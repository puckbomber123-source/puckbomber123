/*
  # Create Team Daily Assignments

  ## Purpose
  Allows admins to assign clients to one of four service teams for a given day,
  with custom notes per assignment.

  ## New Tables

  ### `team_daily_assignments`
  - `id` (uuid, primary key)
  - `assignment_date` (date) - the date of the assignment
  - `team` (text) - one of: PRINCESSDAVID, TONYVAN, JARVISVAN, SONIC
  - `client_email` (text) - references clients table by email
  - `sort_order` (integer) - order within the team list
  - `admin_note` (text, nullable) - custom note from admin for this client/stop
  - `created_by` (text) - staff_id of the admin who created it
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - RLS enabled with policies restricted to authenticated-like access
    (portal uses anon key with open policies matching existing tables)
*/

CREATE TABLE IF NOT EXISTS team_daily_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_date date NOT NULL DEFAULT CURRENT_DATE,
  team text NOT NULL CHECK (team IN ('PRINCESSDAVID', 'TONYVAN', 'JARVISVAN', 'SONIC')),
  client_email text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  admin_note text DEFAULT '',
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_daily_assignments_date ON team_daily_assignments(assignment_date);
CREATE INDEX IF NOT EXISTS idx_team_daily_assignments_team_date ON team_daily_assignments(team, assignment_date);

ALTER TABLE team_daily_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all reads on team_daily_assignments"
  ON team_daily_assignments FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow insert on team_daily_assignments"
  ON team_daily_assignments FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow update on team_daily_assignments"
  ON team_daily_assignments FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete on team_daily_assignments"
  ON team_daily_assignments FOR DELETE
  TO anon
  USING (true);
