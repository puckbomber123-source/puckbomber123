/*
  # Daily Team Member Assignments

  ## Purpose
  Allow admins to override per-day team membership in addition to the permanent
  team_members table. This lets a member be moved between teams on a specific day,
  or added to multiple teams for a single day.

  ## New Table

  ### `daily_team_member_assignments`
  Per-day, per-team technician allocation. Overrides / supplements the permanent
  team_members table when present for that date.

  - `id` (uuid, primary key)
  - `assignment_date` (date) - the specific day
  - `team` (text) - one of the 4 teams
  - `staff_id` (text) - technician staff_id
  - `created_at` (timestamptz)

  Unique constraint on (assignment_date, team, staff_id) prevents duplicates.

  ## Security
  RLS enabled, permissive anon policies matching the rest of the app.
*/

CREATE TABLE IF NOT EXISTS daily_team_member_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_date date NOT NULL,
  team text NOT NULL CHECK (team IN ('PRINCESSDAVID', 'TONYVAN', 'JARVISVAN', 'SONIC')),
  staff_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (assignment_date, team, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_team_members_date ON daily_team_member_assignments(assignment_date);
CREATE INDEX IF NOT EXISTS idx_daily_team_members_staff ON daily_team_member_assignments(staff_id);

ALTER TABLE daily_team_member_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all reads on daily_team_member_assignments"
  ON daily_team_member_assignments FOR SELECT TO anon USING (true);

CREATE POLICY "Allow insert on daily_team_member_assignments"
  ON daily_team_member_assignments FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow delete on daily_team_member_assignments"
  ON daily_team_member_assignments FOR DELETE TO anon USING (true);
