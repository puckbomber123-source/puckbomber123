/*
  # Service Reports Schema

  1. New Tables
    - `service_reports`
      - `id` (uuid, primary key)
      - `technician` (uuid, references technicians.id)
      - `client_email` (text)
      - `service_date` (timestamp with time zone)
      - `service_type` (text)
      - `opening_type` (text, nullable)
      - `checklist_items` (text[], stores completed checklist items)
      - `client_followup` (text[], stores completed followup items)
      - `service_notes` (text)
      - `photos` (text[], stores photo URLs)
      - `created_at` (timestamp with time zone)

  2. Security
    - Enable RLS on service_reports table
    - Add policies for technicians to read/write their own reports
*/

CREATE TABLE IF NOT EXISTS service_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician uuid REFERENCES technicians(id),
  client_email text NOT NULL,
  service_date timestamptz NOT NULL,
  service_type text NOT NULL,
  opening_type text,
  checklist_items text[],
  client_followup text[],
  service_notes text,
  photos text[],
  created_at timestamptz DEFAULT now()
);

ALTER TABLE service_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Technicians can read their own reports"
  ON service_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = technician);

CREATE POLICY "Technicians can insert their own reports"
  ON service_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = technician);