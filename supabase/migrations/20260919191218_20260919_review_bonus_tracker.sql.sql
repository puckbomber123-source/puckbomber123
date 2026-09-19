CREATE TABLE review_bonus_entries (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  technician_id uuid NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  reviewer_name text,
  review_type text NOT NULL CHECK (review_type IN ('no_picture', 'with_picture')),
  amount numeric NOT NULL DEFAULT 0,
  bonus_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);

ALTER TABLE review_bonus_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_review_bonuses" ON review_bonus_entries FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "insert_review_bonuses" ON review_bonus_entries FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE POLICY "update_review_bonuses" ON review_bonus_entries FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "delete_review_bonuses" ON review_bonus_entries FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX idx_review_bonus_tech ON review_bonus_entries(technician_id);
CREATE INDEX idx_review_bonus_date ON review_bonus_entries(bonus_date);
