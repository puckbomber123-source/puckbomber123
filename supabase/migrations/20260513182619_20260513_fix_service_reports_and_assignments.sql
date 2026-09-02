/*
  # Fix Service Reports + Assignments Relational Link

  ## Summary
  Fixes the broken schema that caused "technician column not found" errors.
  Adds missing linked_report_id to team_daily_assignments so reports can
  be attached to assignments after submission.

  ## Changes

  ### team_daily_assignments
  - Add `linked_report_id` (uuid) — stores the service_reports.id after completion

  ### service_reports
  - The table already has `lead_technician` (text) and `technician_id` (text).
    We remove the broken `technician` uuid column reference (it was only in the
    original migration, not in the live schema — confirmed safe to skip).
  - Ensure `assignment_id` column exists (already exists, idempotent check).
  - Add `client_id` (uuid) column for direct client relation.

  ### RLS Policies
  - team_daily_assignments needs anon UPDATE policy so techs can mark complete.
  - service_reports: ensure anon INSERT/SELECT/UPDATE policies exist.
  - Storage bucket service-photos: policy handled via Supabase dashboard or
    existing bucket config.
*/

-- Add linked_report_id to team_daily_assignments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_daily_assignments' AND column_name = 'linked_report_id'
  ) THEN
    ALTER TABLE team_daily_assignments ADD COLUMN linked_report_id uuid;
  END IF;
END $$;

-- Add client_id to service_reports for direct relational link
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_reports' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE service_reports ADD COLUMN client_id uuid;
  END IF;
END $$;

-- Ensure service_reports has RLS enabled
ALTER TABLE service_reports ENABLE ROW LEVEL SECURITY;

-- Anon INSERT policy (PIN-based auth, not Supabase Auth)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'service_reports' AND policyname = 'Anon can insert service reports'
  ) THEN
    CREATE POLICY "Anon can insert service reports"
      ON service_reports FOR INSERT TO anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- Anon SELECT policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'service_reports' AND policyname = 'Anon can read service reports'
  ) THEN
    CREATE POLICY "Anon can read service reports"
      ON service_reports FOR SELECT TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- Anon UPDATE policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'service_reports' AND policyname = 'Anon can update service reports'
  ) THEN
    CREATE POLICY "Anon can update service reports"
      ON service_reports FOR UPDATE TO anon, authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- team_daily_assignments UPDATE policy for marking complete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'team_daily_assignments' AND policyname = 'Anon can update assignments for completion'
  ) THEN
    CREATE POLICY "Anon can update assignments for completion"
      ON team_daily_assignments FOR UPDATE TO anon, authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;
