/*
# Add resend_segment_id to email_campaigns

1. Modified Tables
   - `email_campaigns` — adds `resend_segment_id` (text, nullable) to store
     the Resend Segment ID created for each campaign broadcast.

2. Security
   - No RLS changes. Existing policies cover the new column.
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'email_campaigns' AND column_name = 'resend_segment_id'
  ) THEN
    ALTER TABLE email_campaigns ADD COLUMN resend_segment_id text;
  END IF;
END $$;
