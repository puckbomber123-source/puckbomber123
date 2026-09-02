/*
  # Daily Team Member Exclusions

  Allows admins to remove a preset member from a specific day without
  touching the permanent preset. A row here means that staff member is
  excluded from their preset team on that date only.

  ## New Table

  ### `daily_team_member_exclusions`
  - `id` (uuid, primary key)
  - `assignment_date` (date)
  - `team` (text)
  - `staff_id` (text)
  - `created_at` (timestamptz)

  Unique on (assignment_date, team, staff_id).
*/

CREATE TABLE IF NOT EXISTS daily_team_member_exclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_date date NOT NULL,
  team text NOT NULL CHECK (team IN ('PRINCESSDAVID', 'TONYVAN', 'JARVISVAN', 'SONIC')),
  staff_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (assignment_date, team, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_exclusions_date ON daily_team_member_exclusions(assignment_date);

ALTER TABLE daily_team_member_exclusions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow reads on daily_team_member_exclusions"
  ON daily_team_member_exclusions FOR SELECT TO anon USING (true);

CREATE POLICY "Allow insert on daily_team_member_exclusions"
  ON daily_team_member_exclusions FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow delete on daily_team_member_exclusions"
  ON daily_team_member_exclusions FOR DELETE TO anon USING (true);
