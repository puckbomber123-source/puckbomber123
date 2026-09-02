/*
# Email Marketing System

1. Purpose
   Adds a marketing email system for Piscines Novo staff (staff_id 002).
   Staff can create reusable HTML email templates, build campaigns that
   target existing customers by filters (pool type, city, service history,
   etc.), send test emails, and send mass marketing emails through Resend.
   Tracks campaign history (sent count, delivered, opens, clicks, unsubscribes).

2. New Tables
   - `email_templates` — reusable HTML email templates with personalization variables.
     - id (uuid PK)
     - name (text, not null)
     - subject (text)
     - html_body (text) — the HTML email content, supports {{first_name}} etc.
     - description (text)
     - archived (boolean, default false)
     - created_by (text) — staff_id of creator
     - created_at, updated_at (timestamptz)
   - `email_campaigns` — individual marketing campaigns (one per send).
     - id (uuid PK)
     - name (text, not null)
     - subject (text)
     - template_id (uuid FK → email_templates, nullable for ad-hoc)
     - html_body (text) — snapshot of template at send time
     - filters (jsonb) — recipient filter criteria (pool_type, city, etc.)
     - recipient_count (integer, default 0)
     - status (text: draft, scheduled, sending, sent, failed)
     - scheduled_for (timestamptz, nullable)
     - sent_at (timestamptz, nullable)
     - resend_id (text, nullable) — Resend broadcast/email ID
     - delivered_count, open_count, click_count, unsubscribe_count (integer, default 0)
     - created_by (text) — staff_id
     - created_at, updated_at (timestamptz)
   - `marketing_unsubscribes` — tracks customers who opted out of marketing emails.
     - id (uuid PK)
     - email (text, not null, unique)
     - unsubscribed_at (timestamptz, default now())

3. Modified Tables
   - `clients` — adds two columns:
     - `language` (text, default 'fr') — 'fr' or 'en', for language-based filtering
     - `do_not_email` (boolean, default false) — master opt-out flag

4. Security
   - RLS enabled on all new tables.
   - This app uses sessionStorage-based auth (no Supabase auth), so policies
     use `TO anon, authenticated` with `USING (true)` — the data is intentionally
     shared among staff who have logged in via the app's PIN system.
   - marketing_unsubscribes is public-read (so the unsubscribe page can verify),
     insert/update by anon (unsubscribe link writes here).

5. Important Notes
   - The app has NO Supabase auth — it uses a custom PIN login stored in
     sessionStorage. RLS must allow anon access for the app to function.
   - Unsubscribe tracking is separate from operational emails (booking
     confirmations, service reports) — those use different edge functions.
   - Campaign filters are stored as JSONB for flexibility.
*/

-- ─── email_templates ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text,
  html_body text,
  description text,
  archived boolean NOT NULL DEFAULT false,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_email_templates" ON email_templates;
CREATE POLICY "anon_select_email_templates" ON email_templates
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_email_templates" ON email_templates;
CREATE POLICY "anon_insert_email_templates" ON email_templates
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_email_templates" ON email_templates;
CREATE POLICY "anon_update_email_templates" ON email_templates
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_email_templates" ON email_templates;
CREATE POLICY "anon_delete_email_templates" ON email_templates
  FOR DELETE TO anon, authenticated USING (true);

-- ─── email_campaigns ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text,
  template_id uuid REFERENCES email_templates(id) ON DELETE SET NULL,
  html_body text,
  filters jsonb DEFAULT '{}'::jsonb,
  recipient_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  scheduled_for timestamptz,
  sent_at timestamptz,
  resend_id text,
  delivered_count integer NOT NULL DEFAULT 0,
  open_count integer NOT NULL DEFAULT 0,
  click_count integer NOT NULL DEFAULT 0,
  unsubscribe_count integer NOT NULL DEFAULT 0,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_email_campaigns" ON email_campaigns;
CREATE POLICY "anon_select_email_campaigns" ON email_campaigns
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_email_campaigns" ON email_campaigns;
CREATE POLICY "anon_insert_email_campaigns" ON email_campaigns
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_email_campaigns" ON email_campaigns;
CREATE POLICY "anon_update_email_campaigns" ON email_campaigns
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_email_campaigns" ON email_campaigns;
CREATE POLICY "anon_delete_email_campaigns" ON email_campaigns
  FOR DELETE TO anon, authenticated USING (true);

-- ─── marketing_unsubscribes ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketing_unsubscribes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  unsubscribed_at timestamptz DEFAULT now()
);

ALTER TABLE marketing_unsubscribes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_marketing_unsubscribes" ON marketing_unsubscribes;
CREATE POLICY "anon_select_marketing_unsubscribes" ON marketing_unsubscribes
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_marketing_unsubscribes" ON marketing_unsubscribes;
CREATE POLICY "anon_insert_marketing_unsubscribes" ON marketing_unsubscribes
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_marketing_unsubscribes" ON marketing_unsubscribes;
CREATE POLICY "anon_update_marketing_unsubscribes" ON marketing_unsubscribes
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ─── clients: add language + do_not_email columns ─────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'language'
  ) THEN
    ALTER TABLE clients ADD COLUMN language text DEFAULT 'fr';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'do_not_email'
  ) THEN
    ALTER TABLE clients ADD COLUMN do_not_email boolean DEFAULT false;
  END IF;
END $$;

-- ─── Indexes ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_at ON email_campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_unsubscribes_email ON marketing_unsubscribes(email);
CREATE INDEX IF NOT EXISTS idx_email_templates_archived ON email_templates(archived);
