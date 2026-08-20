/*
# Add biweekly recurrence option to admin_tasks

Updates the recurrence CHECK constraint to allow 'biweekly' as a value.
Biweekly tasks repeat every 2 weeks on a chosen weekday (e.g. every other Sunday).
The recurrence_weekday column is reused to store the target weekday.
*/

ALTER TABLE admin_tasks DROP CONSTRAINT IF EXISTS admin_tasks_recurrence_check;

ALTER TABLE admin_tasks ADD CONSTRAINT admin_tasks_recurrence_check
  CHECK (recurrence IN ('none','daily','weekly','biweekly','monthly','yearly'));