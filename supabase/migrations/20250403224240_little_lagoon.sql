/*
  # Fix technicians table policies for text staff_id

  1. Changes
    - Update RLS policies to use staff_id instead of id
    - Fix policy conditions to work with text type staff_id
    - Keep existing RLS policies but modify the conditions

  2. Security
    - Maintain same security model where only admins can manage technicians
    - All technicians can still view their own record
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can read all technicians" ON technicians;
DROP POLICY IF EXISTS "Admins can insert technicians" ON technicians;
DROP POLICY IF EXISTS "Admins can update technicians" ON technicians;
DROP POLICY IF EXISTS "Admins can delete technicians" ON technicians;

-- Policy for admins to read all technicians
CREATE POLICY "Admins can read all technicians"
ON technicians
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM technicians 
    WHERE staff_id = auth.uid()::text 
    AND role = 'Admin'
  )
  OR staff_id = auth.uid()::text
);

-- Policy for admins to insert new technicians
CREATE POLICY "Admins can insert technicians"
ON technicians
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM technicians 
    WHERE staff_id = auth.uid()::text 
    AND role = 'Admin'
  )
);

-- Policy for admins to update technicians
CREATE POLICY "Admins can update technicians"
ON technicians
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

-- Policy for admins to delete technicians
CREATE POLICY "Admins can delete technicians"
ON technicians
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM technicians 
    WHERE staff_id = auth.uid()::text 
    AND role = 'Admin'
  )
);