import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Mail, Calendar, ChevronLeft, ChevronRight,
  RefreshCw, CheckCircle2, Users, Eye, Send, AlertCircle,
  ChevronDown, ChevronUp, MapPin, Phone, Waves, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface Assignment {
  id: string;
  assignment_date: string;
  team: string | null;
  title: string;
  client_email: string;
  service_type: string;
  display_address: string | null;
  display_phone: string | null;
  display_pool_type: string | null;
  display_pool_cover: string | null;
  display_pool_opening: string | null;
  display_pool_closing: string | null;
  display_pool_maintenance: string | null;
  display_backyard_access: string | null;
  display_opening_add_ons: string | null;
  display_closing_add_ons: string | null;
  admin_note: string | null;
  completed: boolean;
  report_completed: boolean;
}

interface DayGroup {
  date: string;
  assignments: Assignment[];
}

interface TeamGroup {
  date: string;
  team: string;
  assignments: Assignment[];
}

const TEAM_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  PRINCESSDAVID: { bg: 'bg-brand-50',    border: 'border-brand-200',   text: 'text-brand-700',   dot: 'bg-brand-500' },
  TONYVAN:       { bg: 'bg-emerald-50', border: 'border-emerald-200',text: 'text-emerald-700',dot: 'bg-emerald-500' },
  JARVISVAN:     { bg: 'bg-amber-50',   border: 'border-amber-200',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  SONIC:         { bg: 'bg-rose-50',    border: 'border-rose-200',   text: 'text-rose-700',   dot: 'bg-rose-500' },
};

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function formatDate(date: Date) {
  return date.toISOString().split('T')[0];
}

function weekLabel(start: Date) {
  const end = addDays(start, 6);
  return `${start.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function dayLabel(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

function teamColor(team: string | null) {
  return TEAM_COLORS[team || ''] || { bg: 'bg-neutral-50', border: 'border-neutral-200', text: 'text-neutral-600', dot: 'bg-neutral-400' };
}

export default function ServiceConfirmation() {
  const navigate = useNavigate();
  const technician = JSON.parse(sessionStorage.getItem('technician') || '{}');

  // Default to next week
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(addDays(new Date(), 7)));
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [expandedAssignments, setExpandedAssignments] = useState<Set<string>>(new Set());
  const [previewMode, setPreviewMode] = useState(false);

  const weekEnd = addDays(weekStart, 6);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    setSent(false);
    const { data, error } = await supabase
      .from('team_daily_assignments')
      .select('id,assignment_date,team,title,client_email,service_type,display_address,display_phone,display_pool_type,display_pool_cover,display_pool_opening,display_pool_closing,display_pool_maintenance,display_backyard_access,display_opening_add_ons,display_closing_add_ons,admin_note,completed,report_completed')
      .gte('assignment_date', formatDate(weekStart))
      .lte('assignment_date', formatDate(weekEnd))
      .order('assignment_date', { ascending: true })
      .order('team', { ascending: true })
      .order('id', { ascending: true });

    if (error) toast.error('Failed to load assignments');
    else setAssignments(data || []);
    setLoading(false);
  }, [weekStart]);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  // Group by date then team
  const byDate: Record<string, Record<string, Assignment[]>> = {};
  assignments.forEach(a => {
    if (!byDate[a.assignment_date]) byDate[a.assignment_date] = {};
    const t = a.team || 'Unallocated';
    if (!byDate[a.assignment_date][t]) byDate[a.assignment_date][t] = [];
    byDate[a.assignment_date][t].push(a);
  });
  const sortedDates = Object.keys(byDate).sort();

  // Build the summary payload for the email.
  // Maps Assignment fields to what the AssignmentSummary interface in the edge function expects.
  function buildWeekSummary(): TeamGroup[] {
    const groups: TeamGroup[] = [];
    sortedDates.forEach(date => {
      Object.entries(byDate[date]).forEach(([team, asgns]) => {
        groups.push({
          date,
          team,
          assignments: asgns.map(a => ({
            title: a.title || a.client_email,
            email: a.client_email,          // edge fn expects "email"
            service_type: a.service_type,
            display_address: a.display_address || '',
            display_phone: a.display_phone || '',
            display_pool_type: a.display_pool_type || '',
            display_pool_cover: a.display_pool_cover || '',
            display_pool_opening: a.display_pool_opening || '',
            display_pool_closing: a.display_pool_closing || '',
            display_pool_maintenance: a.display_pool_maintenance || '',
            display_backyard_access: a.display_backyard_access || '',
            display_opening_add_ons: a.display_opening_add_ons || '',
            display_closing_add_ons: a.display_closing_add_ons || '',
            admin_note: a.admin_note || '',
          })),
        });
      });
    });
    return groups;
  }

  async function sendConfirmationEmail() {
    setSending(true);
    try {
      const days = buildWeekSummary();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-report-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          type: 'weekly_confirmation',
          weekSummary: {
            weekLabel: weekLabel(weekStart),
            days,
            sentBy: technician.name || technician.staff_id || 'Admin',
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      toast.success('Weekly confirmation email sent to theo@novopiscines.ca');
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Email failed');
    }
    setSending(false);
  }

  function toggleDay(date: string) {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    });
  }

  function toggleAssignment(id: string) {
    setExpandedAssignments(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setExpandedDays(new Set(sortedDates));
  }
  function collapseAll() {
    setExpandedDays(new Set());
    setExpandedAssignments(new Set());
  }

  const totalJobs = assignments.length;
  const totalDays = sortedDates.length;

  return (
    <div className="page-shell">
      {/* Header */}
      <header className="navbar">
        <div className="navbar-inner flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="text-neutral-500 hover:text-neutral-800 transition p-1 rounded-lg hover:bg-neutral-100">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Mail className="w-6 h-6 text-brand-600" />
            <span className="text-lg font-bold text-neutral-900">Service Confirmation</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewMode(p => !p)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition
                ${previewMode ? 'bg-brand-50 border-brand-300 text-brand-700' : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">{previewMode ? 'Card View' : 'Preview'}</span>
            </button>
            <button onClick={fetchAssignments} className="p-2 rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 transition">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-500' : ''}`} />
            </button>
            <button
              onClick={sendConfirmationEmail}
              disabled={sending || loading || totalJobs === 0}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition disabled:opacity-50"
            >
              <Send className={`w-4 h-4 ${sending ? 'animate-pulse' : ''}`} />
              <span>{sending ? 'Sending…' : sent ? 'Resend Email' : 'Send to Theo'}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="page-content space-y-5">

        {/* Week navigator */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 flex items-center justify-between gap-4">
          <button
            onClick={() => setWeekStart(prev => addDays(prev, -7))}
            className="p-2 rounded-xl hover:bg-neutral-100 transition text-neutral-500"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <p className="text-base font-bold text-neutral-900">{weekLabel(weekStart)}</p>
            <p className="text-xs text-neutral-500 mt-0.5">
              {formatDate(weekStart)} → {formatDate(weekEnd)}
            </p>
          </div>

          <button
            onClick={() => setWeekStart(prev => addDays(prev, 7))}
            className="p-2 rounded-xl hover:bg-neutral-100 transition text-neutral-500"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Summary bar */}
        {!loading && (
          <div className="grid grid-cols-3 gap-3">
            <SummaryCard label="Days with Jobs" value={totalDays} icon={<Calendar className="w-5 h-5 text-brand-500" />} />
            <SummaryCard label="Total Services" value={totalJobs} icon={<Users className="w-5 h-5 text-emerald-500" />} />
            <SummaryCard
              label="Email Status"
              value={sent ? 'Sent' : 'Not sent'}
              icon={sent
                ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                : <Clock className="w-5 h-5 text-neutral-400" />}
            />
          </div>
        )}

        {/* Info banner */}
        <div className="flex items-start gap-3 p-4 bg-brand-50 border border-brand-200 rounded-xl text-sm text-brand-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-brand-500" />
          <div>
            <p className="font-semibold">Send this 1 week before the service dates</p>
            <p className="text-brand-700 mt-0.5">
              The email will go to <strong>theo@novopiscines.ca</strong> with a full breakdown of each day — client info, pool details, and team assignments — as a reminder for the upcoming week.
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="py-16 text-center text-neutral-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" /> Loading assignments…
          </div>
        )}

        {/* Empty state */}
        {!loading && totalJobs === 0 && (
          <div className="py-16 text-center text-neutral-400">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="font-medium">No assignments this week</p>
            <p className="text-sm mt-1">Navigate to a different week or add assignments in Daily Assignments.</p>
          </div>
        )}

        {/* Assignment list */}
        {!loading && totalJobs > 0 && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-neutral-600">{totalJobs} service{totalJobs !== 1 ? 's' : ''} across {totalDays} day{totalDays !== 1 ? 's' : ''}</p>
              <div className="flex gap-2">
                <button onClick={expandAll} className="text-xs text-brand-600 hover:underline">Expand all</button>
                <span className="text-neutral-300">|</span>
                <button onClick={collapseAll} className="text-xs text-neutral-500 hover:underline">Collapse all</button>
              </div>
            </div>

            <div className="space-y-3">
              {sortedDates.map(date => {
                const teamsOnDay = byDate[date];
                const totalOnDay = Object.values(teamsOnDay).reduce((s, a) => s + a.length, 0);
                const isExpanded = expandedDays.has(date);

                return (
                  <div key={date} className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                    {/* Day header */}
                    <button
                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-neutral-50/60 transition"
                      onClick={() => toggleDay(date)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-600 flex flex-col items-center justify-center shrink-0">
                          <span className="text-white text-[10px] font-bold uppercase leading-none">
                            {new Date(date + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short' })}
                          </span>
                          <span className="text-white text-base font-bold leading-none mt-0.5">
                            {new Date(date + 'T00:00:00').getDate()}
                          </span>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-neutral-900 text-sm">{dayLabel(date)}</p>
                          <p className="text-xs text-neutral-500">{totalOnDay} service{totalOnDay !== 1 ? 's' : ''} · {Object.keys(teamsOnDay).join(', ')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-full">
                          {totalOnDay}
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
                      </div>
                    </button>

                    {/* Day body */}
                    {isExpanded && (
                      <div className="border-t border-neutral-100 px-4 py-4 space-y-4">
                        {Object.entries(teamsOnDay).map(([team, teamAssignments]) => {
                          const tc = teamColor(team);
                          return (
                            <div key={team}>
                              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold mb-3 ${tc.bg} ${tc.text} border ${tc.border}`}>
                                <span className={`w-2 h-2 rounded-full ${tc.dot}`} />
                                {team}
                                <span className="opacity-70">· {teamAssignments.length} job{teamAssignments.length !== 1 ? 's' : ''}</span>
                              </div>

                              <div className="space-y-2 pl-2">
                                {teamAssignments.map((a, idx) => {
                                  const isOpen = expandedAssignments.has(a.id);
                                  return (
                                    <div key={a.id} className="bg-neutral-50 border border-neutral-100 rounded-xl overflow-hidden">
                                      <button
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-100/50 transition text-left"
                                        onClick={() => toggleAssignment(a.id)}
                                      >
                                        <span className="text-xs font-bold text-neutral-400 w-5 shrink-0">#{idx + 1}</span>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-semibold text-neutral-800 truncate">{a.title || a.client_email}</p>
                                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                            {a.service_type && (
                                              <span className="text-[10px] font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">{a.service_type}</span>
                                            )}
                                            {a.display_address && (
                                              <span className="text-[10px] text-neutral-400 truncate flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />{a.display_address}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-neutral-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />}
                                      </button>

                                      {isOpen && (
                                        <div className="border-t border-neutral-100 px-4 py-3 bg-white">
                                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                                            <InfoRow icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={a.client_email} />
                                            {a.display_phone && <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={a.display_phone} />}
                                            {a.display_address && <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="Address" value={a.display_address} />}
                                            {a.display_pool_type && <InfoRow icon={<Waves className="w-3.5 h-3.5" />} label="Pool Type" value={a.display_pool_type} />}
                                            {a.display_pool_cover && <InfoRow icon={<Waves className="w-3.5 h-3.5" />} label="Cover" value={a.display_pool_cover} />}
                                            {a.display_backyard_access && <InfoRow icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Backyard Access" value={a.display_backyard_access} />}
                                            {a.service_type?.toLowerCase().includes('opening') && a.display_pool_opening && (
                                              <InfoRow icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Opening Package" value={a.display_pool_opening} />
                                            )}
                                            {a.service_type?.toLowerCase().includes('opening') && a.display_opening_add_ons && (
                                              <InfoRow icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Opening Add-ons" value={a.display_opening_add_ons} />
                                            )}
                                            {a.service_type?.toLowerCase().includes('closing') && a.display_pool_closing && (
                                              <InfoRow icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Closing Package" value={a.display_pool_closing} />
                                            )}
                                            {a.service_type?.toLowerCase().includes('closing') && a.display_closing_add_ons && (
                                              <InfoRow icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Closing Add-ons" value={a.display_closing_add_ons} />
                                            )}
                                            {a.service_type?.toLowerCase().includes('maintenance') && a.display_pool_maintenance && (
                                              <InfoRow icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Maintenance" value={a.display_pool_maintenance} />
                                            )}
                                          </div>
                                          {a.admin_note && (
                                            <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg">
                                              <p className="text-xs font-medium text-amber-700">Note: {a.admin_note}</p>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Send CTA at bottom */}
        {!loading && totalJobs > 0 && (
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-neutral-900">Ready to send?</p>
              <p className="text-sm text-neutral-500 mt-0.5">
                {totalJobs} service{totalJobs !== 1 ? 's' : ''} across {totalDays} day{totalDays !== 1 ? 's' : ''} · <strong>theo@novopiscines.ca</strong>
              </p>
            </div>
            <button
              onClick={sendConfirmationEmail}
              disabled={sending}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition disabled:opacity-50 shrink-0"
            >
              {sent
                ? <><CheckCircle2 className="w-4 h-4" /> Sent — Resend</>
                : <><Send className="w-4 h-4" /> {sending ? 'Sending…' : 'Send Confirmation Email'}</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4 flex items-center gap-3">
      {icon}
      <div>
        <p className="text-lg font-bold text-neutral-900">{value}</p>
        <p className="text-xs text-neutral-500">{label}</p>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-neutral-400 flex items-center gap-1 mb-0.5">{icon}{label}</p>
      <p className="text-sm text-neutral-800 font-medium">{value}</p>
    </div>
  );
}
