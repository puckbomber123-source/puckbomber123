/*
# Add cold_quote to liner_quotes + cement_painting_quotes table with n8n trigger

1. Modified Tables
- `liner_quotes` — add `cold_quote` boolean column (default false).
  When true, the quote was sent proactively to a client who had not requested one.

2. New Tables
- `cement_painting_quotes`
  - `id` (uuid, primary key)
  - `client_id` (text, nullable — HubSpot/client ID)
  - `client_name` (text, not null)
  - `client_email` (text, not null)
  - `width` (numeric, pool width in feet)
  - `length` (numeric, pool length in feet)
  - `square_footage` (numeric, computed area)
  - `language` (text, 'en' or 'fr')
  - `cold_quote` (boolean, default false)
  - `include_drain_clean` (boolean, default false)
  - `drain_clean_price` (numeric, default 0)
  - `num_gallons` (integer, number of gallons of paint)
  - `epoxy_price_per_gallon` (numeric, default 264.99)
  - `waterbase_price_per_gallon` (numeric, default 160)
  - `paint_type` (text, 'epoxy' or 'waterbase')
  - `paint_total` (numeric, total paint cost)
  - `labour_price` (numeric, pool painting labour — defaults auto-calculated by pool size)
  - `grand_total` (numeric, paint_total + labour_price + drain_clean_price)
  - `n8n_triggered` (boolean, default false)
  - `created_at` (timestamptz, default now())

3. Security
- Enable RLS on `cement_painting_quotes`.
- Allow anon + authenticated CRUD (same pattern as liner_quotes).

4. Trigger
- `notify_n8n_on_cement_painting_quote()` — fires AFTER INSERT, sends row data as JSON
  to `https://primary-production-4a42.up.railway.app/webhook/cement-painting-estimate`
  via async `net.http_post` (pg_net extension, already enabled).

5. Liner trigger update
- Update `notify_n8n_on_liner_quote()` to include `coldQuote` in the JSON payload.
*/

ALTER TABLE public.liner_quotes
  ADD COLUMN IF NOT EXISTS cold_quote boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS public.cement_painting_quotes (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                 text,
  client_name               text NOT NULL,
  client_email              text NOT NULL,
  width                     numeric,
  length                    numeric,
  square_footage            numeric,
  language                  text DEFAULT 'en',
  cold_quote                boolean DEFAULT false,
  include_drain_clean       boolean DEFAULT false,
  drain_clean_price         numeric DEFAULT 0,
  num_gallons               integer DEFAULT 0,
  epoxy_price_per_gallon    numeric DEFAULT 264.99,
  waterbase_price_per_gallon numeric DEFAULT 160,
  paint_type                text DEFAULT 'epoxy',
  paint_total               numeric DEFAULT 0,
  labour_price              numeric DEFAULT 0,
  grand_total               numeric DEFAULT 0,
  n8n_triggered             boolean DEFAULT false,
  created_at                timestamptz DEFAULT now()
);

ALTER TABLE public.cement_painting_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_cement_painting_quotes" ON public.cement_painting_quotes;
CREATE POLICY "anon_insert_cement_painting_quotes" ON public.cement_painting_quotes
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_cement_painting_quotes" ON public.cement_painting_quotes;
CREATE POLICY "anon_select_cement_painting_quotes" ON public.cement_painting_quotes
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_update_cement_painting_quotes" ON public.cement_painting_quotes;
CREATE POLICY "anon_update_cement_painting_quotes" ON public.cement_painting_quotes
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_cement_painting_quotes" ON public.cement_painting_quotes;
CREATE POLICY "anon_delete_cement_painting_quotes" ON public.cement_painting_quotes
  FOR DELETE TO anon, authenticated USING (true);

-- ── Update liner trigger to include coldQuote ──
CREATE OR REPLACE FUNCTION public.notify_n8n_on_liner_quote()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public, net
AS $$
DECLARE
  url  text := 'https://primary-production-4a42.up.railway.app/webhook/liner-estimate';
  body jsonb;
BEGIN
  body := jsonb_build_object(
    'clientId',         NEW.client_id,
    'clientName',       NEW.client_name,
    'clientEmail',      NEW.client_email,
    'width',            NEW.width,
    'length',           NEW.length,
    'squareFootage',    NEW.square_footage,
    'language',         NEW.language,
    'coldQuote',        NEW.cold_quote,
    'spring',           jsonb_build_object(
      'linerPricePerSquareFoot', NEW.spring_liner_price,
      'replacementPrice',        NEW.spring_replacement_price,
      'drainAndCleanPrice',      NEW.spring_drain_clean_price
    ),
    'summer',           jsonb_build_object(
      'linerPricePerSquareFoot', NEW.summer_liner_price,
      'replacementPrice',        NEW.summer_replacement_price,
      'drainAndCleanPrice',      NEW.summer_drain_clean_price
    ),
    'includeDrainAndClean', NEW.include_drain_clean
  );

  PERFORM net.http_post(
    url := url,
    body := body::text,
    headers := jsonb_build_object('Content-Type', 'application/json')
  );

  RETURN NEW;
END;
$$;

-- ── Cement painting trigger function ──
CREATE OR REPLACE FUNCTION public.notify_n8n_on_cement_painting_quote()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public, net
AS $$
DECLARE
  url  text := 'https://primary-production-4a42.up.railway.app/webhook/cement-painting-estimate';
  body jsonb;
BEGIN
  body := jsonb_build_object(
    'clientId',            NEW.client_id,
    'clientName',          NEW.client_name,
    'clientEmail',         NEW.client_email,
    'width',               NEW.width,
    'length',              NEW.length,
    'squareFootage',       NEW.square_footage,
    'language',            NEW.language,
    'coldQuote',           NEW.cold_quote,
    'includeDrainAndClean', NEW.include_drain_clean,
    'drainCleanPrice',     NEW.drain_clean_price,
    'numGallons',          NEW.num_gallons,
    'paintType',           NEW.paint_type,
    'epoxyPricePerGallon', NEW.epoxy_price_per_gallon,
    'waterbasePricePerGallon', NEW.waterbase_price_per_gallon,
    'paintTotal',          NEW.paint_total,
    'labourPrice',         NEW.labour_price,
    'grandTotal',          NEW.grand_total
  );

  PERFORM net.http_post(
    url := url,
    body := body::text,
    headers := jsonb_build_object('Content-Type', 'application/json')
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_n8n_on_cement_painting_quote ON public.cement_painting_quotes;
CREATE TRIGGER trigger_notify_n8n_on_cement_painting_quote
  AFTER INSERT ON public.cement_painting_quotes
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_on_cement_painting_quote();
