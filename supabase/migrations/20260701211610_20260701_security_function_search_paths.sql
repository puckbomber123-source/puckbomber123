
-- ============================================================
-- Fix mutable search_path on all public plpgsql functions
-- Pin search_path = public so objects resolve correctly
-- without being vulnerable to search_path injection.
-- ============================================================

-- update_profile_timestamp (trigger)
CREATE OR REPLACE FUNCTION public.update_profile_timestamp()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- create_booking
CREATE OR REPLACE FUNCTION public.create_booking(
  p_email        text,
  p_service_type text,
  p_event_date   date,
  p_start_time   timestamp without time zone,
  p_end_time     timestamp without time zone,
  p_service_team text,
  p_custom_note  text
)
  RETURNS void
  LANGUAGE plpgsql
  SET search_path = public
AS $$
BEGIN
  INSERT INTO bookings (
    email, service_type, event_date,
    start_time, end_time, service_team, custom_note
  ) VALUES (
    p_email, p_service_type, p_event_date,
    p_start_time, p_end_time, p_service_team, p_custom_note
  );
END;
$$;

-- sync_single_client
CREATE OR REPLACE FUNCTION public.sync_single_client(p_email text)
  RETURNS void
  LANGUAGE plpgsql
  SET search_path = public
AS $$
DECLARE
  url     text := 'https://script.google.com/macros/s/AKfycbxzVPj_Aw3ICluye7_AOxzJr4F7HOXuEcH6CigVA7DWrBlfwc578Z5HKrprm5CqH40w/exec';
  payload json := json_build_object('email', p_email);
BEGIN
  PERFORM http_post(url, payload::text, 'application/json');
END;
$$;

-- "Booking with N8N" trigger
CREATE OR REPLACE FUNCTION public."Booking with N8N"()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $$
DECLARE
  url  text := 'https://primary-production-4a42.up.railway.app/webhook/book-request';
  body text;
BEGIN
  PERFORM set_config('statement_timeout', '900', true);
  body := json_build_object(
    'email',         NEW.email,
    'serviceType',   NEW.service_type,
    'eventDate',     NEW.event_date,
    'customNote',    NEW.custom_note,
    'startDateTime', NEW.start_time,
    'endDateTime',   NEW.end_time,
    'serviceTeam',   NEW.service_team
  )::text;
  PERFORM http_post(url, body, 'application/json');
  RETURN NEW;
END;
$$;

-- "Booking Approved N8N" trigger
CREATE OR REPLACE FUNCTION public."Booking Approved N8N"()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $$
DECLARE
  url  text := 'https://primary-production-4a42.up.railway.app/webhook/approved';
  body text;
BEGIN
  PERFORM set_config('statement_timeout', '900', true);
  body := json_build_object(
    'email',         NEW.email,
    'serviceType',   NEW.service_type,
    'eventDate',     NEW.event_date,
    'customNote',    NEW.custom_note,
    'startDateTime', NEW.start_time,
    'endDateTime',   NEW.end_time,
    'serviceTeam',   NEW.service_team
  )::text;
  PERFORM http_post(url, body, 'application/json');
  RETURN NEW;
END;
$$;

-- "Post-service-report" trigger
CREATE OR REPLACE FUNCTION public."Post-service-report"()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $$
BEGIN
  PERFORM http_post(
    'https://primary-production-4a42.up.railway.app/webhook-test/new-service-report'::text,
    jsonb_build_object('Content-Type', 'application/json'),
    row_to_json(NEW)::text
  );
  RETURN NEW;
END;
$$;

-- notify_n8n_on_booking_approved (SECURITY DEFINER trigger)
CREATE OR REPLACE FUNCTION public.notify_n8n_on_booking_approved()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  webhook_url text;
  payload     json;
  response    http_response;
  err_msg     text;
BEGIN
  IF OLD.status IS DISTINCT FROM 'pending' OR NEW.status IS DISTINCT FROM 'approved' THEN
    RETURN NEW;
  END IF;

  SELECT value INTO webhook_url
  FROM app_config
  WHERE key = 'n8n_booking_webhook_url'
  LIMIT 1;

  IF webhook_url IS NULL OR trim(webhook_url) = '' THEN
    UPDATE bookings
    SET
      n8n_triggered     = false,
      n8n_triggered_at  = NULL,
      n8n_trigger_error = 'n8n_booking_webhook_url not configured in app_config'
    WHERE id = NEW.id;
    RETURN NEW;
  END IF;

  payload := json_build_object(
    'event',         'booking_approved',
    'booking_id',    NEW.id,
    'email',         NEW.email,
    'client_name',   NEW.client_name,
    'service_type',  NEW.service_type,
    'event_date',    NEW.event_date,
    'start_time',    NEW.start_time,
    'end_time',      NEW.end_time,
    'service_team',  NEW.service_team,
    'custom_note',   NEW.custom_note,
    'approved_by',   NEW.approved_by,
    'approved_at',   NEW.approved_at,
    'assignment_id', NEW.assignment_id
  );

  BEGIN
    response := http((
      'POST',
      trim(webhook_url),
      ARRAY[http_header('Content-Type', 'application/json')],
      'application/json',
      payload::text
    )::http_request);

    IF response.status BETWEEN 200 AND 299 THEN
      UPDATE bookings
      SET
        n8n_triggered     = true,
        n8n_triggered_at  = now(),
        n8n_trigger_error = NULL
      WHERE id = NEW.id;
    ELSE
      err_msg := 'HTTP ' || response.status || ': ' || left(response.content, 500);
      UPDATE bookings
      SET
        n8n_triggered     = false,
        n8n_triggered_at  = NULL,
        n8n_trigger_error = err_msg
      WHERE id = NEW.id;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    err_msg := SQLERRM;
    UPDATE bookings
    SET
      n8n_triggered     = false,
      n8n_triggered_at  = NULL,
      n8n_trigger_error = left(err_msg, 500)
    WHERE id = NEW.id;
  END;

  RETURN NEW;
END;
$$;

-- search_clients (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.search_clients(query text, max_results integer DEFAULT 12)
  RETURNS TABLE(
    id uuid, first_name text, last_name text, email text, phone text,
    address text, city text, zip text, pool_type text, pool_cover text,
    pool_opening text, pool_opening_add_on text, pool_opening_confirmed text,
    pool_maintenance text, pool_closing text, pool_closing_add_ons text,
    pool_closing_confirmed text, backyard_access_approval text, pool_size text,
    relevance integer
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  q          text;
  q_digits   text;
  parts      text[];
  first_part text;
  last_part  text;
BEGIN
  q          := lower(trim(query));
  q_digits   := regexp_replace(q, '[^0-9]', '', 'g');
  parts      := regexp_split_to_array(trim(q), '\s+');
  first_part := parts[1];
  last_part  := CASE WHEN array_length(parts, 1) >= 2 THEN parts[array_length(parts, 1)] ELSE NULL END;

  RETURN QUERY
  SELECT
    c.id, c.first_name, c.last_name, c.email, c.phone,
    c.address, c.city, c.zip, c.pool_type, c.pool_cover,
    c.pool_opening, c.pool_opening_add_on, c.pool_opening_confirmed,
    c.pool_maintenance, c.pool_closing, c.pool_closing_add_ons,
    c.pool_closing_confirmed, c.backyard_access_approval, c.pool_size,
    (
      CASE WHEN lower(c.first_name || ' ' || c.last_name) LIKE q || '%'          THEN 100 ELSE 0 END
    + CASE WHEN lower(c.first_name || ' ' || c.last_name) LIKE '%' || q || '%'   THEN  60 ELSE 0 END
    + CASE WHEN lower(c.first_name) LIKE first_part || '%'                        THEN  50 ELSE 0 END
    + CASE WHEN last_part IS NOT NULL
           AND lower(c.last_name) LIKE last_part || '%'                           THEN  50 ELSE 0 END
    + CASE WHEN lower(c.first_name) LIKE '%' || first_part || '%'                THEN  20 ELSE 0 END
    + CASE WHEN lower(c.last_name)  LIKE '%' || first_part || '%'                THEN  20 ELSE 0 END
    + CASE WHEN last_part IS NOT NULL
           AND lower(c.last_name) LIKE '%' || last_part || '%'                   THEN  20 ELSE 0 END
    + CASE WHEN lower(c.email) LIKE q || '%'                                     THEN  40 ELSE 0 END
    + CASE WHEN lower(c.email) LIKE '%' || q || '%'                              THEN  30 ELSE 0 END
    + CASE WHEN q_digits <> ''
           AND regexp_replace(coalesce(c.phone,''), '[^0-9]', '', 'g')
               LIKE '%' || q_digits || '%'                                        THEN  40 ELSE 0 END
    + CASE WHEN lower(coalesce(c.address,'') || ' ' || coalesce(c.city,''))
               LIKE '%' || q || '%'                                               THEN  25 ELSE 0 END
    )::int AS relevance
  FROM clients c
  WHERE
       lower(c.first_name || ' ' || c.last_name) LIKE '%' || q || '%'
    OR lower(c.first_name) LIKE '%' || first_part || '%'
    OR lower(c.last_name)  LIKE '%' || first_part || '%'
    OR (last_part IS NOT NULL AND lower(c.last_name) LIKE '%' || last_part || '%')
    OR lower(c.email) LIKE '%' || q || '%'
    OR (q_digits <> '' AND regexp_replace(coalesce(c.phone,''), '[^0-9]', '', 'g') LIKE '%' || q_digits || '%')
    OR lower(coalesce(c.address,'') || ' ' || coalesce(c.city,'')) LIKE '%' || q || '%'
  ORDER BY relevance DESC, c.last_name, c.first_name
  LIMIT max_results;
END;
$$;
