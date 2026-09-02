ALTER TABLE bookings DROP CONSTRAINT bookings_job_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_job_status_check
  CHECK (job_status = ANY (ARRAY[
    'awaiting_booking_request'::text,
    'booked'::text,
    'ready_for_invoice'::text,
    'invoiced'::text,
    'awaiting_review'::text,
    'complete'::text,
    'cancelled'::text
  ]));