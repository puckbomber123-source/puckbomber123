/*
# Add closing_add_ons column to n8n_booking_queue

1. Modified Tables
- `n8n_booking_queue`
  - Added `closing_add_ons` (text, nullable) column.

2. Why
- The `bookings` table has a `closing_add_ons` column, and when a booking is
  approved the entire booking row is upserted into `n8n_booking_queue` (via
  `onConflict: 'id'`). Because `n8n_booking_queue` lacked this column,
  PostgREST rejected the upsert with "Could not find the 'closing_add_ons'
  column of 'n8n_booking_queue' in the schema cache". Adding the column
  lets the upsert succeed and keeps the queue row in sync with the booking.

3. Security
- No RLS or policy changes — `n8n_booking_queue` already has its policies.
*/

ALTER TABLE n8n_booking_queue
  ADD COLUMN IF NOT EXISTS closing_add_ons text;
