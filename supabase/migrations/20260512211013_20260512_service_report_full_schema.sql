/*
  # Expanded Service Reports Schema

  Replaces/extends the basic service_reports table with all fields
  required by the full pool service report form.

  1. Changes to service_reports
    - lead_technician (text) — selected from dropdown
    - time_finished (text) — exact time tech pressed button
    - client_paid_cash (boolean) — default false
    - liner_pull_inspection (boolean) — liner inspected toggle
    - opening_type (text) — swim ready / equipment start up
    - opening_add_ons (text[]) — multiple select
    - technician_notes (text)
    - pre_start_checklist (text[]) — steps before opening checks
    - All subsection checklist columns (text[] each)
    - photos_pool_area (text) — URL or base64
    - photos_pool_equipment (text) — URL or base64
    - photos_extra (text) — URL or base64, optional
    - sync_status (text) — for offline sync tracking
    - assignment_id (uuid) — reference back to team_daily_assignments

  2. Security
    - RLS already enabled; add anon/public policy so app (non-auth) can insert
*/

-- Add all new columns safely
DO $$
BEGIN
  -- Step 1 basic fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_reports' AND column_name='lead_technician') THEN
    ALTER TABLE service_reports ADD COLUMN lead_technician text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_reports' AND column_name='time_finished') THEN
    ALTER TABLE service_reports ADD COLUMN time_finished text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_reports' AND column_name='client_paid_cash') THEN
    ALTER TABLE service_reports ADD COLUMN client_paid_cash boolean DEFAULT false;
  END IF;
  -- Step 2 pre-start
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_reports' AND column_name='pre_start_checklist') THEN
    ALTER TABLE service_reports ADD COLUMN pre_start_checklist text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_reports' AND column_name='liner_pull_inspection') THEN
    ALTER TABLE service_reports ADD COLUMN liner_pull_inspection boolean DEFAULT false;
  END IF;
  -- Step 3 service
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_reports' AND column_name='opening_type') THEN
    ALTER TABLE service_reports ADD COLUMN opening_type text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_reports' AND column_name='opening_add_ons') THEN
    ALTER TABLE service_reports ADD COLUMN opening_add_ons text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_reports' AND column_name='technician_notes') THEN
    ALTER TABLE service_reports ADD COLUMN technician_notes text DEFAULT '';
  END IF;
  -- Subsection checklists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_reports' AND column_name='winter_plug') THEN
    ALTER TABLE service_reports ADD COLUMN winter_plug text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_reports' AND column_name='pool_reinstallation') THEN
    ALTER TABLE service_reports ADD COLUMN pool_reinstallation text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_reports' AND column_name='pool_light') THEN
    ALTER TABLE service_reports ADD COLUMN pool_light text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_reports' AND column_name='pool_pump') THEN
    ALTER TABLE service_reports ADD COLUMN pool_pump text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_reports' AND column_name='valves_plumbing') THEN
    ALTER TABLE service_reports ADD COLUMN valves_plumbing text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_reports' AND column_name='sand_filter') THEN
    ALTER TABLE service_reports ADD COLUMN sand_filter text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_reports' AND column_name='cartridge_filter') THEN
    ALTER TABLE service_reports ADD COLUMN cartridge_filter text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_reports' AND column_name='salt_system') THEN
    ALTER TABLE service_reports ADD COLUMN salt_system text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_reports' AND column_name='chlorinator') THEN
    ALTER TABLE service_reports ADD COLUMN chlorinator text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_reports' AND column_name='heater') THEN
    ALTER TABLE service_reports ADD COLUMN heater text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_reports' AND column_name='above_ground') THEN
    ALTER TABLE service_reports ADD COLUMN above_ground text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_reports' AND column_name='garden_hose') THEN
    ALTER TABLE service_reports ADD COLUMN garden_hose text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_reports' AND column_name='cement_pool') THEN
    ALTER TABLE service_reports ADD COLUMN cement_pool text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_reports' AND column_name='marketing') THEN
    ALTER TABLE service_reports ADD COLUMN marketing text[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_reports' AND column_name='final_inspection') THEN
    ALTER TABLE service_reports ADD COLUMN final_inspection text[] DEFAULT '{}';
  END IF;
  -- Photos (stored as data URLs for offline support, later replaced with storage URLs)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_reports' AND column_name='photo_pool_area') THEN
    ALTER TABLE service_reports ADD COLUMN photo_pool_area text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_reports' AND column_name='photo_pool_equipment') THEN
    ALTER TABLE service_reports ADD COLUMN photo_pool_equipment text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_reports' AND column_name='photo_extra') THEN
    ALTER TABLE service_reports ADD COLUMN photo_extra text DEFAULT '';
  END IF;
  -- Sync / offline tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_reports' AND column_name='sync_status') THEN
    ALTER TABLE service_reports ADD COLUMN sync_status text DEFAULT 'synced';
  END IF;
  -- Link back to team assignment
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='service_reports' AND column_name='assignment_id') THEN
    ALTER TABLE service_reports ADD COLUMN assignment_id uuid;
  END IF;
END $$;

-- Allow unauthenticated inserts (techs log in via PIN, not Supabase auth)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='service_reports' AND policyname='Anyone can insert service reports'
  ) THEN
    CREATE POLICY "Anyone can insert service reports"
      ON service_reports FOR INSERT TO anon, authenticated
      WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='service_reports' AND policyname='Anyone can read service reports'
  ) THEN
    CREATE POLICY "Anyone can read service reports"
      ON service_reports FOR SELECT TO anon, authenticated
      USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='service_reports' AND policyname='Anyone can update service reports'
  ) THEN
    CREATE POLICY "Anyone can update service reports"
      ON service_reports FOR UPDATE TO anon, authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;
