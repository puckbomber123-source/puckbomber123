/*
# Add closing_add_ons to bookings table

Stores pool closing add-on selections at the booking request stage so they
survive through approval → assignment creation.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'closing_add_ons'
  ) THEN
    ALTER TABLE bookings ADD COLUMN closing_add_ons text;
  END IF;
END $$;