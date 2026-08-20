/*
# Add report_technicians junction table for multi-technician tracking

1. New Tables
- `report_technicians`: junction table linking service_reports to technicians
  - `id` (uuid, primary key)
  - `report_id` (uuid, FK to service_reports, ON DELETE CASCADE)
  - `technician_id` (text, references the technician's staff ID)
  - `technician_name` (text, the technician's full name at time of report)
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on report_technicians.
- Allow anon + authenticated CRUD (single-tenant app, no sign-in required).
*/

CREATE TABLE IF NOT EXISTS report_technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES service_reports(id) ON DELETE CASCADE,
  technician_id text NOT NULL,
  technician_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE report_technicians ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_report_technicians" ON report_technicians;
CREATE POLICY "anon_select_report_technicians" ON report_technicians FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_report_technicians" ON report_technicians;
CREATE POLICY "anon_insert_report_technicians" ON report_technicians FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_report_technicians" ON report_technicians;
CREATE POLICY "anon_update_report_technicians" ON report_technicians FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_report_technicians" ON report_technicians;
CREATE POLICY "anon_delete_report_technicians" ON report_technicians FOR DELETE
  TO anon, authenticated USING (true);
