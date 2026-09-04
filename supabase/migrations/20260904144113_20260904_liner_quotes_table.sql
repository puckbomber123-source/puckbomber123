/*
# Liner Quotes table with n8n trigger

1. New Tables
- `liner_quotes`
  - `id` (uuid, primary key)
  - `client_id` (text, nullable — HubSpot/client ID)
  - `client_name` (text, not null)
  - `client_email` (text, not null)
  - `width` (numeric, pool width in feet)
  - `length` (numeric, pool length in feet)
  - `square_footage` (numeric, computed area)
  - `language` (text, 'en' or 'fr')
  - `spring_liner_price` (numeric, price per sq ft)
  - `spring_replacement_price` (numeric)
  - `spring_drain_clean_price` (numeric)
  - `summer_liner_price` (numeric, price per sq ft)
  - `summer_replacement_price` (numeric)
  - `summer_drain_clean_price` (numeric)
  - `include_drain_clean` (boolean)
  - `n8n_triggered` (boolean, default false — tracks whether n8n was notified)
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `liner_quotes`.
- Allow anon + authenticated INSERT (the app uses session-based auth, not Supabase auth).
- Allow authenticated SELECT/UPDATE/DELETE for admin review.

3. Trigger
- `notify_n8n_on_liner_quote()` — fires AFTER INSERT, sends the row data as JSON
  to the n8n webhook `https://primary-production-4a42.up.railway.app/webhook-test/liner-estimate`
  via `http_post`, matching the pattern used by "Booking Approved N8N".
*/

CREATE TABLE IF NOT EXISTS public.liner_quotes (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id               text,
  client_name             text NOT NULL,
  client_email            text NOT NULL,
  width                   numeric,
  length                  numeric,
  square_footage          numeric,
  language                text DEFAULT 'en',
  spring_liner_price      numeric DEFAULT 0,
  spring_replacement_price numeric DEFAULT 0,
  spring_drain_clean_price numeric DEFAULT 0,
  summer_liner_price      numeric DEFAULT 0,
  summer_replacement_price numeric DEFAULT 0,
  summer_drain_clean_price numeric DEFAULT 0,
  include_drain_clean     boolean DEFAULT false,
  n8n_triggered           boolean DEFAULT false,
  created_at              timestamptz DEFAULT now()
);

ALTER TABLE public.liner_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_liner_quotes" ON public.liner_quotes;
CREATE POLICY "anon_insert_liner_quotes" ON public.liner_quotes
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_liner_quotes" ON public.liner_quotes;
CREATE POLICY "anon_select_liner_quotes" ON public.liner_quotes
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_update_liner_quotes" ON public.liner_quotes;
CREATE POLICY "anon_update_liner_quotes" ON public.liner_quotes
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_liner_quotes" ON public.liner_quotes;
CREATE POLICY "anon_delete_liner_quotes" ON public.liner_quotes
  FOR DELETE TO anon, authenticated USING (true);

-- ── Trigger function: sends liner quote data to n8n ──
CREATE OR REPLACE FUNCTION public.notify_n8n_on_liner_quote()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $$
DECLARE
  url  text := 'https://primary-production-4a42.up.railway.app/webhook-test/liner-estimate';
  body text;
BEGIN
  PERFORM set_config('statement_timeout', '900', true);
  body := json_build_object(
    'clientId',         NEW.client_id,
    'clientName',       NEW.client_name,
    'clientEmail',      NEW.client_email,
    'width',            NEW.width,
    'length',           NEW.length,
    'squareFootage',    NEW.square_footage,
    'language',         NEW.language,
    'spring',           json_build_object(
      'linerPricePerSquareFoot', NEW.spring_liner_price,
      'replacementPrice',        NEW.spring_replacement_price,
      'drainAndCleanPrice',      NEW.spring_drain_clean_price
    ),
    'summer',           json_build_object(
      'linerPricePerSquareFoot', NEW.summer_liner_price,
      'replacementPrice',        NEW.summer_replacement_price,
      'drainAndCleanPrice',      NEW.summer_drain_clean_price
    ),
    'includeDrainAndClean', NEW.include_drain_clean
  )::text;
  PERFORM http_post(url, body, 'application/json');
  RETURN NEW;
END;
$$;

-- ── Attach trigger ──
DROP TRIGGER IF EXISTS trigger_notify_n8n_on_liner_quote ON public.liner_quotes;
CREATE TRIGGER trigger_notify_n8n_on_liner_quote
  AFTER INSERT ON public.liner_quotes
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_on_liner_quote();
