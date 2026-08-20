import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Send, CheckCircle2, XCircle, Clock,
  CreditCard as Edit2, Search, RefreshCw, ChevronDown, ChevronUp,
  Calendar, User, FileText, Check, X, Zap, Phone, MapPin,
  Waves, BookMarked, Briefcase, ArrowUpDown, ArrowUp, ArrowDown, DollarSign,
  CheckSquare, Map, StickyNote, ChevronRight, CircleDot, Star,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { parseAddOns } from '../lib/addons';

interface Booking {
  id: string;
  email: string;
  service_type: string;
  event_date: string;
  start_time: string;
  end_time: string;
  service_team: string;
  custom_note: string | null;
  custom_job_name: string | null;
  created_at: string;
  status: string;
  requested_by: string;
  client_name: string;
  rejection_reason: string | null;
  approved_by: string;
  approved_at: string | null;
  assignment_id: string | null;
  n8n_triggered: boolean;
  n8n_triggered_at: string | null;
  n8n_trigger_error: string | null;
  pre_book_date: string | null;
  updated_at: string;
  balance_due: number | null;
  closing_add_ons: string | null;
  job_status: string | null;
}

export const JOB_STAGES = [
  'awaiting_booking_request',
  'booked',
  'ready_for_invoice',
  'invoiced',
  'awaiting_review',
  'complete',
] as const;

const JOB_STAGE_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode; dot: string }> = {
  awaiting_booking_request: { label: 'Awaiting Booking', cls: 'badge-yellow', icon: <Clock className="w-3 h-3" />, dot: 'bg-amber-400' },
  booked:                   { label: 'Booked',           cls: 'badge-blue',   icon: <CheckCircle2 className="w-3 h-3" />, dot: 'bg-blue-400' },
  ready_for_invoice:        { label: 'Ready for Invoice',cls: 'badge-teal',   icon: <FileText className="w-3 h-3" />, dot: 'bg-teal-400' },
  invoiced:                 { label: 'Invoiced',         cls: 'badge-green',  icon: <DollarSign className="w-3 h-3" />, dot: 'bg-green-400' },
  awaiting_review:         { label: 'Awaiting Review',  cls: 'badge-yellow', icon: <Star className="w-3 h-3" />, dot: 'bg-amber-400' },
  complete:                { label: 'Complete',         cls: 'badge-green',  icon: <CheckCircle2 className="w-3 h-3" />, dot: 'bg-green-500' },
};

function jobStageCfg(status: string | null) {
  return (status && JOB_STAGE_CONFIG[status]) || JOB_STAGE_CONFIG.awaiting_booking_request;
}

function nextJobStage(current: string): string | null {
  const idx = JOB_STAGES.indexOf(current as typeof JOB_STAGES[number]);
  if (idx === -1 || idx >= JOB_STAGES.length - 1) return null;
  return JOB_STAGES[idx + 1];
}

type ClientRow = {
  id: string;
  email?: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  zip: string | null;
  pool_type: string | null;
  pool_cover: string | null;
  pool_opening: string | null;
  pool_closing: string | null;
  pool_maintenance: string | null;
  backyard_access_approval: string | null;
  pool_opening_add_on: string | null;
  pool_closing_add_ons: string | null;
  pool_size: string | null;
};

const CLIENT_SELECT = 'id,email,first_name,last_name,phone,address,city,zip,pool_type,pool_cover,pool_opening,pool_closing,pool_maintenance,backyard_access_approval,pool_opening_add_on,pool_closing_add_ons,pool_size';

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  cls: 'badge-yellow', icon: <Clock className="w-3 h-3" /> },
  approved: { label: 'Approved', cls: 'badge-green',  icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected: { label: 'Rejected', cls: 'badge-red',    icon: <XCircle className="w-3 h-3" /> },
  pre_book: { label: 'Pre-Book', cls: 'badge-blue',   icon: <BookMarked className="w-3 h-3" /> },
};

function statusCfg(status: string) {
  return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
}
function clean(v?: string | null) { return v?.trim() || '—'; }
function fullAddress(c?: ClientRow) {
  if (!c) return '—';
  return [c.address?.trim(), c.city?.trim(), c.zip?.trim()].filter(Boolean).join(', ') || '—';
}
function serviceInfoRows(serviceType: string, c?: ClientRow) {
  const s = serviceType.toLowerCase();
  const base = [
    { label: 'Pool Type', value: c?.pool_type, icon: <Waves className="w-3 h-3" /> },
    { label: 'Backyard Access', value: c?.backyard_access_approval, icon: <CheckCircle2 className="w-3 h-3" /> },
  ];
  if (s.includes('opening') || s.includes('startup')) return [...base,
    { label: 'Opening Package', value: c?.pool_opening, icon: <FileText className="w-3 h-3" /> },
    { label: 'Opening Add-ons', value: c?.pool_opening_add_on, icon: <Zap className="w-3 h-3" /> },
    { label: 'Cover Type', value: c?.pool_cover, icon: <FileText className="w-3 h-3" /> },
  ];
  if (s.includes('closing')) return [...base,
    { label: 'Closing Package', value: c?.pool_closing, icon: <FileText className="w-3 h-3" /> },
    { label: 'Closing Add-ons', value: c?.pool_closing_add_ons, icon: <Zap className="w-3 h-3" /> },
    { label: 'Cover Type', value: c?.pool_cover, icon: <FileText className="w-3 h-3" /> },
  ];
  if (s.includes('maintenance')) return [...base,
    { label: 'Maintenance', value: c?.pool_maintenance, icon: <FileText className="w-3 h-3" /> },
    { label: 'Cover Type', value: c?.pool_cover, icon: <FileText className="w-3 h-3" /> },
  ];
  if (s.includes('liner')) return [
    { label: 'Pool Type', value: c?.pool_type, icon: <Waves className="w-3 h-3" /> },
    { label: 'Backyard Access', value: c?.backyard_access_approval, icon: <CheckCircle2 className="w-3 h-3" /> },
    { label: 'Cover Type', value: c?.pool_cover, icon: <FileText className="w-3 h-3" /> },
  ];
  return [...base,
    { label: 'Opening', value: c?.pool_opening, icon: <FileText className="w-3 h-3" /> },
    { label: 'Closing', value: c?.pool_closing, icon: <FileText className="w-3 h-3" /> },
    { label: 'Maintenance', value: c?.pool_maintenance, icon: <FileText className="w-3 h-3" /> },
  ];
}

export default function BookingRequests() {
  const navigate = useNavigate();
  const technician = JSON.parse(sessionStorage.getItem('technician') || '{}');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clientsByEmail, setClientsByEmail] = useState<Record<string, ClientRow>>({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [editForm, setEditForm] = useState<Partial<Booking>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'event_date' | 'created_at'>('event_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [assignDateId, setAssignDateId] = useState<string | null>(null);
  const [assignDate, setAssignDate] = useState('');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [view, setView] = useState<'list' | 'weekly'>('list');

  const fetchClientRows = useCallback(async (loaded: Booking[]) => {
    const emails = [...new Set(loaded.map(b => b.email?.toLowerCase()).filter(Boolean))];
    if (!emails.length) { setClientsByEmail({}); return; }
    const { data, error } = await supabase.from('clients').select(CLIENT_SELECT).in('email', emails);
    if (error) { toast.error('Client info failed to load'); return; }
    const map: Record<string, ClientRow> = {};
    (data || []).forEach((c: ClientRow) => { if (c.email) map[c.email.toLowerCase()] = c; });
    setClientsByEmail(map);
  }, []);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('bookings').select('*').order(sortBy, { ascending: sortDir === 'asc' });
    if (filterStatus !== 'all') q = q.eq('status', filterStatus);
    const { data, error } = await q;
    if (error) { toast.error('Failed to load requests'); setBookings([]); }
    else { const rows = data || []; setBookings(rows); await fetchClientRows(rows); }
    setLoading(false);
  }, [filterStatus, sortBy, sortDir, fetchClientRows]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const preBookCount = bookings.filter(b => b.status === 'pre_book').length;

  async function approveBooking(booking: Booking) {
    setProcessingId(booking.id);
    try {
      if (booking.status !== 'pending') throw new Error('Only pending bookings can be approved.');
      let clientRow = clientsByEmail[booking.email.toLowerCase()];
      if (!clientRow) {
        const { data } = await supabase.from('clients').select(CLIENT_SELECT).eq('email', booking.email.toLowerCase()).maybeSingle<ClientRow>();
        clientRow = data || undefined;
      }
      const displayAddress = clientRow ? [clientRow.address?.trim(), clientRow.city?.trim(), clientRow.zip?.trim()].filter(Boolean).join(', ') : '';
      const { data: assignmentData, error: assignError } = await supabase
        .from('team_daily_assignments')
        .insert({
          assignment_date: booking.event_date, team: null, client_email: booking.email, client_id: clientRow?.id || null,
          sort_order: 9999, title: booking.client_name || booking.email, service_type: booking.service_type,
          admin_note: booking.custom_note || '', display_address: displayAddress,
          display_phone: clientRow?.phone || '', display_pool_type: clientRow?.pool_type || '',
          display_pool_cover: clientRow?.pool_cover || '', display_pool_opening: clientRow?.pool_opening || '',
          display_pool_closing: clientRow?.pool_closing || '', display_pool_maintenance: clientRow?.pool_maintenance || '',
          display_backyard_access: clientRow?.backyard_access_approval || '',
          display_opening_add_ons: clientRow?.pool_opening_add_on || '',
          display_closing_add_ons: booking.closing_add_ons || clientRow?.pool_closing_add_ons || '',
          status: 'Unallocated', assigned_technician_id: null, report_completed: false, created_from_booking: true,
          created_by: technician.staff_id || technician.id || technician.name || '',
        })
        .select('id').single();
      if (assignError) throw assignError;
      const approvedAt = new Date().toISOString();
      const approvedBy = technician.staff_id || technician.id || technician.name || '';
      const { data: approvedBooking, error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'approved', job_status: 'booked', approved_by: approvedBy, approved_at: approvedAt, assignment_id: assignmentData.id, n8n_triggered: true, updated_at: approvedAt })
        .eq('id', booking.id).eq('status', 'pending').select('*').single();
      if (updateError) throw updateError;
      if (!approvedBooking) throw new Error('Booking approval failed.');
      const { error: queueError } = await supabase.from('n8n_booking_queue').upsert(approvedBooking, { onConflict: 'id' });
      if (queueError) throw new Error(queueError.message);

      // Send confirmation email to client (non-blocking — don't fail approval if email fails)
      try {
        const firstName = clientRow?.first_name || booking.client_name?.split(' ')[0] || undefined;
        await supabase.functions.invoke('send-booking-confirmation', {
          body: {
            clientEmail: booking.email,
            clientName: booking.client_name || booking.email,
            clientFirstName: firstName,
            serviceType: booking.service_type,
            serviceDate: booking.event_date,
            address: clientRow ? [clientRow.address?.trim(), clientRow.city?.trim(), clientRow.zip?.trim()].filter(Boolean).join(', ') : undefined,
            poolType: clientRow?.pool_type || undefined,
            adminNote: booking.custom_note || undefined,
            balanceDue: booking.balance_due ?? null,
          },
        });
      } catch (emailErr) {
        console.warn('Confirmation email failed (non-fatal):', emailErr);
      }

      toast.success('Approved — assignment created & confirmation email sent');
      fetchBookings();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Approval failed'); }
    finally { setProcessingId(null); }
  }

  async function advanceJobStatus(booking: Booking) {
    const next = nextJobStage(booking.job_status || 'awaiting_booking_request');
    if (!next) { toast.error('Job is already complete'); return; }
    setProcessingId(booking.id);
    const { error } = await supabase.from('bookings')
      .update({ job_status: next, updated_at: new Date().toISOString() }).eq('id', booking.id);
    if (error) toast.error('Failed to update job status');
    else { toast.success(`Job moved to ${jobStageCfg(next).label}`); fetchBookings(); }
    setProcessingId(null);
  }

  async function setJobStatus(booking: Booking, status: string) {
    setProcessingId(booking.id);
    const { error } = await supabase.from('bookings')
      .update({ job_status: status, updated_at: new Date().toISOString() }).eq('id', booking.id);
    if (error) toast.error('Failed to update job status');
    else { toast.success(`Job status set to ${jobStageCfg(status).label}`); fetchBookings(); }
    setProcessingId(null);
  }

  async function rejectBooking(booking: Booking) {
    setProcessingId(booking.id);
    const { error } = await supabase.from('bookings').update({
      status: 'rejected', rejection_reason: rejectionReason.trim(),
      job_status: 'cancelled',
      approved_by: technician.staff_id || technician.id || technician.name || '',
      updated_at: new Date().toISOString(),
    }).eq('id', booking.id);
    if (error) toast.error(error.message || 'Rejection failed');
    else { toast.success('Request rejected'); setRejectingId(null); setRejectionReason(''); fetchBookings(); }
    setProcessingId(null);
  }

  async function saveEdit(id: string) {
    const { error } = await supabase.from('bookings').update({ ...editForm, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) toast.error('Save failed');
    else { toast.success('Updated'); setEditingId(null); fetchBookings(); }
  }

  async function convertPreBookToPending(booking: Booking) {
    if (!assignDate) { toast.error('Choose a service date'); return; }
    setProcessingId(booking.id);
    const { error } = await supabase.from('bookings').update({
      status: 'pending', event_date: assignDate,
      start_time: new Date(`${assignDate}T08:00:00-04:00`).toISOString(),
      end_time: new Date(`${assignDate}T17:00:00-04:00`).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', booking.id);
    if (error) toast.error('Failed to assign date');
    else { toast.success('Converted to pending'); setAssignDateId(null); setAssignDate(''); fetchBookings(); }
    setProcessingId(null);
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pendingIds = filtered.filter(b => b.status === 'pending').map(b => b.id);
    if (pendingIds.every(id => selectedIds.has(id))) setSelectedIds(new Set());
    else setSelectedIds(new Set(pendingIds));
  };

  const bulkApprove = async () => {
    const targets = filtered.filter(b => b.status === 'pending' && selectedIds.has(b.id));
    if (!targets.length) { toast.error('No pending bookings selected'); return; }
    setBulkProcessing(true);
    let ok = 0, fail = 0;
    for (const booking of targets) {
      try {
        let clientRow = clientsByEmail[booking.email.toLowerCase()];
        if (!clientRow) {
          const { data } = await supabase.from('clients').select(CLIENT_SELECT).eq('email', booking.email.toLowerCase()).maybeSingle<ClientRow>();
          clientRow = data || undefined;
        }
        const displayAddress = clientRow ? [clientRow.address?.trim(), clientRow.city?.trim(), clientRow.zip?.trim()].filter(Boolean).join(', ') : '';
        const { data: assignmentData, error: assignError } = await supabase
          .from('team_daily_assignments')
          .insert({
            assignment_date: booking.event_date, team: null, client_email: booking.email, client_id: clientRow?.id || null,
            sort_order: 9999, title: booking.client_name || booking.email, service_type: booking.service_type,
            admin_note: booking.custom_note || '', display_address: displayAddress,
            display_phone: clientRow?.phone || '', display_pool_type: clientRow?.pool_type || '',
            display_pool_cover: clientRow?.pool_cover || '', display_pool_opening: clientRow?.pool_opening || '',
            display_pool_closing: clientRow?.pool_closing || '', display_pool_maintenance: clientRow?.pool_maintenance || '',
            display_backyard_access: clientRow?.backyard_access_approval || '',
            display_opening_add_ons: clientRow?.pool_opening_add_on || '',
            display_closing_add_ons: booking.closing_add_ons || clientRow?.pool_closing_add_ons || '',
            status: 'Unallocated', assigned_technician_id: null, report_completed: false, created_from_booking: true,
            created_by: technician.staff_id || technician.id || technician.name || '',
          }).select('id').single();
        if (assignError) throw assignError;
        const approvedAt = new Date().toISOString();
        const approvedBy = technician.staff_id || technician.id || technician.name || '';
        const { data: approvedBooking, error: updateError } = await supabase
          .from('bookings').update({ status: 'approved', job_status: 'booked', approved_by: approvedBy, approved_at: approvedAt, assignment_id: assignmentData.id, n8n_triggered: true, updated_at: approvedAt })
          .eq('id', booking.id).eq('status', 'pending').select('*').single();
        if (updateError) throw updateError;
        if (!approvedBooking) throw new Error('Approval failed');
        await supabase.from('n8n_booking_queue').upsert(approvedBooking, { onConflict: 'id' });
        try {
          const firstName = clientRow?.first_name || booking.client_name?.split(' ')[0] || undefined;
          await supabase.functions.invoke('send-booking-confirmation', { body: {
            clientEmail: booking.email, clientName: booking.client_name || booking.email, clientFirstName: firstName,
            serviceType: booking.service_type, serviceDate: booking.event_date,
            address: clientRow ? [clientRow.address?.trim(), clientRow.city?.trim(), clientRow.zip?.trim()].filter(Boolean).join(', ') : undefined,
            poolType: clientRow?.pool_type || undefined, adminNote: booking.custom_note || undefined, balanceDue: booking.balance_due ?? null,
          }});
        } catch {}
        ok++;
      } catch { fail++; }
    }
    setBulkProcessing(false);
    setSelectedIds(new Set());
    setBulkMode(false);
    if (fail === 0) toast.success(`${ok} booking${ok !== 1 ? 's' : ''} approved`);
    else toast.error(`${ok} approved, ${fail} failed`);
    fetchBookings();
  };

  const bulkReject = async () => {
    const targets = filtered.filter(b => b.status === 'pending' && selectedIds.has(b.id));
    if (!targets.length) { toast.error('No pending bookings selected'); return; }
    setBulkProcessing(true);
    let ok = 0, fail = 0;
    for (const booking of targets) {
      const { error } = await supabase.from('bookings').update({
        status: 'rejected', rejection_reason: 'Bulk rejected',
        job_status: 'cancelled',
        approved_by: technician.staff_id || technician.id || technician.name || '',
        updated_at: new Date().toISOString(),
      }).eq('id', booking.id);
      if (error) fail++; else ok++;
    }
    setBulkProcessing(false);
    setSelectedIds(new Set());
    setBulkMode(false);
    if (fail === 0) toast.success(`${ok} booking${ok !== 1 ? 's' : ''} rejected`);
    else toast.error(`${ok} rejected, ${fail} failed`);
    fetchBookings();
  };

  const filtered = bookings.filter(b => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (b.client_name || '').toLowerCase().includes(q) || (b.email || '').toLowerCase().includes(q)
      || (b.service_type || '').toLowerCase().includes(q) || (b.requested_by || '').toLowerCase().includes(q);
  });

  const statusTabs = [
    { key: 'pending',  label: 'Pending',  count: pendingCount },
    { key: 'pre_book', label: 'Pre-Book', count: preBookCount },
    { key: 'approved', label: 'Approved', count: 0 },
    { key: 'rejected', label: 'Rejected', count: 0 },
    { key: 'all',      label: 'All',      count: 0 },
  ];

  return (
    <div className="page-shell">
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="btn-icon"><ArrowLeft className="w-4 h-4" /></button>
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-brand-600" />
              <span className="font-semibold text-neutral-900">Booking Requests</span>
              {pendingCount > 0 && filterStatus !== 'all' && (
                <span className="badge-yellow">{pendingCount}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white rounded-xl border border-neutral-200 p-1 shadow-card">
              <button onClick={() => setView('list')} className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${view === 'list' ? 'bg-brand-600 text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-50'}`}>
                <FileText className="w-3.5 h-3.5" /><span className="hidden sm:inline">List</span>
              </button>
              <button onClick={() => setView('weekly')} className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${view === 'weekly' ? 'bg-brand-600 text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-50'}`}>
                <Map className="w-3.5 h-3.5" /><span className="hidden sm:inline">Weekly Map</span>
              </button>
            </div>
            <button onClick={() => navigate('/book-client')} className="btn-primary btn-sm">
              <Send className="w-3.5 h-3.5" /><span className="hidden sm:inline">New</span>
            </button>
            <button onClick={fetchBookings} className="btn-icon">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-500' : ''}`} />
            </button>
          </div>
        </div>
      </nav>

      <main className="page-content space-y-4">
        {view === 'weekly' ? (
          <WeeklyCityMap bookings={bookings} clientsByEmail={clientsByEmail} loading={loading} onBookingClick={(b) => { setExpandedId(b.id); setView('list'); }} />
        ) : (
        <>
        {/* Status tabs */}
        <div className="flex items-center gap-1 bg-white rounded-xl border border-neutral-200 p-1 w-fit shadow-card overflow-x-auto">
          {statusTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                filterStatus === tab.key
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1.5 text-xs font-bold ${filterStatus === tab.key ? 'opacity-80' : 'text-amber-600'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Sort + Search */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-neutral-500">Sort:</span>
          {(['event_date', 'Service Date'], ['created_at', 'Submitted'] as const) && (
            ([['event_date', 'Service Date'], ['created_at', 'Submitted']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => sortBy === key ? setSortDir(d => d === 'asc' ? 'desc' : 'asc') : (setSortBy(key), setSortDir('asc'))}
                className={`btn-sm flex items-center gap-1 ${sortBy === key ? 'bg-brand-600 text-white border-brand-600' : 'btn-secondary'}`}
              >
                {label}
                {sortBy === key ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-40" />}
              </button>
            ))
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by client, email, service or staff…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="form-input pl-9"
          />
        </div>

        {loading && (
          <div className="empty-state">
            <div className="spinner w-8 h-8 mb-3" />
            <p className="empty-state-title">Loading requests…</p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            <Send className="empty-state-icon" />
            <p className="empty-state-title">No booking requests</p>
            <p className="empty-state-desc">
              {filterStatus === 'pending' ? 'All caught up!' : filterStatus === 'pre_book' ? 'No pre-booked clients yet.' : 'No requests match this filter.'}
            </p>
          </div>
        )}

        {/* Bulk action bar */}
        {filterStatus === 'pending' && filtered.some(b => b.status === 'pending') && (
          <div className="sticky top-2 z-20 bg-white border border-neutral-200 rounded-xl shadow-card p-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()); }}
              className={`btn-sm flex items-center gap-1.5 ${bulkMode ? 'bg-brand-600 text-white border-brand-600' : 'btn-secondary'}`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              {bulkMode ? 'Cancel Multi-Select' : 'Multi-Select'}
            </button>
            {bulkMode && (
              <>
                <button onClick={toggleSelectAll} className="btn-sm btn-secondary">
                  {filtered.filter(b => b.status === 'pending').every(b => selectedIds.has(b.id)) && selectedIds.size > 0 ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-sm text-neutral-500 font-medium">{selectedIds.size} selected</span>
                <div className="flex-1" />
                <button
                  onClick={bulkApprove}
                  disabled={bulkProcessing || selectedIds.size === 0}
                  className="btn-sm bg-green-600 hover:bg-green-700 text-white btn flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {bulkProcessing ? 'Processing…' : `Approve ${selectedIds.size || ''}`.trim()}
                </button>
                <button
                  onClick={bulkReject}
                  disabled={bulkProcessing || selectedIds.size === 0}
                  className="btn-sm bg-red-600 hover:bg-red-700 text-white btn flex items-center gap-1.5 disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  {bulkProcessing ? 'Processing…' : `Reject ${selectedIds.size || ''}`.trim()}
                </button>
              </>
            )}
          </div>
        )}

        <div className="space-y-2">
          {filtered.map(booking => {
            const client = clientsByEmail[booking.email.toLowerCase()];
            const isExpanded = expandedId === booking.id;
            const isEditing = editingId === booking.id;
            const isRejecting = rejectingId === booking.id;
            const isAssigningDate = assignDateId === booking.id;
            const processing = processingId === booking.id;
            const sc = statusCfg(booking.status);
            const isSelected = selectedIds.has(booking.id);
            const canBulkSelect = bulkMode && booking.status === 'pending';

            return (
              <div key={booking.id} className={`card overflow-hidden ${isSelected ? 'ring-2 ring-brand-400' : ''}`}>
                {/* Row header */}
                <div
                  className="px-4 py-3.5 flex items-start gap-3 cursor-pointer hover:bg-neutral-50 transition"
                  onClick={() => canBulkSelect ? toggleSelect(booking.id) : setExpandedId(isExpanded ? null : booking.id)}
                >
                  {canBulkSelect && (
                    <span className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-brand-600 border-brand-600' : 'border-neutral-300 bg-white'}`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </span>
                  )}
                  <span className={`mt-0.5 ${sc.cls} shrink-0`}>{sc.icon} {sc.label}</span>
                  {booking.status === 'approved' && booking.job_status && booking.job_status !== 'booked' && (
                    <span className={`mt-0.5 ${jobStageCfg(booking.job_status).cls} shrink-0 text-[10px]`}>
                      {jobStageCfg(booking.job_status).icon} {jobStageCfg(booking.job_status).label}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 truncate">
                      {booking.client_name || [client?.first_name, client?.last_name].filter(Boolean).join(' ') || booking.email}
                    </p>
                    <p className="text-xs text-neutral-500 truncate">{booking.email}</p>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-neutral-500">
                      {booking.status === 'pre_book' ? (
                        <span className="flex items-center gap-1 text-blue-600 font-medium">
                          <BookMarked className="w-3 h-3" />
                          {booking.pre_book_date ? `Preferred: ${new Date(booking.pre_book_date + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'No preferred date'}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(booking.event_date + 'T00:00:00').toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        {booking.service_type === 'Custom Job'
                          ? <><Briefcase className="w-3 h-3" />{booking.custom_job_name ? `Custom: ${booking.custom_job_name}` : 'Custom Job'}</>
                          : <><FileText className="w-3 h-3" />{booking.service_type}</>}
                      </span>
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{booking.requested_by || 'Unknown'}</span>
                      {client?.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{client.phone}</span>}
                      {booking.balance_due != null && <span className="flex items-center gap-1 text-amber-700 font-semibold"><DollarSign className="w-3 h-3" />Balance due: ${Number(booking.balance_due).toFixed(2)}</span>}
                      {booking.n8n_triggered && <span className="flex items-center gap-1 text-green-600"><Zap className="w-3 h-3" />N8N sent</span>}
                    </div>
                    {booking.status === 'rejected' && booking.rejection_reason && (
                      <p className="mt-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1">{booking.rejection_reason}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-neutral-400">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t border-neutral-100">
                    {isEditing ? (
                      <div className="p-4 bg-brand-50/40 space-y-4">
                        <h4 className="text-xs font-semibold text-neutral-700 uppercase tracking-wide">Edit Request</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="form-label">Requested Date</label>
                            <input type="date" value={editForm.event_date || ''} onChange={e => setEditForm(p => ({ ...p, event_date: e.target.value }))} className="form-input" />
                          </div>
                          <div>
                            <label className="form-label">Service Type</label>
                            <select value={editForm.service_type || ''} onChange={e => setEditForm(p => ({ ...p, service_type: e.target.value }))} className="form-select">
                              {['Pool Opening','Equipment Startup','Pool Closing','Liner Replacement','Liner Measurement','Pool Maintenance','Service Call','Leak Detection','Pressure Test'].map(s => <option key={s}>{s}</option>)}
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="form-label">Notes</label>
                            <textarea value={editForm.custom_note || ''} onChange={e => setEditForm(p => ({ ...p, custom_note: e.target.value }))} rows={2} className="form-textarea" />
                          </div>
                          {editForm.service_type === 'Pool Closing' && booking.closing_add_ons && (
                            <div className="sm:col-span-2 bg-brand-50/40 border border-brand-200 rounded-xl p-4">
                              <label className="form-label font-semibold text-neutral-700">Pool Closing Add-Ons <span className="text-xs font-normal text-neutral-400">(managed in HubSpot)</span></label>
                              <div className="flex flex-wrap gap-1.5">
                                {parseAddOns(booking.closing_add_ons).length > 0 ? parseAddOns(booking.closing_add_ons).map(a => (
                                  <span key={a} className="inline-flex items-center px-2.5 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-medium">{a}</span>
                                )) : <span className="text-xs text-neutral-400">None</span>}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => saveEdit(booking.id)} className="btn-primary btn-sm"><Check className="w-3.5 h-3.5" />Save</button>
                          <button onClick={() => setEditingId(null)} className="btn-secondary btn-sm"><X className="w-3.5 h-3.5" />Cancel</button>
                        </div>
                      </div>
                    ) : isRejecting ? (
                      <div className="p-4 bg-red-50/40 space-y-3">
                        <h4 className="text-xs font-semibold text-red-700 uppercase tracking-wide">Reject Request</h4>
                        <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={2} autoFocus className="form-textarea border-red-200 focus:ring-red-400" placeholder="Optional reason…" />
                        <div className="flex gap-2">
                          <button onClick={() => rejectBooking(booking)} disabled={processing} className="btn-danger btn-sm"><XCircle className="w-3.5 h-3.5" />{processing ? 'Rejecting…' : 'Confirm Reject'}</button>
                          <button onClick={() => { setRejectingId(null); setRejectionReason(''); }} className="btn-secondary btn-sm"><X className="w-3.5 h-3.5" />Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 space-y-4">
                        {/* Client info block */}
                        <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-neutral-700">HubSpot Client Info</p>
                            {!client && <span className="badge-yellow">No client match</span>}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <InfoCell icon={<User className="w-3 h-3" />} label="Name" value={booking.client_name || [client?.first_name, client?.last_name].filter(Boolean).join(' ')} />
                            <InfoCell icon={<Phone className="w-3 h-3" />} label="Phone" value={client?.phone} />
                            <InfoCell icon={<MapPin className="w-3 h-3" />} label="Address" value={fullAddress(client)} />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {serviceInfoRows(booking.service_type, client).map(row => (
                              <InfoCell key={row.label} icon={row.icon} label={row.label} value={row.value} />
                            ))}
                          </div>
                          {booking.service_type === 'Pool Closing' && booking.closing_add_ons && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {parseAddOns(booking.closing_add_ons).map(a => (
                                <span key={a} className="inline-flex items-center px-2.5 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-medium">{a}</span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Meta */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <DetailCell label="Submitted" value={new Date(booking.created_at).toLocaleDateString()} />
                          <DetailCell label="By" value={booking.requested_by || '—'} />
                          {booking.balance_due != null && (
                            <DetailCell label="Balance Due" value={`$${Number(booking.balance_due).toFixed(2)}`} />
                          )}
                          {booking.status === 'pre_book' && <DetailCell label="Preferred Date" value={booking.pre_book_date ? new Date(booking.pre_book_date + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : 'None'} />}
                          {booking.approved_at && <DetailCell label="Approved At" value={new Date(booking.approved_at).toLocaleString()} />}
                          {booking.approved_by && <DetailCell label="Approved By" value={booking.approved_by} />}
                          {booking.assignment_id && <DetailCell label="Assignment ID" value={booking.assignment_id.slice(0, 8) + '…'} />}
                          {booking.service_type === 'Custom Job' && booking.custom_job_name && <DetailCell label="Job Description" value={booking.custom_job_name} />}
                          <DetailCell label="N8N Status" value={booking.n8n_triggered ? `Sent ${booking.n8n_triggered_at ? new Date(booking.n8n_triggered_at).toLocaleString() : ''}`.trim() : booking.n8n_trigger_error ? 'Failed' : 'Not sent'} />
                          {booking.n8n_trigger_error && (
                            <div className="col-span-2 sm:col-span-4 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 font-mono break-all">{booking.n8n_trigger_error}</div>
                          )}
                        </div>

                        {/* Pre-book actions */}
                        {booking.status === 'pre_book' && (
                          <div className="pt-2 border-t border-neutral-100">
                            {isAssigningDate ? (
                              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-3">
                                <p className="text-sm font-semibold text-blue-800">Assign Service Date</p>
                                <p className="text-xs text-blue-600">Converts pre-book to pending so it can be approved.</p>
                                <div className="flex gap-2 items-end flex-wrap">
                                  <div className="flex-1 min-w-36">
                                    <label className="form-label">Service Date</label>
                                    <input type="date" value={assignDate} onChange={e => setAssignDate(e.target.value)} autoFocus className="form-input" />
                                  </div>
                                  <button onClick={() => convertPreBookToPending(booking)} disabled={processing || !assignDate} className="btn-primary btn-sm"><CheckCircle2 className="w-3.5 h-3.5" />{processing ? 'Converting…' : 'Set Date'}</button>
                                  <button onClick={() => { setAssignDateId(null); setAssignDate(''); }} className="btn-secondary btn-sm"><X className="w-3.5 h-3.5" />Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                <button onClick={() => { setAssignDateId(booking.id); setAssignDate(''); }} className="btn-primary btn-sm"><Calendar className="w-3.5 h-3.5" />Assign Date &amp; Convert</button>
                                <button onClick={() => setRejectingId(booking.id)} className="btn-danger btn-sm"><XCircle className="w-3.5 h-3.5" />Remove</button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Pending actions */}
                        {booking.status === 'pending' && (
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-100">
                            <button onClick={() => approveBooking(booking)} disabled={processing} className="btn-sm bg-green-600 hover:bg-green-700 text-white btn"><CheckCircle2 className="w-3.5 h-3.5" />{processing ? 'Approving…' : 'Approve & Add to Assignments'}</button>
                            <button onClick={() => { setEditingId(booking.id); setEditForm({ event_date: booking.event_date, service_type: booking.service_type, custom_note: booking.custom_note || '' }); }} className="btn-secondary btn-sm"><Edit2 className="w-3.5 h-3.5" />Edit</button>
                            <button onClick={() => setRejectingId(booking.id)} className="btn-danger btn-sm"><XCircle className="w-3.5 h-3.5" />Reject</button>
                          </div>
                        )}

                        {/* Job status workflow */}
                        {booking.status === 'approved' && (
                          <div className="pt-2 border-t border-neutral-100">
                            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Job Status</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={jobStageCfg(booking.job_status).cls}>
                                {jobStageCfg(booking.job_status).icon} {jobStageCfg(booking.job_status).label}
                              </span>
                              {(() => {
                                const next = nextJobStage(booking.job_status || 'awaiting_booking_request');
                                return next ? (
                                  <button onClick={() => advanceJobStatus(booking)} disabled={processing}
                                    className="btn-sm btn-primary btn flex items-center gap-1.5">
                                    <ChevronRight className="w-3.5 h-3.5" />
                                    {processing ? 'Updating…' : `Move to ${jobStageCfg(next).label}`}
                                  </button>
                                ) : null;
                              })()}
                            </div>
                            {/* Stage selector */}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {JOB_STAGES.map(stage => (
                                <button key={stage} onClick={() => setJobStatus(booking, stage)}
                                  className={`text-[10px] px-2 py-1 rounded-lg font-medium transition ${
                                    (booking.job_status || 'awaiting_booking_request') === stage
                                      ? 'bg-brand-600 text-white'
                                      : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                                  }`}>
                                  {jobStageCfg(stage).label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Approved actions */}
                        {booking.status === 'approved' && booking.assignment_id && (
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-100">
                            <button onClick={() => navigate(`/team-assignments?date=${booking.event_date}`)} className="btn-secondary btn-sm"><Calendar className="w-3.5 h-3.5" />View in Daily Assignments</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </>
        )}
      </main>
    </div>
  );
}

function WeeklyCityMap({ bookings, clientsByEmail, loading, onBookingClick }: {
  bookings: Booking[];
  clientsByEmail: Record<string, ClientRow>;
  loading: boolean;
  onBookingClick: (b: Booking) => void;
}) {
  const [weekOffset, setWeekOffset] = useState(0);

  // Get the Monday of the current week (with offset)
  const weekStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(); // 0=Sun, 1=Mon
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    d.setDate(diff + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const weekLabel = `${weekDays[0].toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  // Group bookings by date
  const bookingsByDate = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    for (const b of bookings) {
      if (!b.event_date) continue;
      const dateKey = b.event_date.split('T')[0];
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(b);
    }
    return map;
  }, [bookings]);

  // Get city for a booking
  const cityForBooking = (b: Booking): string => {
    const client = clientsByEmail[b.email?.toLowerCase()];
    return client?.city?.trim() || 'Unknown';
  };

  if (loading) return (
    <div className="empty-state">
      <div className="spinner w-8 h-8 mb-3" />
      <p className="empty-state-title">Loading weekly map…</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => setWeekOffset(w => w - 1)} className="btn-secondary btn-sm">
          <ChevronDown className="w-4 h-4 rotate-90" />Prev
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-neutral-900">{weekLabel}</p>
          <p className="text-xs text-neutral-400">Week of {weekDays[0].toLocaleDateString('en-CA', { weekday: 'long' })}</p>
        </div>
        <button onClick={() => setWeekOffset(w => w + 1)} className="btn-secondary btn-sm">
          Next<ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" />Awaiting Confirmation</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-400" />Confirmed</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-neutral-300" />Other</span>
      </div>

      {/* Day cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {weekDays.map((day, idx) => {
          const dateKey = day.toISOString().split('T')[0];
          const dayBookings = bookingsByDate[dateKey] || [];
          const isToday = new Date().toISOString().split('T')[0] === dateKey;
          const isWeekend = idx >= 5;

          // Group by city
          const citiesMap: Record<string, Booking[]> = {};
          for (const b of dayBookings) {
            const city = cityForBooking(b);
            if (!citiesMap[city]) citiesMap[city] = [];
            citiesMap[city].push(b);
          }
          const cities = Object.entries(citiesMap).sort((a, b) => a[0].localeCompare(b[0]));

          const pendingCount = dayBookings.filter(b => b.status === 'pending' || b.status === 'pre_book').length;
          const confirmedCount = dayBookings.filter(b => b.status === 'approved').length;

          return (
            <div key={dateKey} className={`card overflow-hidden ${isToday ? 'ring-2 ring-brand-400' : ''}`}>
              <div className={`px-3 py-2.5 border-b border-neutral-100 ${isWeekend ? 'bg-neutral-50' : 'bg-white'} ${isToday ? 'bg-brand-50' : ''}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-bold ${isToday ? 'text-brand-700' : 'text-neutral-900'}`}>
                      {day.toLocaleDateString('en-CA', { weekday: 'short' })}
                    </p>
                    <p className="text-xs text-neutral-400">{day.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {pendingCount > 0 && <span className="badge-yellow text-[10px]">{pendingCount} pend</span>}
                    {confirmedCount > 0 && <span className="badge-blue text-[10px]">{confirmedCount} conf</span>}
                  </div>
                </div>
              </div>
              <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                {cities.length === 0 ? (
                  <p className="text-xs text-neutral-300 text-center py-4">No bookings</p>
                ) : (
                  cities.map(([city, cityBookings]) => (
                    <div key={city} className="space-y-1">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{city}
                        <span className="text-neutral-300 font-normal">({cityBookings.length})</span>
                      </p>
                      {cityBookings.map(b => {
                        const isPending = b.status === 'pending' || b.status === 'pre_book';
                        const isConfirmed = b.status === 'approved';
                        const dotColor = isPending ? 'bg-amber-400' : isConfirmed ? 'bg-blue-400' : 'bg-neutral-300';
                        return (
                          <button key={b.id} onClick={() => onBookingClick(b)}
                            className="w-full text-left pl-3 pr-2 py-1.5 rounded-lg hover:bg-neutral-50 transition group">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${dotColor} flex-shrink-0`} />
                              <span className="text-xs font-medium text-neutral-800 truncate flex-1">
                                {b.client_name || b.email}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 pl-4 mt-0.5">
                              <span className="text-[10px] text-neutral-400">{b.service_type === 'Custom Job' ? (b.custom_job_name || 'Custom') : b.service_type}</span>
                              {b.custom_note && (
                                <span className="text-[10px] text-amber-600 flex items-center gap-0.5 truncate max-w-[120px]">
                                  <StickyNote className="w-2.5 h-2.5 flex-shrink-0" />{b.custom_note}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-medium text-amber-700">Awaiting Confirmation (this week)</p>
          <p className="text-xl font-bold text-amber-900 mt-1">
            {weekDays.reduce((sum, day) => {
              const dk = day.toISOString().split('T')[0];
              return sum + (bookingsByDate[dk] || []).filter(b => b.status === 'pending' || b.status === 'pre_book').length;
            }, 0)}
          </p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs font-medium text-blue-700">Confirmed (this week)</p>
          <p className="text-xl font-bold text-blue-900 mt-1">
            {weekDays.reduce((sum, day) => {
              const dk = day.toISOString().split('T')[0];
              return sum + (bookingsByDate[dk] || []).filter(b => b.status === 'approved').length;
            }, 0)}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
          <p className="text-xs font-medium text-neutral-600">Total Bookings (this week)</p>
          <p className="text-xl font-bold text-neutral-900 mt-1">
            {weekDays.reduce((sum, day) => {
              const dk = day.toISOString().split('T')[0];
              return sum + (bookingsByDate[dk] || []).length;
            }, 0)}
          </p>
        </div>
      </div>
    </div>
  );
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-neutral-400 mb-0.5">{label}</p>
      <p className="text-sm text-neutral-700">{value}</p>
    </div>
  );
}

function InfoCell({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="bg-white border border-neutral-100 rounded-lg p-2">
      <p className="text-xs font-medium text-neutral-400 mb-0.5 flex items-center gap-1">{icon} {label}</p>
      <p className="text-sm text-neutral-700 break-words">{clean(value)}</p>
    </div>
  );
}
