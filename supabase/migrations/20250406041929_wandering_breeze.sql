/*
  # Add Scheduling and Employee Profile Tables

  1. New Tables
    - `schedules`
      - `id` (uuid, primary key)
      - `staff_id` (text, references technicians)
      - `start_time` (timestamptz)
      - `end_time` (timestamptz)
      - `title` (text)
      - `description` (text)
      - `created_by` (text, references technicians)
      - `created_at` (timestamptz)

    - `employee_profiles`
      - `id` (uuid, primary key)
      - `staff_id` (text, references technicians)
      - `current_goal` (text)
      - `hire_date` (date)
      - `emergency_contact` (text)
      - `phone` (text)
      - `address` (text)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for appropriate access control
*/

-- Create schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id text NOT NULL REFERENCES technicians(staff_id),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  title text NOT NULL,
  description text,
  created_by text NOT NULL REFERENCES technicians(staff_id),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_schedule_time CHECK (end_time > start_time)
);

-- Create employee_profiles table
CREATE TABLE IF NOT EXISTS employee_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id text NOT NULL REFERENCES technicians(staff_id) UNIQUE,
  current_goal text,
  hire_date date,
  emergency_contact text,
  phone text,
  address text,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_profiles ENABLE ROW LEVEL SECURITY;

-- Schedules policies
CREATE POLICY "Users can view their own schedule"
  ON schedules
  FOR SELECT
  TO authenticated
  USING (
    staff_id = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM technicians
      WHERE staff_id = auth.uid()::text
      AND role = 'Admin'
    )
  );

CREATE POLICY "Admins can create schedules"
  ON schedules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM technicians
      WHERE staff_id = auth.uid()::text
      AND role = 'Admin'
    )
  );

CREATE POLICY "Admins can update schedules"
  ON schedules
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM technicians
      WHERE staff_id = auth.uid()::text
      AND role = 'Admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM technicians
      WHERE staff_id = auth.uid()::text
      AND role = 'Admin'
    )
  );

CREATE POLICY "Admins can delete schedules"
  ON schedules
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM technicians
      WHERE staff_id = auth.uid()::text
      AND role = 'Admin'
    )
  );

-- Employee profiles policies
CREATE POLICY "Users can view all profiles"
  ON employee_profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON employee_profiles
  FOR UPDATE
  TO authenticated
  USING (staff_id = auth.uid()::text)
  WITH CHECK (staff_id = auth.uid()::text);

-- Function to update profile timestamp
CREATE OR REPLACE FUNCTION update_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_employee_profile_timestamp
  BEFORE UPDATE ON employee_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_timestamp();