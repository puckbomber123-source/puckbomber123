CREATE TABLE IF NOT EXISTS commission_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by text NOT NULL DEFAULT '',
  submitted_by_name text NOT NULL DEFAULT '',
  client_name text NOT NULL DEFAULT '',
  client_email text NOT NULL DEFAULT '',
  client_address text NOT NULL DEFAULT '',
  sale_description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed boolean NOT NULL DEFAULT false,
  reviewed_by text NOT NULL DEFAULT '',
  reviewed_at timestamptz,
  admin_note text NOT NULL DEFAULT ''
);

ALTER TABLE commission_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commission_select" ON commission_entries FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "commission_insert" ON commission_entries FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "commission_update" ON commission_entries FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "commission_delete" ON commission_entries FOR DELETE TO anon, authenticated USING (true);
