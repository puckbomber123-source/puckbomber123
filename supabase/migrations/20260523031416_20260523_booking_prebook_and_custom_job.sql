/*
  # Booking Pre-Book & Custom Job Support

  ## Summary
  Extends the bookings workflow with two new features:

  1. **Pre-book list** — Pool Openings and Pool Closings can be submitted as
     "pre-book" entries (status = 'pre_book'). These sit in a waiting list until
     an admin assigns them an actual service date, at which point they become a
     normal 'pending' booking and flow through the existing approval workflow.

  2. **Custom Job** — A new service type that bypasses admin approval entirely.
     When submitted, it is immediately inserted as 'approved' with a daily
     assignment row created in the same operation. Techs must supply a
     `custom_job_name` describing the work.

  3. **Auto-approve** — Liner Measurement and Liner Replacement bookings are also
     auto-approved on insert (no admin queue step required).

  ## New / Changed Columns on `bookings`
  - `custom_job_name` (text, default '') — free-text description for Custom Job type
  - `pre_book_date` (date, nullable) — the preferred season date noted at pre-book time
     (informational; admin sets `event_date` when converting to pending)

  ## Status Values (extended)
  - 'pending'   — awaiting admin approval (existing)
  - 'approved'  — approved, assignment created (existing)
  - 'rejected'  — rejected by admin (existing)
  - 'pre_book'  — on the pre-book waiting list (NEW)

  ## Indexes
  - Index on bookings(status) already exists; covers 'pre_book' queries automatically.

  ## Security
  - RLS already enabled on bookings; existing anon policies cover new status values.
*/

-- Add custom_job_name column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'custom_job_name'
  ) THEN
    ALTER TABLE bookings ADD COLUMN custom_job_name text NOT NULL DEFAULT '';
  END IF;
END $$;

-- Add pre_book_date column (preferred season date, informational)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'pre_book_date'
  ) THEN
    ALTER TABLE bookings ADD COLUMN pre_book_date date;
  END IF;
END $$;
