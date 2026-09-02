/*
# Rename seasonal schedule service type: Equipment Startup -> Pool Opening 1st Visit

1. Changes
- Drops the old CHECK constraint on seasonal_city_schedules.service_type that only allowed 'Pool Closing' and 'Equipment Startup'.
- Adds a new CHECK constraint allowing 'Pool Closing' and 'Pool Opening 1st Visit'.
- Migrates any existing rows with service_type = 'Equipment Startup' to 'Pool Opening 1st Visit'.

2. Security
- No RLS or policy changes. Existing shared CRUD policies remain in effect.

3. Notes
- The unique constraint on (service_type, schedule_date) is preserved.
- No data is lost; existing Equipment Startup schedules become Pool Opening 1st Visit schedules.
*/

ALTER TABLE seasonal_city_schedules DROP CONSTRAINT IF EXISTS seasonal_city_schedules_service_type_check;

UPDATE seasonal_city_schedules
   SET service_type = 'Pool Opening 1st Visit'
 WHERE service_type = 'Equipment Startup';

ALTER TABLE seasonal_city_schedules
  ADD CONSTRAINT seasonal_city_schedules_service_type_check
  CHECK (service_type IN ('Pool Closing', 'Pool Opening 1st Visit'));