
-- ============================================================
-- Restore anon access throughout the app.
-- This app uses sessionStorage-based auth (not Supabase Auth),
-- so all Supabase queries run under the anon role. Every table
-- that the frontend reads or writes needs anon-role policies.
-- ============================================================

-- ── 1. technicians ─────────────────────────────────────────
-- Login page fetches all active technicians with the anon key.
-- Existing policies are authenticated-only (admin checks via auth.uid()).
-- Add a simple anon SELECT so the login list loads.
CREATE POLICY "anon_select_technicians" ON public.technicians
  FOR SELECT TO anon USING (true);

-- ── 2. clients ─────────────────────────────────────────────
-- Drop authenticated-only policies we created and replace with anon+authenticated.
DROP POLICY IF EXISTS "authenticated_select_clients" ON public.clients;
DROP POLICY IF EXISTS "authenticated_insert_clients" ON public.clients;
DROP POLICY IF EXISTS "authenticated_update_clients" ON public.clients;
DROP POLICY IF EXISTS "authenticated_delete_clients" ON public.clients;

CREATE POLICY "select_clients" ON public.clients
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_clients" ON public.clients
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_clients" ON public.clients
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_clients" ON public.clients
  FOR DELETE TO anon, authenticated USING (true);

-- ── 3. calendar_events ─────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_select_calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "authenticated_insert_calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "authenticated_update_calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "authenticated_delete_calendar_events" ON public.calendar_events;

CREATE POLICY "select_calendar_events" ON public.calendar_events
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_calendar_events" ON public.calendar_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_calendar_events" ON public.calendar_events
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_calendar_events" ON public.calendar_events
  FOR DELETE TO anon, authenticated USING (true);

-- ── 4. schedules ───────────────────────────────────────────
-- Existing policies are authenticated-only (auth.uid() checks).
-- Add anon full-access so the app can read/write schedules.
CREATE POLICY "anon_select_schedules" ON public.schedules
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_schedules" ON public.schedules
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_schedules" ON public.schedules
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_schedules" ON public.schedules
  FOR DELETE TO anon USING (true);

-- ── 5. employee_profiles ───────────────────────────────────
CREATE POLICY "anon_select_employee_profiles" ON public.employee_profiles
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_employee_profiles" ON public.employee_profiles
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_employee_profiles" ON public.employee_profiles
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_employee_profiles" ON public.employee_profiles
  FOR DELETE TO anon USING (true);

-- ── 6. n8n_booking_queue ───────────────────────────────────
-- Existing policies are authenticated-only.
CREATE POLICY "anon_select_n8n_booking_queue" ON public.n8n_booking_queue
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_n8n_booking_queue" ON public.n8n_booking_queue
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_n8n_booking_queue" ON public.n8n_booking_queue
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ── 7. bookings — restore anon write access ────────────────
DROP POLICY IF EXISTS "Allow authenticated insert on bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow authenticated update on bookings" ON public.bookings;

CREATE POLICY "Allow anon insert on bookings" ON public.bookings
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow anon update on bookings" ON public.bookings
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ── 8. invoices — restore anon write access ────────────────
DROP POLICY IF EXISTS "Allow authenticated insert on invoices" ON public.invoices;
DROP POLICY IF EXISTS "Allow authenticated update on invoices" ON public.invoices;

CREATE POLICY "Allow anon insert on invoices" ON public.invoices
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow anon update on invoices" ON public.invoices
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ── 9. service_reports — restore anon write access ─────────
DROP POLICY IF EXISTS "authenticated_insert_service_reports" ON public.service_reports;
DROP POLICY IF EXISTS "authenticated_update_service_reports" ON public.service_reports;

CREATE POLICY "insert_service_reports" ON public.service_reports
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_service_reports" ON public.service_reports
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ── 10. team_daily_assignments — restore anon write access ──
DROP POLICY IF EXISTS "Allow delete on team_daily_assignments" ON public.team_daily_assignments;
DROP POLICY IF EXISTS "Allow insert on team_daily_assignments" ON public.team_daily_assignments;
DROP POLICY IF EXISTS "Allow update on team_daily_assignments" ON public.team_daily_assignments;

CREATE POLICY "Allow delete on team_daily_assignments" ON public.team_daily_assignments
  FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "Allow insert on team_daily_assignments" ON public.team_daily_assignments
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow update on team_daily_assignments" ON public.team_daily_assignments
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ── 11. team_members — restore anon write access ───────────
DROP POLICY IF EXISTS "Allow delete on team_members" ON public.team_members;
DROP POLICY IF EXISTS "Allow insert on team_members" ON public.team_members;
DROP POLICY IF EXISTS "Allow update on team_members" ON public.team_members;

CREATE POLICY "Allow delete on team_members" ON public.team_members
  FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "Allow insert on team_members" ON public.team_members
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow update on team_members" ON public.team_members
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ── 12. team_notes — restore anon write access ─────────────
DROP POLICY IF EXISTS "Allow delete on team_notes" ON public.team_notes;
DROP POLICY IF EXISTS "Allow insert on team_notes" ON public.team_notes;
DROP POLICY IF EXISTS "Allow update on team_notes" ON public.team_notes;

CREATE POLICY "Allow delete on team_notes" ON public.team_notes
  FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "Allow insert on team_notes" ON public.team_notes
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow update on team_notes" ON public.team_notes
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ── 13. team_daily_notes — restore anon write access ───────
DROP POLICY IF EXISTS "Allow delete on team_daily_notes" ON public.team_daily_notes;
DROP POLICY IF EXISTS "Allow insert on team_daily_notes" ON public.team_daily_notes;
DROP POLICY IF EXISTS "Allow update on team_daily_notes" ON public.team_daily_notes;

CREATE POLICY "Allow delete on team_daily_notes" ON public.team_daily_notes
  FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "Allow insert on team_daily_notes" ON public.team_daily_notes
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow update on team_daily_notes" ON public.team_daily_notes
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ── 14. daily_team_member_assignments — restore anon write ──
DROP POLICY IF EXISTS "Allow delete on daily_team_member_assignments" ON public.daily_team_member_assignments;
DROP POLICY IF EXISTS "Allow insert on daily_team_member_assignments" ON public.daily_team_member_assignments;

CREATE POLICY "Allow delete on daily_team_member_assignments" ON public.daily_team_member_assignments
  FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "Allow insert on daily_team_member_assignments" ON public.daily_team_member_assignments
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ── 15. daily_team_member_exclusions — restore anon write ───
DROP POLICY IF EXISTS "Allow delete on daily_team_member_exclusions" ON public.daily_team_member_exclusions;
DROP POLICY IF EXISTS "Allow insert on daily_team_member_exclusions" ON public.daily_team_member_exclusions;

CREATE POLICY "Allow delete on daily_team_member_exclusions" ON public.daily_team_member_exclusions
  FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "Allow insert on daily_team_member_exclusions" ON public.daily_team_member_exclusions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ── 16. cash_invoices — restore anon write access ──────────
DROP POLICY IF EXISTS "cash_invoices_delete" ON public.cash_invoices;
DROP POLICY IF EXISTS "cash_invoices_insert" ON public.cash_invoices;
DROP POLICY IF EXISTS "cash_invoices_update" ON public.cash_invoices;

CREATE POLICY "cash_invoices_delete" ON public.cash_invoices
  FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "cash_invoices_insert" ON public.cash_invoices
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "cash_invoices_update" ON public.cash_invoices
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ── 17. cash_invoice_lines — restore anon write access ─────
DROP POLICY IF EXISTS "cash_invoice_lines_delete" ON public.cash_invoice_lines;
DROP POLICY IF EXISTS "cash_invoice_lines_insert" ON public.cash_invoice_lines;
DROP POLICY IF EXISTS "cash_invoice_lines_update" ON public.cash_invoice_lines;

CREATE POLICY "cash_invoice_lines_delete" ON public.cash_invoice_lines
  FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "cash_invoice_lines_insert" ON public.cash_invoice_lines
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "cash_invoice_lines_update" ON public.cash_invoice_lines
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ── 18. commission_entries — restore anon write access ─────
DROP POLICY IF EXISTS "commission_delete" ON public.commission_entries;
DROP POLICY IF EXISTS "commission_insert" ON public.commission_entries;
DROP POLICY IF EXISTS "commission_update" ON public.commission_entries;

CREATE POLICY "commission_delete" ON public.commission_entries
  FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "commission_insert" ON public.commission_entries
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "commission_update" ON public.commission_entries
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ── 19. Restore anon EXECUTE on search_clients ─────────────
-- The client search uses the anon key to call this RPC.
GRANT EXECUTE ON FUNCTION public.search_clients(text, integer) TO anon;
