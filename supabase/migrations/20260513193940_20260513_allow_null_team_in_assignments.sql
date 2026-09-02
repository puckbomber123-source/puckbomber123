/*
  # Allow NULL team in team_daily_assignments

  Unallocated bookings have no assigned team yet. Remove any NOT NULL
  constraint on the `team` column so these rows can be stored properly.

  Also adds a `status` default of 'Unallocated' (already added in the
  previous migration — this is idempotent).
*/

ALTER TABLE team_daily_assignments
  ALTER COLUMN team DROP NOT NULL;
