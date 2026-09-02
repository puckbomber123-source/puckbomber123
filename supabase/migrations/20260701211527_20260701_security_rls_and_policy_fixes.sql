
-- ============================================================
-- 1. Enable RLS on tables that have policies but RLS disabled
-- ============================================================
ALTER TABLE public.employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n8n_booking_queue  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technicians        ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Enable RLS on tables with no policies at all
-- ============================================================
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients         ENABLE ROW LEVEL SECURITY;

-- Add authenticated-only CRUD policies for calendar_events
CREATE POLICY "authenticated_select_calendar_events" ON public.calendar_events
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert_calendar_events" ON public.calendar_events
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_calendar_events" ON public.calendar_events
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete_calendar_events" ON public.calendar_events
  FOR DELETE TO authenticated USING (true);

-- Add authenticated-only CRUD policies for clients
CREATE POLICY "authenticated_select_clients" ON public.clients
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_insert_clients" ON public.clients
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_clients" ON public.clients
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_delete_clients" ON public.clients
  FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 3. Fix "always true anon" policies — restrict to authenticated
-- ============================================================

-- bookings
DROP POLICY IF EXISTS "Allow anon insert on bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow anon update on bookings" ON public.bookings;
CREATE POLICY "Allow authenticated insert on bookings" ON public.bookings
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on bookings" ON public.bookings
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- cash_invoice_lines
DROP POLICY IF EXISTS "cash_invoice_lines_delete" ON public.cash_invoice_lines;
DROP POLICY IF EXISTS "cash_invoice_lines_insert" ON public.cash_invoice_lines;
DROP POLICY IF EXISTS "cash_invoice_lines_update" ON public.cash_invoice_lines;
CREATE POLICY "cash_invoice_lines_delete" ON public.cash_invoice_lines
  FOR DELETE TO authenticated USING (true);
CREATE POLICY "cash_invoice_lines_insert" ON public.cash_invoice_lines
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cash_invoice_lines_update" ON public.cash_invoice_lines
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- cash_invoices
DROP POLICY IF EXISTS "cash_invoices_delete" ON public.cash_invoices;
DROP POLICY IF EXISTS "cash_invoices_insert" ON public.cash_invoices;
DROP POLICY IF EXISTS "cash_invoices_update" ON public.cash_invoices;
CREATE POLICY "cash_invoices_delete" ON public.cash_invoices
  FOR DELETE TO authenticated USING (true);
CREATE POLICY "cash_invoices_insert" ON public.cash_invoices
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cash_invoices_update" ON public.cash_invoices
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- commission_entries
DROP POLICY IF EXISTS "commission_delete" ON public.commission_entries;
DROP POLICY IF EXISTS "commission_insert" ON public.commission_entries;
DROP POLICY IF EXISTS "commission_update" ON public.commission_entries;
CREATE POLICY "commission_delete" ON public.commission_entries
  FOR DELETE TO authenticated USING (true);
CREATE POLICY "commission_insert" ON public.commission_entries
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "commission_update" ON public.commission_entries
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- daily_team_member_assignments
DROP POLICY IF EXISTS "Allow delete on daily_team_member_assignments" ON public.daily_team_member_assignments;
DROP POLICY IF EXISTS "Allow insert on daily_team_member_assignments" ON public.daily_team_member_assignments;
CREATE POLICY "Allow delete on daily_team_member_assignments" ON public.daily_team_member_assignments
  FOR DELETE TO authenticated USING (true);
CREATE POLICY "Allow insert on daily_team_member_assignments" ON public.daily_team_member_assignments
  FOR INSERT TO authenticated WITH CHECK (true);

-- daily_team_member_exclusions
DROP POLICY IF EXISTS "Allow delete on daily_team_member_exclusions" ON public.daily_team_member_exclusions;
DROP POLICY IF EXISTS "Allow insert on daily_team_member_exclusions" ON public.daily_team_member_exclusions;
CREATE POLICY "Allow delete on daily_team_member_exclusions" ON public.daily_team_member_exclusions
  FOR DELETE TO authenticated USING (true);
CREATE POLICY "Allow insert on daily_team_member_exclusions" ON public.daily_team_member_exclusions
  FOR INSERT TO authenticated WITH CHECK (true);

-- invoices
DROP POLICY IF EXISTS "Allow anon insert on invoices" ON public.invoices;
DROP POLICY IF EXISTS "Allow anon update on invoices" ON public.invoices;
CREATE POLICY "Allow authenticated insert on invoices" ON public.invoices
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on invoices" ON public.invoices
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- service_reports — drop all broad anon/anyone policies, add single authenticated ones
DROP POLICY IF EXISTS "Anon can insert service reports"   ON public.service_reports;
DROP POLICY IF EXISTS "Anon can update service reports"   ON public.service_reports;
DROP POLICY IF EXISTS "Anyone can insert service reports" ON public.service_reports;
DROP POLICY IF EXISTS "Anyone can update service reports" ON public.service_reports;
CREATE POLICY "authenticated_insert_service_reports" ON public.service_reports
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_service_reports" ON public.service_reports
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- team_daily_assignments — consolidate five overlapping anon policies into three authenticated ones
DROP POLICY IF EXISTS "Allow delete on team_daily_assignments"              ON public.team_daily_assignments;
DROP POLICY IF EXISTS "Allow insert on team_daily_assignments"              ON public.team_daily_assignments;
DROP POLICY IF EXISTS "Allow update on team_daily_assignments"              ON public.team_daily_assignments;
DROP POLICY IF EXISTS "Anon can insert assignments"                        ON public.team_daily_assignments;
DROP POLICY IF EXISTS "Anon can update assignments for completion"          ON public.team_daily_assignments;
CREATE POLICY "Allow delete on team_daily_assignments" ON public.team_daily_assignments
  FOR DELETE TO authenticated USING (true);
CREATE POLICY "Allow insert on team_daily_assignments" ON public.team_daily_assignments
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update on team_daily_assignments" ON public.team_daily_assignments
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- team_daily_notes
DROP POLICY IF EXISTS "Allow delete on team_daily_notes" ON public.team_daily_notes;
DROP POLICY IF EXISTS "Allow insert on team_daily_notes" ON public.team_daily_notes;
DROP POLICY IF EXISTS "Allow update on team_daily_notes" ON public.team_daily_notes;
CREATE POLICY "Allow delete on team_daily_notes" ON public.team_daily_notes
  FOR DELETE TO authenticated USING (true);
CREATE POLICY "Allow insert on team_daily_notes" ON public.team_daily_notes
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update on team_daily_notes" ON public.team_daily_notes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- team_members
DROP POLICY IF EXISTS "Allow delete on team_members" ON public.team_members;
DROP POLICY IF EXISTS "Allow insert on team_members" ON public.team_members;
DROP POLICY IF EXISTS "Allow update on team_members" ON public.team_members;
CREATE POLICY "Allow delete on team_members" ON public.team_members
  FOR DELETE TO authenticated USING (true);
CREATE POLICY "Allow insert on team_members" ON public.team_members
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update on team_members" ON public.team_members
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- team_notes
DROP POLICY IF EXISTS "Allow delete on team_notes" ON public.team_notes;
DROP POLICY IF EXISTS "Allow insert on team_notes" ON public.team_notes;
DROP POLICY IF EXISTS "Allow update on team_notes" ON public.team_notes;
CREATE POLICY "Allow delete on team_notes" ON public.team_notes
  FOR DELETE TO authenticated USING (true);
CREATE POLICY "Allow insert on team_notes" ON public.team_notes
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow update on team_notes" ON public.team_notes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 4. Revoke anon execute from SECURITY DEFINER functions
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.notify_n8n_on_booking_approved() FROM anon;
REVOKE EXECUTE ON FUNCTION public.search_clients(text, integer) FROM anon;
