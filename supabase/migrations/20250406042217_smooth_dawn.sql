/*
  # Fix Employee Profiles RLS Policies

  1. Security Changes
    - Enable RLS on employee_profiles table
    - Add policy for users to manage their own profiles
    - Add policy for admins to manage all profiles
    
  2. Changes
    - Ensures users can create and manage their own profiles
    - Admins retain full control over all profiles
    - Fixes security policy violations
*/

-- Enable RLS
ALTER TABLE employee_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can update their own profile" ON employee_profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON employee_profiles;

-- Create comprehensive policies
CREATE POLICY "Users can manage their own profile"
ON employee_profiles
FOR ALL
TO authenticated
USING (auth.uid()::text = staff_id)
WITH CHECK (auth.uid()::text = staff_id);

CREATE POLICY "Admins can manage all profiles"
ON employee_profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM technicians 
    WHERE technicians.staff_id = auth.uid()::text 
    AND technicians.role = 'Admin'
  )
);