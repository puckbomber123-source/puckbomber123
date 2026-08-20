/*
  # Booking Request Workflow

  ## Summary
  Transforms the bookings table from a direct-booking model into a request/approval workflow.
  Booking requests are submitted by staff and must be reviewed by an admin before they are
  converted into daily assignments and trigger external notifications (N8N/Google Calendar).

  ## Changes to `bookings` table
  - Add `status` (text) — 'pending' | 'approved' | 'rejected', default 'pending'
  - Add `requested_by` (text) — staff_id of who submitted the request
  - Add `client_name` (text) — denormalized display name
  - Add `rejection_reason` (text) — admin's note when rejecting
  - Add `approved_by` (text) — staff_id of approving admin
  - Add `approved_at` (timestamptz) — when it was approved
  - Add `assignment_id` (uuid, nullable) — FK to team_daily_assignments once approved
  - Add `n8n_triggered` (boolean) — whether N8N webhook was called
  - Add `updated_at` (timestamptz)
  - All new columns use safe IF NOT EXISTS guards

  ## Security
  - RLS already enabled on bookings (from original migration)
  - Adds anon INSERT / SELECT / UPDATE policies if not already present
*/

-- Add new columns with IF NOT EXISTS guards
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='status') THEN
    ALTER TABLE bookings ADD COLUMN status text NOT NULL DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='requested_by') THEN
    ALTER TABLE bookings ADD COLUMN requested_by text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='client_name') THEN
    ALTER TABLE bookings ADD COLUMN client_name text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='rejection_reason') THEN
    ALTER TABLE bookings ADD COLUMN rejection_reason text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='approved_by') THEN
    ALTER TABLE bookings ADD COLUMN approved_by text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='approved_at') THEN
    ALTER TABLE bookings ADD COLUMN approved_at timestamptz;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='assignment_id') THEN
    ALTER TABLE bookings ADD COLUMN assignment_id uuid;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='n8n_triggered') THEN
    ALTER TABLE bookings ADD COLUMN n8n_triggered boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='updated_at') THEN
    ALTER TABLE bookings ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

-- Index for fast status-based lookups in the admin queue
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings(status);
CREATE INDEX IF NOT EXISTS bookings_event_date_idx ON bookings(event_date);

-- Ensure RLS is enabled
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Add policies if they don't already exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bookings' AND policyname='Allow anon select on bookings') THEN
    EXECUTE 'CREATE POLICY "Allow anon select on bookings" ON bookings FOR SELECT TO anon USING (true)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bookings' AND policyname='Allow anon insert on bookings') THEN
    EXECUTE 'CREATE POLICY "Allow anon insert on bookings" ON bookings FOR INSERT TO anon WITH CHECK (true)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bookings' AND policyname='Allow anon update on bookings') THEN
    EXECUTE 'CREATE POLICY "Allow anon update on bookings" ON bookings FOR UPDATE TO anon USING (true) WITH CHECK (true)';
  END IF;
END $$;
