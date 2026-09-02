/*
  # Smart Client Search Function

  ## Purpose
  Replaces the basic ilike multi-field search with a ranked full-text search that handles:
  - Full name queries ("John Smith") by splitting the input and matching across first+last
  - Phone number queries (strips formatting, searches normalized digits)
  - Partial matches on any word in the query against all key fields
  - Result ranking: exact/prefix matches rank higher than mid-string matches
  - Single function call replaces 4 separate ilike conditions

  ## New Objects
  - `search_clients(query text, max_results int)` — returns ranked client rows
  - `idx_clients_fullname_trgm` — trigram index on concat(first+last) for fast fuzzy name search
  - `idx_clients_phone_trgm` — trigram index on phone
  - `idx_clients_address_trgm` — trigram index on address+city

  ## Notes
  - Requires pg_trgm extension (enabled below)
  - GIN trigram indexes make ilike fast on large tables
*/

-- Enable trigram extension for fast substring/fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram indexes for fast ilike queries
CREATE INDEX IF NOT EXISTS idx_clients_fullname_trgm
  ON clients USING GIN ((lower(first_name || ' ' || last_name)) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clients_firstname_trgm
  ON clients USING GIN (lower(first_name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clients_lastname_trgm
  ON clients USING GIN (lower(last_name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clients_email_trgm
  ON clients USING GIN (lower(email) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clients_phone_trgm
  ON clients USING GIN (lower(regexp_replace(phone, '[^0-9]', '', 'g')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clients_address_trgm
  ON clients USING GIN (lower(coalesce(address,'') || ' ' || coalesce(city,'')) gin_trgm_ops);

-- Smart search function
-- Returns clients ordered by relevance score (higher = better match)
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
  -- Normalize query
  q := lower(trim(query));
  -- Strip all non-digits from query for phone matching
  q_digits := regexp_replace(q, '[^0-9]', '', 'g');
  -- Split on whitespace for multi-word queries
  parts := regexp_split_to_array(trim(q), '\s+');
  first_part := parts[1];
  last_part := CASE WHEN array_length(parts, 1) >= 2 THEN parts[array_length(parts, 1)] ELSE NULL END;

  RETURN QUERY
  SELECT DISTINCT ON (c.id)
    c.id,
    c.first_name,
    c.last_name,
    c.email,
    c.phone,
    c.address,
    c.city,
    c.zip,
    c.pool_type,
    c.pool_cover,
    c.pool_opening,
    c.pool_opening_add_on,
    c.pool_opening_confirmed,
    c.pool_maintenance,
    c.pool_closing,
    c.pool_closing_add_ons,
    c.pool_closing_confirmed,
    c.backyard_access_approval,
    c.pool_size,
    (
      -- Full name exact prefix (highest priority)
      CASE WHEN lower(c.first_name || ' ' || c.last_name) LIKE q || '%' THEN 100 ELSE 0 END
      -- Full name contains
      + CASE WHEN lower(c.first_name || ' ' || c.last_name) LIKE '%' || q || '%' THEN 60 ELSE 0 END
      -- First name starts with first part
      + CASE WHEN lower(c.first_name) LIKE first_part || '%' THEN 50 ELSE 0 END
      -- Last name starts with last part (when multi-word query)
      + CASE WHEN last_part IS NOT NULL AND lower(c.last_name) LIKE last_part || '%' THEN 50 ELSE 0 END
      -- First name contains first part
      + CASE WHEN lower(c.first_name) LIKE '%' || first_part || '%' THEN 20 ELSE 0 END
      -- Last name contains first part (single word could be last name)
      + CASE WHEN lower(c.last_name) LIKE '%' || first_part || '%' THEN 20 ELSE 0 END
      -- Last name contains last part
      + CASE WHEN last_part IS NOT NULL AND lower(c.last_name) LIKE '%' || last_part || '%' THEN 20 ELSE 0 END
      -- Email contains query
      + CASE WHEN lower(c.email) LIKE '%' || q || '%' THEN 30 ELSE 0 END
      -- Email starts with query
      + CASE WHEN lower(c.email) LIKE q || '%' THEN 40 ELSE 0 END
      -- Phone digits match (stripped)
      + CASE WHEN q_digits <> '' AND regexp_replace(coalesce(c.phone,''), '[^0-9]', '', 'g') LIKE '%' || q_digits || '%' THEN 40 ELSE 0 END
      -- Address contains query
      + CASE WHEN lower(coalesce(c.address,'') || ' ' || coalesce(c.city,'')) LIKE '%' || q || '%' THEN 25 ELSE 0 END
    )::int AS relevance
  FROM clients c
  WHERE
    -- At least one field matches
    lower(c.first_name || ' ' || c.last_name) LIKE '%' || q || '%'
    OR lower(c.first_name) LIKE '%' || first_part || '%'
    OR lower(c.last_name) LIKE '%' || first_part || '%'
    OR (last_part IS NOT NULL AND lower(c.last_name) LIKE '%' || last_part || '%')
    OR lower(c.email) LIKE '%' || q || '%'
    OR (q_digits <> '' AND regexp_replace(coalesce(c.phone,''), '[^0-9]', '', 'g') LIKE '%' || q_digits || '%')
    OR lower(coalesce(c.address,'') || ' ' || coalesce(c.city,'')) LIKE '%' || q || '%'
  ORDER BY c.id, relevance DESC
  LIMIT max_results;
END;
$$;
