/*
# Admin Task Management System — Table & Email Column

Creates the admin_tasks table and adds an email column to technicians.
*/

-- Add email column to technicians if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'technicians' AND column_name = 'email'
  ) THEN
    ALTER TABLE technicians ADD COLUMN email text;
  END IF;
END $$;

-- Create admin_tasks table
CREATE TABLE IF NOT EXISTS admin_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  notes text,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  due_date date,
  recurrence text NOT NULL DEFAULT 'none'
    CHECK (recurrence IN ('none','daily','weekly','monthly','yearly')),
  recurrence_day int,
  recurrence_month int,
  recurrence_weekday int,
  reminder_sent_at timestamptz,
  assigned_to text,
  created_by text NOT NULL,
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low','normal','high')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for ordering and filtering
CREATE INDEX IF NOT EXISTS idx_admin_tasks_sort ON admin_tasks (sort_order, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_completed ON admin_tasks (completed);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_assigned ON admin_tasks (assigned_to);

-- Enable RLS
ALTER TABLE admin_tasks ENABLE ROW LEVEL SECURITY;

-- CRUD policies (anon + authenticated, consistent with app's custom auth model)
DROP POLICY IF EXISTS "anon_select_admin_tasks" ON admin_tasks;
CREATE POLICY "anon_select_admin_tasks" ON admin_tasks
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_admin_tasks" ON admin_tasks;
CREATE POLICY "anon_insert_admin_tasks" ON admin_tasks
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_admin_tasks" ON admin_tasks;
CREATE POLICY "anon_update_admin_tasks" ON admin_tasks
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_admin_tasks" ON admin_tasks;
CREATE POLICY "anon_delete_admin_tasks" ON admin_tasks
  FOR DELETE TO anon, authenticated USING (true);