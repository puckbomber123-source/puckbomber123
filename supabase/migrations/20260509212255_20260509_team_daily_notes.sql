/*
  # Team Daily Notes

  A single admin-written note per team per day, visible to all users.

  ## New Table

  ### `team_daily_notes`
  - `id` (uuid, primary key)
  - `assignment_date` (date) - the day this note applies to
  - `team` (text) - one of the 4 teams
  - `note` (text) - the note content
  - `updated_at` (timestamptz)
  - `created_at` (timestamptz)

  Unique on (assignment_date, team) — one note per team per day.
*/

CREATE TABLE IF NOT EXISTS team_daily_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_date date NOT NULL,
  team text NOT NULL CHECK (team IN ('PRINCESSDAVID', 'TONYVAN', 'JARVISVAN', 'SONIC')),
  note text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE (assignment_date, team)
);

CREATE INDEX IF NOT EXISTS idx_team_daily_notes_date ON team_daily_notes(assignment_date);

ALTER TABLE team_daily_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow reads on team_daily_notes"
  ON team_daily_notes FOR SELECT TO anon USING (true);

CREATE POLICY "Allow insert on team_daily_notes"
  ON team_daily_notes FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow update on team_daily_notes"
  ON team_daily_notes FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete on team_daily_notes"
  ON team_daily_notes FOR DELETE TO anon USING (true);
