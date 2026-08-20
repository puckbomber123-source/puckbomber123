
-- Admin dashboard manages technicians (insert/update/delete) using the anon key.
-- The existing policies only allow writes to authenticated users with auth.uid() checks,
-- which never fire since this app doesn't use Supabase Auth.
-- Add anon write policies so the admin dashboard can manage staff.

CREATE POLICY "anon_insert_technicians" ON public.technicians
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_update_technicians" ON public.technicians
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_delete_technicians" ON public.technicians
  FOR DELETE TO anon USING (true);

-- Also add UPDATE for daily_team_member_assignments (app may update team assignments)
CREATE POLICY "Allow update on daily_team_member_assignments" ON public.daily_team_member_assignments
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
