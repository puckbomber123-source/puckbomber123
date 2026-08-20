import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Clock, CheckCircle2, FileText, DollarSign, Star,
  Search, RefreshCw, ChevronRight, MapPin, StickyNote, Calendar,
  User, Phone, ExternalLink, AlertCircle, Loader2, X, CheckSquare,
  XCircle, ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface JobCard {
  id: string;
  client_name: string | null;
  email: string;
  service_type: string;
  event_date: string;
  status: string;
  job_status: string | null;
  custom_note: string | null;
  custom_job_name: string | null;
  balance_due: number | null;
  assignment_id: string | null;
  invoice_number: string | null;
  invoiced: boolean;
  amount: number | null;
  linked_report_id: string | null;
  report_completed: boolean;
}

interface ClientInfo {
  email: string;
  city: string | null;
  address: string | null;
  phone: string | null;
}

const STAGES = [
  { key: 'awaiting_booking_request', label: 'Booking Request', icon: <Clock className="w-4 h-4" />, headerBg: 'bg-amber-50', headerText: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400' },
  { key: 'booked', label: 'Booked', icon: <CheckCircle2 className="w-4 h-4" />, headerBg: 'bg-blue-50', headerText: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-400' },
  { key: 'ready_for_invoice', label: 'To Be Invoiced', icon: <FileText className="w-4 h-4" />, headerBg: 'bg-teal-50', headerText: 'text-teal-700', border: 'border-teal-200', dot: 'bg-teal-400' },
  { key: 'invoiced', label: 'Invoiced', icon: <DollarSign className="w-4 h-4" />, headerBg: 'bg-green-50', headerText: 'text-green-700', border: 'border-green-200', dot: 'bg-green-400' },
  { key: 'awaiting_review', label: 'Collect 5-Star Review', icon: <Star className="w-4 h-4" />, headerBg: 'bg-amber-50', headerText: 'text-amber-700', border: 'border-amber-300', dot: 'bg-amber-400' },
  { key: 'complete', label: 'Complete', icon: <CheckCircle2 className="w-4 h-4" />, headerBg: 'bg-green-50', headerText: 'text-green-700', border: 'border-green-300', dot: 'bg-green-500' },
  { key: 'cancelled', label: 'Cancelled', icon: <XCircle className="w-4 h-4" />, headerBg: 'bg-red-50', headerText: 'text-red-700', border: 'border-red-200', dot: 'bg-red-400' },
] as const;

const STAGE_KEYS = STAGES.map(s => s.key);

function stageConfig(key: string) {
  return STAGES.find(s => s.key === key) || STAGES[0];
}

function nextStageKey(current: string): string | null {
  const idx = STAGE_KEYS.indexOf(current as typeof STAGE_KEYS[number]);
  if (idx === -1 || idx >= STAGE_KEYS.length - 1) return null;
  return STAGE_KEYS[idx + 1];
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

// Transition rules: what stages can you move TO from a given stage?
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  awaiting_booking_request: ['booked', 'cancelled'],
  booked: ['ready_for_invoice', 'cancelled'],
  ready_for_invoice: ['invoiced', 'cancelled'],
  invoiced: ['awaiting_review', 'cancelled'],
  awaiting_review: ['complete', 'cancelled'],
  complete: [],
  cancelled: [],
};

function canTransition(from: string, to: string): boolean {
  const allowed = ALLOWED_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

export default function InvoiceMonitor() {
  const navigate = useNavigate();
  const technician = JSON.parse(sessionStorage.getItem('technician') || '{}');
  const isAdminOverride = technician.staff_id === '002' || technician.id === '002';
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [clientsByEmail, setClientsByEmail] = useState<Record<string, ClientInfo>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filterStage, setFilterStage] = useState<string>('all');
  const [showSynced, setShowSynced] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const { data: bookingData, error: bkError } = await supabase
      .from('bookings')
      .select('id,client_name,email,service_type,event_date,status,job_status,custom_note,custom_job_name,balance_due,assignment_id')
      .order('event_date', { ascending: true });

    if (bkError) { toast.error('Failed to load jobs'); setJobs([]); setLoading(false); return; }

    const bookings = (bookingData || []) as JobCard[];

    const assignmentIds = bookings.map(b => b.assignment_id).filter(Boolean) as string[];
    let invoiceMap: Record<string, { invoice_number: string | null; invoiced: boolean; amount: number | null; linked_report_id: string | null }> = {};
    if (assignmentIds.length) {
      const { data: invData } = await supabase
        .from('invoices')
        .select('assignment_id,invoice_number,invoiced,amount,linked_report_id')
        .in('assignment_id', assignmentIds);
      for (const inv of (invData || []) as any[]) {
        if (inv.assignment_id) invoiceMap[inv.assignment_id] = inv;
      }
    }

    let assignmentReportMap: Record<string, { report_completed: boolean; linked_report_id: string | null }> = {};
    if (assignmentIds.length) {
      const { data: assignData } = await supabase
        .from('team_daily_assignments')
        .select('id,report_completed,linked_report_id')
        .in('id', assignmentIds);
      for (const a of (assignData || []) as any[]) {
        assignmentReportMap[a.id] = { report_completed: a.report_completed, linked_report_id: a.linked_report_id };
      }
    }

    const merged: JobCard[] = bookings.map(b => {
      const inv = b.assignment_id ? invoiceMap[b.assignment_id] : null;
      const assign = b.assignment_id ? assignmentReportMap[b.assignment_id] : null;
      return {
        ...b,
        invoice_number: inv?.invoice_number || null,
        invoiced: inv?.invoiced || false,
        amount: inv?.amount || null,
        linked_report_id: inv?.linked_report_id || assign?.linked_report_id || null,
        report_completed: assign?.report_completed || false,
      };
    });

    const today = todayStr();
    const updates: { id: string; job_status: string }[] = [];
    for (const m of merged) {
      const currentStage = m.job_status || 'awaiting_booking_request';
      let newStage = currentStage;

      if (m.invoiced && (currentStage === 'ready_for_invoice' || currentStage === 'booked' || currentStage === 'awaiting_booking_request')) {
        newStage = 'invoiced';
      }
      if (m.report_completed && newStage === 'invoiced') {
        newStage = 'awaiting_review';
      }
      if (m.report_completed && (newStage === 'awaiting_booking_request' || newStage === 'booked')) {
        newStage = 'ready_for_invoice';
      }

      if (newStage !== currentStage) {
        m.job_status = newStage;
        updates.push({ id: m.id, job_status: newStage });
      }
    }

    // Filter out old booking requests (before today) still in awaiting_booking_request — treated as stale
    const visible = merged.filter(m => {
      const stage = m.job_status || 'awaiting_booking_request';
      if (stage === 'awaiting_booking_request' && m.event_date < today) return false;
      return true;
    });

    if (updates.length > 0) {
      for (const u of updates) {
        await supabase.from('bookings').update({ job_status: u.job_status, updated_at: new Date().toISOString() }).eq('id', u.id);
      }
    }

    setJobs(visible);

    const emails = [...new Set(visible.map(m => m.email?.toLowerCase()).filter(Boolean))];
    if (emails.length) {
      const { data: clData } = await supabase
        .from('clients')
        .select('email,city,address,phone')
        .in('email', emails);
      const map: Record<string, ClientInfo> = {};
      for (const c of (clData || []) as ClientInfo[]) {
        if (c.email) map[c.email.toLowerCase()] = c;
      }
      setClientsByEmail(map);
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  async function advanceJob(job: JobCard) {
    const current = job.job_status || 'awaiting_booking_request';
    const next = nextStageKey(current);
    if (!next) { toast.error('Job is already at the final stage'); return; }
    if (!canTransition(current, next)) { toast.error(`Cannot move from ${stageConfig(current).label} to ${stageConfig(next).label}`); return; }
    setProcessingId(job.id);
    const { error } = await supabase.from('bookings')
      .update({ job_status: next, updated_at: new Date().toISOString() }).eq('id', job.id);
    if (error) toast.error('Failed to advance job');
    else { toast.success(`Moved to ${stageConfig(next).label}`); fetchJobs(); }
    setProcessingId(null);
  }

  async function setStage(job: JobCard, stage: string) {
    const current = job.job_status || 'awaiting_booking_request';
    if (current === stage) return;
    if (!canTransition(current, stage)) {
      if (!isAdminOverride) { toast.error(`Cannot move from ${stageConfig(current).label} to ${stageConfig(stage).label}`); return; }
      toast(`Admin override: moving to ${stageConfig(stage).label}`, { icon: '⚠️' });
    }
    setProcessingId(job.id);
    const { error } = await supabase.from('bookings')
      .update({ job_status: stage, updated_at: new Date().toISOString() }).eq('id', job.id);
    if (error) toast.error('Failed to update job status');
    else { toast.success(`Moved to ${stageConfig(stage).label}`); fetchJobs(); }
    setProcessingId(null);
  }

  async function bulkAdvance(stage: string) {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    // Check transition rules for all selected jobs
    const blocked: string[] = [];
    const allowedIds: string[] = [];
    for (const id of ids) {
      const job = jobs.find(j => j.id === id);
      if (!job) continue;
      const current = job.job_status || 'awaiting_booking_request';
      if (canTransition(current, stage) || isAdminOverride) {
        allowedIds.push(id);
      } else {
        blocked.push(job.client_name || job.email);
      }
    }
    if (blocked.length > 0) {
      toast.error(`${blocked.length} job(s) can't move to ${stageConfig(stage).label} from their current stage`);
    }
    if (allowedIds.length === 0) return;
    const { error } = await supabase.from('bookings')
      .update({ job_status: stage, updated_at: new Date().toISOString() }).in('id', allowedIds);
    if (error) toast.error('Failed to update jobs');
    else { toast.success(`Moved ${allowedIds.length} job(s) to ${stageConfig(stage).label}`); setSelectedIds(new Set()); fetchJobs(); }
  }

  async function syncToBeInvoiced() {
    setShowSynced(true);
    try {
      const { data: marked, error } = await supabase
        .from('team_daily_assignments')
        .select('id, assignment_date, team, client_email, title, service_type, linked_report_id')
        .eq('to_be_invoiced', true);
      if (error) throw error;

      const { data: existing } = await supabase.from('invoices').select('assignment_id');
      const existingIds = new Set((existing || []).map((i: any) => i.assignment_id));
      const toCreate = (marked || []).filter(a => !existingIds.has(a.id));

      if (toCreate.length === 0) { toast('All marked assignments already in invoice list', { icon: 'ℹ' }); return; }

      const rows = toCreate.map(a => ({
        assignment_id: a.id, client_email: a.client_email || '', client_name: a.title || a.client_email || '',
        service_date: a.assignment_date, service_type: a.service_type || '', team: a.team || '', invoiced: false, notes: '',
      }));
      const { error: insertError } = await supabase.from('invoices').insert(rows);
      if (insertError) throw insertError;

      const newAssignmentIds = toCreate.map(a => a.id);
      const { data: bkData } = await supabase.from('bookings')
        .select('id,job_status').in('assignment_id', newAssignmentIds);
      for (const bk of (bkData || []) as any[]) {
        if (bk.job_status === 'booked' || bk.job_status === 'awaiting_booking_request') {
          await supabase.from('bookings').update({ job_status: 'ready_for_invoice', updated_at: new Date().toISOString() }).eq('id', bk.id);
        }
      }

      toast.success(`Synced ${toCreate.length} job(s) — moved to To Be Invoiced`);
      fetchJobs();
    } catch (e: any) { toast.error(e.message || 'Sync failed'); }
    setShowSynced(false);
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAllInStage(stage: string) {
    const stageJobs = jobsByStage[stage] || [];
    setSelectedIds(prev => {
      const next = new Set(prev);
      const allSelected = stageJobs.every(j => next.has(j.id));
      if (allSelected) { stageJobs.forEach(j => next.delete(j.id)); }
      else { stageJobs.forEach(j => next.add(j.id)); }
      return next;
    });
  }

  const filteredJobs = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return jobs.filter(j => {
      if (filterStage !== 'all' && (j.job_status || 'awaiting_booking_request') !== filterStage) return false;
      if (!q) return true;
      return (j.client_name || '').toLowerCase().includes(q)
        || j.email.toLowerCase().includes(q)
        || j.service_type.toLowerCase().includes(q);
    });
  }, [jobs, searchQuery, filterStage]);

  const jobsByStage = useMemo(() => {
    const map: Record<string, JobCard[]> = {};
    for (const stage of STAGE_KEYS) map[stage] = [];
    for (const j of filteredJobs) {
      const stage = j.job_status || 'awaiting_booking_request';
      if (map[stage]) map[stage].push(j);
    }
    return map;
  }, [filteredJobs]);

  const stats = useMemo(() => {
    const total = jobs.length;
    const byStage: Record<string, number> = {};
    for (const s of STAGE_KEYS) byStage[s] = 0;
    for (const j of jobs) { const s = j.job_status || 'awaiting_booking_request'; if (byStage[s] !== undefined) byStage[s]++; }
    return { total, byStage };
  }, [jobs]);

  function getValidTargets(currentStage: string): string[] {
    const allowed = ALLOWED_TRANSITIONS[currentStage] || [];
    if (isAdminOverride) {
      // Admin override can go to any stage except the current one
      return STAGE_KEYS.filter(s => s !== currentStage);
    }
    return allowed;
  }

  return (
    <div className="page-shell">
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="btn-icon"><ArrowLeft className="w-4 h-4" /></button>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-600" />
              <span className="font-semibold text-neutral-900">Job Status Board</span>
              {isAdminOverride && (
                <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                  <ShieldAlert className="w-3 h-3" />Override
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={syncToBeInvoiced} disabled={showSynced} className="btn-primary btn-sm">
              <RefreshCw className={`w-3.5 h-3.5 ${showSynced ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync Completed Jobs</span>
            </button>
            <button onClick={fetchJobs} className="btn-icon">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-500' : ''}`} />
            </button>
          </div>
        </div>
      </nav>

      <main className="page-content space-y-4">
        {/* Stats bar */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {STAGES.map(s => (
            <button key={s.key} onClick={() => setFilterStage(filterStage === s.key ? 'all' : s.key)}
              className={`rounded-xl border p-3 text-left transition ${filterStage === s.key ? 'ring-2 ring-brand-400 ' + s.border : s.border} ${s.headerBg}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={s.headerText}>{s.icon}</span>
                <span className={`text-xs font-semibold ${s.headerText}`}>{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-neutral-900">{stats.byStage[s.key]}</p>
            </button>
          ))}
        </div>

        {/* Search + filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input type="text" placeholder="Search by client, email, service…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="form-input pl-9" />
          </div>
          {filterStage !== 'all' && (
            <button onClick={() => setFilterStage('all')} className="btn-secondary btn-sm flex items-center gap-1">
              <X className="w-3.5 h-3.5" />Clear filter
            </button>
          )}
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="sticky top-14 z-40 flex items-center gap-2 flex-wrap p-3 rounded-xl border border-brand-200 bg-brand-50 shadow-sm">
            <span className="text-sm font-semibold text-brand-800">{selectedIds.size} selected</span>
            <span className="text-xs text-brand-600">Move to:</span>
            {STAGE_KEYS.map(s => (
              <button key={s} onClick={() => bulkAdvance(s)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${stageConfig(s).headerBg} ${stageConfig(s).headerText} hover:opacity-80`}>
                {stageConfig(s).label}
              </button>
            ))}
            <button onClick={() => setSelectedIds(new Set())} className="btn-icon ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16 text-neutral-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading jobs…
          </div>
        )}

        {/* Kanban board */}
        {!loading && (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-3 min-w-max">
              {STAGES.map(stage => {
                const stageJobs = jobsByStage[stage.key] || [];
                const allSelected = stageJobs.length > 0 && stageJobs.every(j => selectedIds.has(j.id));

                return (
                  <div key={stage.key} className={`w-72 shrink-0 rounded-2xl border ${stage.border} bg-neutral-50/50 flex flex-col max-h-[calc(100vh-280px)]`}>
                    {/* Column header */}
                    <div className={`px-3 py-3 rounded-t-2xl ${stage.headerBg} border-b ${stage.border}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={stage.headerText}>{stage.icon}</span>
                          <span className={`text-sm font-bold ${stage.headerText}`}>{stage.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {stageJobs.length > 0 && (
                            <button onClick={() => selectAllInStage(stage.key)} className="text-neutral-400 hover:text-brand-600 transition" title={allSelected ? 'Deselect all' : 'Select all'}>
                              <CheckSquare className={`w-3.5 h-3.5 ${allSelected ? 'text-brand-600' : ''}`} />
                            </button>
                          )}
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white ${stage.headerText}`}>{stageJobs.length}</span>
                        </div>
                      </div>
                    </div>

                    {/* Cards */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      {stageJobs.length === 0 && (
                        <p className="text-xs text-neutral-300 text-center py-6">No jobs</p>
                      )}
                      {stageJobs.map(job => {
                        const client = clientsByEmail[job.email?.toLowerCase()];
                        const isExpanded = expandedJob === job.id;
                        const isSelected = selectedIds.has(job.id);
                        const currentStage = job.job_status || 'awaiting_booking_request';
                        const next = nextStageKey(currentStage);
                        const canAdvance = next ? canTransition(currentStage, next) : false;
                        const validTargets = getValidTargets(currentStage);
                        const processing = processingId === job.id;
                        const isCancelled = currentStage === 'cancelled';
                        const isComplete = currentStage === 'complete';

                        return (
                          <div key={job.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden transition ${isSelected ? 'border-brand-400 ring-1 ring-brand-300' : 'border-neutral-200'} ${isExpanded ? 'ring-1 ring-brand-300' : ''} ${isCancelled ? 'opacity-60' : ''}`}>
                            {/* Card body */}
                            <div className="p-3">
                              <div className="flex items-start gap-2">
                                <button
                                  onClick={() => toggleSelect(job.id)}
                                  className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition ${isSelected ? 'bg-brand-600 border-brand-600' : 'border-neutral-300 hover:border-brand-400'}`}
                                >
                                  {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                                </button>
                                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedJob(isExpanded ? null : job.id)}>
                                  <p className="text-sm font-semibold text-neutral-900 truncate">{job.client_name || job.email}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <Calendar className="w-3 h-3 text-neutral-400" />
                                    <span className="text-xs text-neutral-500">{job.event_date}</span>
                                  </div>
                                  <p className="text-xs text-neutral-400 mt-0.5 truncate">
                                    {job.service_type === 'Custom Job' ? (job.custom_job_name || 'Custom Job') : job.service_type}
                                  </p>
                                  {client?.city && (
                                    <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />{client.city}
                                    </p>
                                  )}
                                  {job.custom_note && (
                                    <p className="text-xs text-amber-600 mt-1 flex items-start gap-1 bg-amber-50 rounded-lg px-2 py-1">
                                      <StickyNote className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                      <span className="truncate">{job.custom_note}</span>
                                    </p>
                                  )}
                                  {job.balance_due != null && Number(job.balance_due) > 0 && (
                                    <p className="text-xs text-amber-700 font-semibold mt-1 flex items-center gap-1">
                                      <DollarSign className="w-3 h-3" />Balance: ${Number(job.balance_due).toFixed(2)}
                                    </p>
                                  )}
                                  {job.invoice_number && (
                                    <p className="text-xs text-green-600 font-medium mt-1">Invoice: {job.invoice_number}</p>
                                  )}
                                  {job.report_completed && (
                                    <p className="text-xs text-blue-600 font-medium mt-1 flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" />Report submitted
                                    </p>
                                  )}
                                  {isCancelled && (
                                    <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                                      <XCircle className="w-3 h-3" />Cancelled
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Expanded detail */}
                            {isExpanded && (
                              <div className="px-3 pb-3 border-t border-neutral-100 pt-2 space-y-2">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <p className="text-neutral-400 font-medium">Email</p>
                                    <p className="text-neutral-600 truncate">{job.email}</p>
                                  </div>
                                  {client?.phone && (
                                    <div>
                                      <p className="text-neutral-400 font-medium">Phone</p>
                                      <p className="text-neutral-600">{client.phone}</p>
                                    </div>
                                  )}
                                  {client?.address && (
                                    <div className="col-span-2">
                                      <p className="text-neutral-400 font-medium">Address</p>
                                      <p className="text-neutral-600">{client.address}{client.city ? `, ${client.city}` : ''}</p>
                                    </div>
                                  )}
                                  {job.amount != null && (
                                    <div>
                                      <p className="text-neutral-400 font-medium">Amount</p>
                                      <p className="text-neutral-600">${job.amount.toFixed(2)}</p>
                                    </div>
                                  )}
                                  {job.linked_report_id && (
                                    <div className="col-span-2">
                                      <button onClick={() => navigate('/submit-report', { state: { reportId: job.linked_report_id, assignmentId: job.assignment_id } })}
                                        className="text-brand-600 hover:underline flex items-center gap-1 text-xs font-medium">
                                        <ExternalLink className="w-3 h-3" />View Service Report
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* Advance button — only if next stage is allowed */}
                                {next && canAdvance && (
                                  <button onClick={() => advanceJob(job)} disabled={processing}
                                    className="w-full btn-sm btn-primary btn flex items-center justify-center gap-1.5">
                                    {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                    {processing ? 'Moving…' : `Move to ${stageConfig(next).label}`}
                                  </button>
                                )}
                                {/* Cancel button — available from any non-terminal stage */}
                                {!isCancelled && !isComplete && (
                                  <button onClick={() => setStage(job, 'cancelled')} disabled={processing}
                                    className="w-full btn-sm bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 btn flex items-center justify-center gap-1.5">
                                    <XCircle className="w-3.5 h-3.5" />Cancel Job
                                  </button>
                                )}

                                {/* Quick jump — only show allowed targets */}
                                {validTargets.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {validTargets.map(s => (
                                      <button key={s} onClick={() => setStage(job, s)}
                                        className={`text-[10px] px-2 py-1 rounded-lg font-medium transition ${
                                          currentStage === s
                                            ? 'bg-brand-600 text-white'
                                            : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                                        }`}>
                                        {stageConfig(s).label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {isCancelled && (
                                  <p className="text-xs text-red-500 text-center py-1">Cancelled jobs cannot be moved</p>
                                )}
                                {isComplete && !isAdminOverride && (
                                  <p className="text-xs text-neutral-400 text-center py-1">Complete jobs cannot be moved</p>
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
          </div>
        )}

        {!loading && filteredJobs.length === 0 && (
          <div className="empty-state">
            <FileText className="empty-state-icon" />
            <p className="empty-state-title">No jobs found</p>
            <p className="empty-state-desc">{searchQuery ? 'Try a different search.' : 'Jobs will appear here once bookings are created.'}</p>
          </div>
        )}
      </main>
    </div>
  );
}
