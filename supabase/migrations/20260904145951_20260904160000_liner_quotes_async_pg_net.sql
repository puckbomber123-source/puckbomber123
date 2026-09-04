/*
# Switch liner quote n8n trigger to async pg_net

1. Extension
- Enable `pg_net` (provides `net.http_post` for asynchronous HTTP requests).

2. Trigger function changes
- Replace `notify_n8n_on_liner_quote()` so it uses `net.http_post` (async, fire-and-forget)
  instead of the synchronous `http_post`.
- Remove the `set_config('statement_timeout', '900', ...)` call that was causing premature
  timeouts when the synchronous HTTP call exceeded 900ms.
- Update the webhook URL from the temporary test endpoint
  `https://primary-production-4a42.up.railway.app/webhook-test/liner-estimate`
  to the production endpoint
  `https://primary-production-4a42.up.railway.app/webhook/liner-estimate`.
- The JSON payload shape stays the same (clientId, clientName, clientEmail, width, length,
  squareFootage, language, spring{...}, summer{...}, includeDrainAndClean).

3. Trigger
- Drop and recreate `trigger_notify_n8n_on_liner_quote` on `liner_quotes` AFTER INSERT.

4. Security
- No RLS or policy changes — the existing policies on `liner_quotes` remain unchanged.
*/

CREATE EXTENSION IF NOT EXISTS pg_net;

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

DROP TRIGGER IF EXISTS trigger_notify_n8n_on_liner_quote ON public.liner_quotes;
CREATE TRIGGER trigger_notify_n8n_on_liner_quote
  AFTER INSERT ON public.liner_quotes
  FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_on_liner_quote();
