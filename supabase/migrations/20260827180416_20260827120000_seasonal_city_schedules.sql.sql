/*
# Add seasonal city scheduling for booking dates

1. New Tables
- `seasonal_city_schedules` stores the cities recommended for Pool Closing and Equipment Startup dates.
- `id` uniquely identifies each schedule row.
- `service_type` identifies Pool Closing or Equipment Startup.
- `schedule_date` is the service date shown in New Booking.
- `cities` stores the admin-selected city names.
- `created_at` and `updated_at` track schedule changes.

2. Security
- Row level security is enabled.
- This single-tenant internal app allows the anon and authenticated client roles to read and manage shared schedule data through separate CRUD policies.

3. Notes
- A date can have one schedule per service type.
- Existing booking and assignment data is not modified.
*/

CREATE TABLE IF NOT EXISTS seasonal_city_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type text NOT NULL CHECK (service_type IN ('Pool Closing', 'Equipment Startup')),
  schedule_date date NOT NULL,
  cities text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_type, schedule_date)
);

CREATE INDEX IF NOT EXISTS seasonal_city_schedules_date_idx
  ON seasonal_city_schedules (schedule_date);

ALTER TABLE seasonal_city_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shared_select_seasonal_city_schedules" ON seasonal_city_schedules;
CREATE POLICY "shared_select_seasonal_city_schedules"
  ON seasonal_city_schedules FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "shared_insert_seasonal_city_schedules" ON seasonal_city_schedules;
CREATE POLICY "shared_insert_seasonal_city_schedules"
  ON seasonal_city_schedules FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "shared_update_seasonal_city_schedules" ON seasonal_city_schedules;
CREATE POLICY "shared_update_seasonal_city_schedules"
  ON seasonal_city_schedules FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "shared_delete_seasonal_city_schedules" ON seasonal_city_schedules;
CREATE POLICY "shared_delete_seasonal_city_schedules"
  ON seasonal_city_schedules FOR DELETE
  TO anon, authenticated USING (true);