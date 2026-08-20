/*
  # Fix search_clients result ordering

  The v1 function used DISTINCT ON (c.id) which forces ORDER BY to start with c.id,
  preventing ordering by relevance DESC. This version wraps the scoring in a subquery
  so the outer query can ORDER BY relevance DESC freely.
*/

CREATE OR REPLACE FUNCTION search_clients(
  query text,
  max_results int DEFAULT 12
)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  address text,
  city text,
  zip text,
  pool_type text,
  pool_cover text,
  pool_opening text,
  pool_opening_add_on text,
  pool_opening_confirmed text,
  pool_maintenance text,
  pool_closing text,
  pool_closing_add_ons text,
  pool_closing_confirmed text,
  backyard_access_approval text,
  pool_size text,
  relevance int
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  q text;
  q_digits text;
  parts text[];
  first_part text;
  last_part text;
BEGIN
  q := lower(trim(query));
  q_digits := regexp_replace(q, '[^0-9]', '', 'g');
  parts := regexp_split_to_array(trim(q), '\s+');
  first_part := parts[1];
  last_part := CASE WHEN array_length(parts, 1) >= 2 THEN parts[array_length(parts, 1)] ELSE NULL END;

  RETURN QUERY
  SELECT
    c.id, c.first_name, c.last_name, c.email, c.phone,
    c.address, c.city, c.zip, c.pool_type, c.pool_cover,
    c.pool_opening, c.pool_opening_add_on, c.pool_opening_confirmed,
    c.pool_maintenance, c.pool_closing, c.pool_closing_add_ons,
    c.pool_closing_confirmed, c.backyard_access_approval, c.pool_size,
    (
      CASE WHEN lower(c.first_name || ' ' || c.last_name) LIKE q || '%'               THEN 100 ELSE 0 END
      + CASE WHEN lower(c.first_name || ' ' || c.last_name) LIKE '%' || q || '%'      THEN 60  ELSE 0 END
      + CASE WHEN lower(c.first_name) LIKE first_part || '%'                           THEN 50  ELSE 0 END
      + CASE WHEN last_part IS NOT NULL
              AND lower(c.last_name) LIKE last_part || '%'                             THEN 50  ELSE 0 END
      + CASE WHEN lower(c.first_name) LIKE '%' || first_part || '%'                   THEN 20  ELSE 0 END
      + CASE WHEN lower(c.last_name)  LIKE '%' || first_part || '%'                   THEN 20  ELSE 0 END
      + CASE WHEN last_part IS NOT NULL
              AND lower(c.last_name) LIKE '%' || last_part || '%'                     THEN 20  ELSE 0 END
      + CASE WHEN lower(c.email) LIKE q || '%'                                        THEN 40  ELSE 0 END
      + CASE WHEN lower(c.email) LIKE '%' || q || '%'                                 THEN 30  ELSE 0 END
      + CASE WHEN q_digits <> ''
              AND regexp_replace(coalesce(c.phone,''), '[^0-9]', '', 'g')
                LIKE '%' || q_digits || '%'                                            THEN 40  ELSE 0 END
      + CASE WHEN lower(coalesce(c.address,'') || ' ' || coalesce(c.city,''))
                LIKE '%' || q || '%'                                                   THEN 25  ELSE 0 END
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
