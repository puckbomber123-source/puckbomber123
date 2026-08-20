/*
# Admin Task Management System

Adds a premium TickTick-style task management system for admins, including recurring to-dos,
completion tracking, assignment to users, and reminder emails.

## 1. Schema Changes

### Modified: `technicians` table
- Added `email` (text, nullable) — admin's email address used for task reminder notifications.
  Only required for admins but stored for any technician who wants reminders.

### New Table: `admin_tasks`
Stores to-do items visible to all admins.
- `id` (uuid, PK)
- `title` (text, not null) — the task title, e.g. "Pay off RBC Mastercard"
- `notes` (text, nullable) — optional longer description / instructions
- `completed` (boolean, default false) — checked-off state
- `completed_at` (timestamptz, nullable) — when the task was checked off
- `due_date` (date, nullable) — the due date (e.g. 2026-07-31)
- `recurrence` (text, nullable) — one of: 'none', 'daily', 'weekly', 'monthly', 'yearly'
- `recurrence_day` (int, nullable) — day-of-month for monthly/yearly recurrence (e.g. 31)
- `recurrence_month` (int, nullable) — month (1-12) for yearly recurrence
- `recurrence_weekday` (int, nullable) — weekday (0=Sun..6=Sat) for weekly recurrence
- `reminder_sent_at` (timestamptz, nullable) — last time a reminder email was sent for the current cycle
- `assigned_to` (text, nullable) — staff_id of the technician assigned to this task (FK to technicians.staff_id)
- `created_by` (text, not null) — staff_id of the admin who created the task
- `priority` (text, default 'normal') — 'low' | 'normal' | 'high'
- `sort_order` (int, default 0) — manual ordering
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

## 2. Security (RLS)
- Enable RLS on `admin_tasks`.
- CRUD policies scoped to `anon, authenticated` (app uses custom session auth via sessionStorage,
  not Supabase auth — the frontend talks with the anon key). All admin-only enforcement is done
  in the frontend route guard, consistent with the rest of this app.

## 3. Important Notes
1. The app does NOT use Supabase auth — it uses a custom PIN-based login stored in sessionStorage.
   Therefore RLS uses `TO anon, authenticated` (same pattern as all other tables in this project).
2. Frontend admin route guards (AdminRoute in App.tsx) prevent non-admins from accessing the UI.
3. Recurring tasks auto-advance their due_date when checked off — handled in frontend logic.
4. pg_cron is not available, so reminders are sent on-demand via a "Send Reminder" button +
   auto-send on page load for tasks due within 3 days that haven't had a reminder sent.
*/