/*
# Resendclosing: insert into bookings as hidden to trigger n8n book-request

The "Booking with N8N" trigger fires AFTER INSERT on `bookings` and sends to
`/webhook/book-request`. To trigger it without the row appearing in the app,
we insert with status = 'hidden' — a status no screen queries for.

No schema changes needed — `status` is a free-text column.
This migration is documentation-only; the logic lives in the frontend.
*/
SELECT 1;
