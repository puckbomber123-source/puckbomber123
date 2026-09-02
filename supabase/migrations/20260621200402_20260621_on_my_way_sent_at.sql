ALTER TABLE team_daily_assignments 
  ADD COLUMN IF NOT EXISTS on_my_way_sent_at timestamptz;
