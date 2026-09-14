CREATE OR REPLACE VIEW confirmed_closing_emails AS
SELECT DISTINCT
  b.email,
  b.client_name,
  b.service_type,
  b.event_date,
  b.status,
  b.job_status
FROM bookings b
WHERE b.service_type ILIKE '%closing%'
  AND b.status = 'approved'
  AND b.job_status NOT IN ('cancelled', 'hidden')
  AND b.email IS NOT NULL
  AND b.email != '';

ALTER VIEW confirmed_closing_emails OWNER TO postgres;

GRANT SELECT ON confirmed_closing_emails TO anon, authenticated;

COMMENT ON VIEW confirmed_closing_emails IS
  'Distinct client emails with a confirmed (approved, non-cancelled, non-hidden) pool closing booking. Used by n8n to suppress closing-reminder emails for clients who already have a closing booked.';
