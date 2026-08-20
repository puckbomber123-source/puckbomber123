ALTER TABLE n8n_booking_queue
  ADD COLUMN IF NOT EXISTS job_status text DEFAULT 'awaiting_booking_request';