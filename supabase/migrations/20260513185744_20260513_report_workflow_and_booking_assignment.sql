/*
  # Report Workflow + Booking-to-Assignment Link

  ## Summary
  Completes the relational report workflow so every daily assignment can
  have exactly one linked service report, with duplicate prevention and
  clear completed status.

  Also wires bookings to automatically produce daily_assignment rows so
  nothing falls through the cracks.

  ## Changes

  ### service_reports
  - Add `completed_time` (timestamptz) — technician-editable finish time
  - Add `created_from_booking` (boolean) — tracks origin
  - Add UNIQUE constraint on assignment_id to prevent duplicate reports
    per assignment (Admin can bypass by setting assignment_id = null)

  ### team_daily_assignments
  - Already has: linked_report_id, report_completed, client_email, service_type, assignment_date
  - Add `status` (text) — 'Unallocated' | 'Assigned' | 'Completed' | 'Cancelled'
  - Add `assigned_technician_id` (text) — staff_id of assigned tech
  - Add `created_from_booking` (boolean) — tracks origin
  - Add `client_id` (uuid) — direct FK to clients for faster lookup

  ### bookings
  - No schema change needed; BookClient code will insert into team_daily_assignments
    after inserting into bookings.

  ### RLS
  - Ensure team_daily_assignments allows anon SELECT (techs need to read their assignments)
*/

-- service_reports: add completed_time
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_reports' AND column_name = 'completed_time'
  ) THEN
    ALTER TABLE service_reports ADD COLUMN completed_time timestamptz;
  END IF;
END $$;

-- service_reports: unique constraint on assignment_id (nullable → only non-null are unique)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'service_reports' AND indexname = 'service_reports_assignment_id_unique'
  ) THEN
    CREATE UNIQUE INDEX service_reports_assignment_id_unique
      ON service_reports (assignment_id)
      WHERE assignment_id IS NOT NULL;
  END IF;
END $$;

-- team_daily_assignments: status column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_daily_assignments' AND column_name = 'status'
  ) THEN
    ALTER TABLE team_daily_assignments ADD COLUMN status text DEFAULT 'Unallocated';
  END IF;
END $$;

-- team_daily_assignments: assigned_technician_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_daily_assignments' AND column_name = 'assigned_technician_id'
  ) THEN
    ALTER TABLE team_daily_assignments ADD COLUMN assigned_technician_id text DEFAULT NULL;
  END IF;
END $$;

-- team_daily_assignments: created_from_booking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_daily_assignments' AND column_name = 'created_from_booking'
  ) THEN
    ALTER TABLE team_daily_assignments ADD COLUMN created_from_booking boolean DEFAULT false;
  END IF;
END $$;

-- team_daily_assignments: client_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_daily_assignments' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE team_daily_assignments ADD COLUMN client_id uuid DEFAULT NULL;
  END IF;
END $$;

-- RLS: anon SELECT on team_daily_assignments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'team_daily_assignments' AND policyname = 'Anon can read assignments'
  ) THEN
    CREATE POLICY "Anon can read assignments"
      ON team_daily_assignments FOR SELECT TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- RLS: anon INSERT on team_daily_assignments (needed for booking→assignment creation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'team_daily_assignments' AND policyname = 'Anon can insert assignments'
  ) THEN
    CREATE POLICY "Anon can insert assignments"
      ON team_daily_assignments FOR INSERT TO anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;
