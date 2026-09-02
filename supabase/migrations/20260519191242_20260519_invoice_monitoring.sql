/*
  # Invoice Monitoring Table

  ## Purpose
  Track invoice status for each completed service assignment so admin staff can monitor
  whether clients have been invoiced after a service is completed.

  ## New Tables
  - `invoices`
    - `id` (uuid, primary key)
    - `assignment_id` (uuid, FK to team_daily_assignments) - links invoice to a specific job
    - `client_id` (uuid, nullable FK to clients)
    - `client_email` (text) - denormalized for quick display
    - `client_name` (text) - denormalized for quick display
    - `service_date` (date) - when the service occurred
    - `service_type` (text) - type of service performed
    - `team` (text) - which team performed the service
    - `amount` (numeric, nullable) - invoice dollar amount (optional)
    - `invoiced` (boolean, default false) - whether invoice was sent
    - `invoiced_at` (timestamptz, nullable) - when it was invoiced
    - `invoiced_by` (text, nullable) - staff member who marked invoiced
    - `invoice_number` (text, nullable) - external invoice reference number
    - `notes` (text, default '') - any admin notes about invoicing
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Anon can SELECT, INSERT, UPDATE (PIN-auth handled at application level)

  ## Notes
  - Invoices are created automatically when an assignment is marked as completed (report_completed = true)
  - One invoice per assignment (UNIQUE on assignment_id)
  - Supports bulk operations for admin efficiency
*/

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL,
  client_id uuid,
  client_email text NOT NULL DEFAULT '',
  client_name text NOT NULL DEFAULT '',
  service_date date NOT NULL,
  service_type text NOT NULL DEFAULT '',
  team text NOT NULL DEFAULT '',
  amount numeric(10,2),
  invoiced boolean NOT NULL DEFAULT false,
  invoiced_at timestamptz,
  invoiced_by text,
  invoice_number text,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure one invoice record per assignment
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_assignment_id_key'
  ) THEN
    ALTER TABLE invoices ADD CONSTRAINT invoices_assignment_id_key UNIQUE (assignment_id);
  END IF;
END $$;

-- Index for fast lookups by date and status
CREATE INDEX IF NOT EXISTS invoices_service_date_idx ON invoices(service_date);
CREATE INDEX IF NOT EXISTS invoices_invoiced_idx ON invoices(invoiced);
CREATE INDEX IF NOT EXISTS invoices_client_email_idx ON invoices(client_email);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select on invoices"
  ON invoices FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert on invoices"
  ON invoices FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update on invoices"
  ON invoices FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
