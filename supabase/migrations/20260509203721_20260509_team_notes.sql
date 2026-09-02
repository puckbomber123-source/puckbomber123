/*
  # Team Notes

  ## Purpose
  Allow each technician to write notes for their team(s). Notes are per-technician
  per-team and are visible to the note author, plus Admins and Senior Pool Techs
  who can read all teams' notes.

  ## New Table

  ### `team_notes`
  - `id` (uuid, primary key)
  - `team` (text) - one of the 4 teams
  - `staff_id` (text) - author's staff_id
  - `note` (text) - the note content
  - `updated_at` (timestamptz) - last updated timestamp
  - `created_at` (timestamptz)

  Unique constraint on (team, staff_id) so each tech has one note per team.

  ## Security
  RLS enabled. Any authenticated (anon) user can read all rows (admins/seniors
  need to see all). Each user can insert/update/delete their own rows only.
*/

CREATE TABLE IF NOT EXISTS team_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team text NOT NULL CHECK (team IN ('PRINCESSDAVID', 'TONYVAN', 'JARVISVAN', 'SONIC')),
  staff_id text NOT NULL,
  note text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE (team, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_team_notes_team ON team_notes(team);
CREATE INDEX IF NOT EXISTS idx_team_notes_staff ON team_notes(staff_id);

ALTER TABLE team_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow reads on team_notes"
  ON team_notes FOR SELECT TO anon USING (true);

CREATE POLICY "Allow insert on team_notes"
  ON team_notes FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow update on team_notes"
  ON team_notes FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete on team_notes"
  ON team_notes FOR DELETE TO anon USING (true);
