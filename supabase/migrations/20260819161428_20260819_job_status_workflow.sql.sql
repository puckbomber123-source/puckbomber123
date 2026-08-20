/*
# Job Status Workflow on Bookings

## Purpose
Adds a unified `job_status` column to the `bookings` table to track the full
lifecycle of every job across the portal. This gives a single, consistent
status visible from the Booking Requests, Client Search, and Invoice screens.

## Workflow Stages
1. `awaiting_booking_request` — initial state (default for new rows)
2. `booked` — booking has been approved/confirmed
3. `ready_for_invoice` — service completed, report submitted, ready to invoice
4. `invoiced` — invoice has been sent
5. `awaiting_review` — awaiting 5-star review from client
6. `complete` — job fully complete

## Changes
- New column `bookings.job_status` (text, NOT NULL, default 'awaiting_booking_request')
- Backfill: existing approved bookings → 'booked'; existing pending/pre_book → 'awaiting_booking_request'
- CHECK constraint to enforce valid stage values
- Index on job_status for filtering

## Security
- No RLS policy changes (bookings already has policies).
- No new tables.
*/

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS job_status text NOT NULL DEFAULT 'awaiting_booking_request';

-- Backfill existing rows based on current booking status
UPDATE bookings SET job_status = 'booked' WHERE status = 'approved' AND job_status = 'awaiting_booking_request';

-- Add check constraint for valid workflow stages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_job_status_check'
  ) THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_job_status_check
      CHECK (job_status IN (
        'awaiting_booking_request',
        'booked',
        'ready_for_invoice',
        'invoiced',
        'awaiting_review',
        'complete'
      ));
  END IF;
END $$;

-- Index for filtering by job status
CREATE INDEX IF NOT EXISTS idx_bookings_job_status ON bookings (job_status);
