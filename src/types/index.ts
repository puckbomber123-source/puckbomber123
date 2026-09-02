// Core domain types matching the live Supabase schema.

export interface Technician {
  id: string;
  staff_id: string;
  first_name: string;
  last_name: string;
  pin: string;
  role: 'Admin' | 'Pool Tech Senior' | 'Assistant Pool Tech';
  /** Combined display name stored in sessionStorage */
  name?: string;
}

export interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zip: string;
  pool_type: string;
  pool_cover: string;
  pool_opening: string;
  pool_closing: string;
  pool_maintenance: string;
  backyard_access_approval: string;
  pool_opening_confirmed: string;
  pool_closing_confirmed: string;
  pool_opening_add_on: string;
  pool_closing_add_ons: string;
  pool_size?: string;
  updated_at?: string;
}

export interface ServiceReport {
  id: string;
  client_id: string | null;
  client_email: string;
  assignment_id: string | null;
  lead_technician: string;
  technician_id: string;
  service_date: string;
  service_type: string;
  opening_type: string;
  opening_add_ons: string[];
  closing_add_ons: string[];
  closing_checklist: string[];
  client_paid_cash: boolean;
  pre_start_checklist: string[];
  liner_pull_inspection: boolean;
  technician_notes: string;
  winter_plug: string[];
  pool_reinstallation: string[];
  pool_light: string[];
  pool_pump: string[];
  valves_plumbing: string[];
  sand_filter: string[];
  cartridge_filter: string[];
  salt_system: string[];
  chlorinator: string[];
  heater: string[];
  above_ground: string[];
  garden_hose: string[];
  cement_pool: string[];
  marketing: string[];
  final_inspection: string[];
  photo_pool_area: string;
  photo_pool_equipment: string;
  photo_extra: string;
  time_finished: string;
  sync_status: string;
  submitted_at?: string;
}

export interface AdminTask {
  id: string;
  title: string;
  notes: string | null;
  completed: boolean;
  completed_at: string | null;
  due_date: string | null;
  recurrence: 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  recurrence_day: number | null;
  recurrence_month: number | null;
  recurrence_weekday: number | null;
  reminder_sent_at: string | null;
  assigned_to: string | null;
  created_by: string;
  priority: 'low' | 'normal' | 'high';
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TeamDailyAssignment {
  id: string;
  assignment_date: string;
  team: 'PRINCESSDAVID' | 'TONYVAN' | 'JARVISVAN' | 'SONIC';
  client_email: string;
  sort_order: number;
  admin_note: string;
  title: string;
  service_type: string;
  completed: boolean;
  reschedule_cancel: boolean;
  report_completed: boolean;
  linked_report_id: string | null;
  display_pool_type?: string;
  display_address?: string;
  display_phone?: string;
  display_pool_cover?: string;
  display_pool_opening?: string;
  display_pool_closing?: string;
  display_pool_maintenance?: string;
  display_backyard_access?: string;
  display_opening_add_ons?: string;
  display_closing_add_ons?: string;
  display_pool_size?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}
