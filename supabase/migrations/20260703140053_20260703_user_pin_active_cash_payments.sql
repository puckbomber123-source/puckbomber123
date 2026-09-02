-- Add is_active column to technicians (default true)
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Add balance_due to bookings for liner inground 1st visit
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS balance_due numeric(10,2);

-- Cash payments tracking table
CREATE TABLE IF NOT EXISTS cash_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  client_email text,
  service_type text NOT NULL,
  amount_owed numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  assignment_date date,
  recorded_by text,
  paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cash_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_cash_payments" ON cash_payments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_cash_payments" ON cash_payments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_cash_payments" ON cash_payments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_cash_payments" ON cash_payments FOR DELETE TO anon, authenticated USING (true);
