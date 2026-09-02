-- Add is_active column to technicians
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Cash invoices table
CREATE TABLE IF NOT EXISTS cash_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_email text NOT NULL,
  client_name text NOT NULL DEFAULT '',
  assignment_id uuid REFERENCES team_daily_assignments(id) ON DELETE SET NULL,
  service_date date NOT NULL,
  notes text NOT NULL DEFAULT '',
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  collected boolean NOT NULL DEFAULT false,
  collected_by text NOT NULL DEFAULT '',
  collected_at timestamptz,
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cash_invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES cash_invoices(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  line_total numeric(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  sort_order int NOT NULL DEFAULT 0
);

ALTER TABLE cash_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_invoice_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cash_invoices_select" ON cash_invoices FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "cash_invoices_insert" ON cash_invoices FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "cash_invoices_update" ON cash_invoices FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cash_invoices_delete" ON cash_invoices FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "cash_invoice_lines_select" ON cash_invoice_lines FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "cash_invoice_lines_insert" ON cash_invoice_lines FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "cash_invoice_lines_update" ON cash_invoice_lines FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cash_invoice_lines_delete" ON cash_invoice_lines FOR DELETE TO anon, authenticated USING (true);
