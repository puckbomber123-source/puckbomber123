ALTER TABLE bookings DROP CONSTRAINT bookings_job_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_job_status_check
  CHECK (job_status = ANY (ARRAY['awaiting_booking_request', 'booked', 'ready_for_invoice', 'invoiced', 'awaiting_review', 'complete', 'cancelled', 'hidden']));
