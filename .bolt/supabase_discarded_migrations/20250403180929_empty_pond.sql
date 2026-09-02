/*
  # Create clients table

  1. New Tables
    - `clients`
      - `id` (uuid, primary key)
      - `first_name` (text)
      - `last_name` (text)
      - `email` (text, unique)
      - `phone` (text)
      - `pool_type` (text)
      - `address` (text)
      - `city` (text)
      - `zip` (text)
      - `created_at` (timestamp with time zone)

  2. Security
    - Enable RLS on `clients` table
    - Add policy for authenticated users to read all clients
*/

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  pool_type text,
  address text,
  city text,
  zip text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read all clients"
  ON clients
  FOR SELECT
  TO authenticated
  USING (true);