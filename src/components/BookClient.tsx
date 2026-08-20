import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Calendar, Mail, FileText, X, ArrowLeft, Send,
  CheckCircle2, User, Zap, BookMarked,
  MapPin, Clock, Layers, Search, Loader2, Waves, DollarSign,
  ChevronDown, ChevronRight, Eye, Phone, Map,
} from 'lucide-react';
import { parseAddOns } from '../lib/addons';
import WeeklyMapModal from './WeeklyMapModal';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

/* ── Service type definitions ─────────────────────────────────── */
const SERVICE_GROUPS = [
  {
    label: 'Opening',
    services: [
      'Equipment Startup',
      'Drain & Clean (1st Visit)',
      'Drain & Clean (2nd Visit)',
    ],
  },
  {
    label: 'Liner Replacements',
    services: [
      'Liner Measurement',
      'Liner Replacement — Inground (1st Visit)',
      'Liner Replacement — Inground (2nd Visit)',
      'Liner Replacement — Aboveground',
    ],
  },
  {
    label: 'Repairs & Installation',
    services: [
      'Service Call',
      'Leak Detection',
      'Pressure Test',
    ],
  },
  {
    label: 'Pool Closing',
    services: ['Pool Closing'],
  },
  {
    label: 'Custom Job',
    services: ['Custom Job'],
  },
] as const;

type ServiceType =
  | 'Equipment Startup'
  | 'Drain & Clean (1st Visit)'
  | 'Drain & Clean (2nd Visit)'
  | 'Liner Measurement'
  | 'Liner Replacement — Inground (1st Visit)'
  | 'Liner Replacement — Inground (2nd Visit)'
  | 'Liner Replacement — Aboveground'
  | 'Service Call'
  | 'Leak Detection'
  | 'Pressure Test'
  | 'Pool Closing'
  | 'Custom Job';

const ALL_SERVICE_TYPES: ServiceType[] = SERVICE_GROUPS.flatMap(g => g.services as unknown as ServiceType[]);

// Types that skip the request flow and go directly to assignments
const AUTO_APPROVE_TYPES: ServiceType[] = [
  'Liner Replacement — Inground (2nd Visit)',
];

const PRE_BOOKABLE_TYPES: ServiceType[] = ['Equipment Startup', 'Pool Closing'];

const serviceTypeEnum = z.enum(ALL_SERVICE_TYPES as [ServiceType, ...ServiceType[]]);

const bookingSchema = z.object({
  email: z.string().email('Valid email required'),
  serviceType: serviceTypeEnum,
  eventDate: z.string().optional(),
  customNote: z.string().optional(),
  customJobName: z.string().optional(),
  isPreBook: z.boolean().optional(),
  balanceDue: z.string().optional(),
  skipApproval: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (!data.isPreBook && (!data.eventDate || !data.eventDate.trim()))
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Date is required', path: ['eventDate'] });
});

type BookingFormData = z.infer<typeof bookingSchema>;

type ClientRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
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

const CLIENT_COLS = 'id,first_name,last_name,email,phone,address,city,zip,pool_type,pool_cover,pool_opening,pool_closing,pool_maintenance,backyard_access_approval,pool_opening_add_on,pool_closing_add_ons,pool_size';

function buildAddress(c: ClientRow | null): string {
  if (!c) return '';
  return [c.address?.trim(), c.city?.trim(), c.zip?.trim()].filter(Boolean).join(', ');
}
function buildClientTitle(c: ClientRow | null, fallback: string): string {
  if (!c) return fallback;
  const name = `${c.first_name || ''} ${c.last_name || ''}`.trim();
  return name || fallback;
}

interface ClientSuggestion {
  first_name: string;
  last_name: string;
  email: string;
  address?: string;
  city?: string;
}

function ClientSearchInline({ onSelect }: { onSelect: (email: string) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ClientSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (query.trim().length < 2) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from('clients')
        .select('first_name,last_name,email,address,city')
        .or(`email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%,address.ilike.%${query}%`)
        .limit(8);
      setResults((data as ClientSuggestion[]) || []);
      setOpen(true);
      setLoading(false);
    }, 250);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pick = (c: ClientSuggestion) => {
    onSelect(c.email);
    setQuery(`${c.first_name} ${c.last_name}`.trim() || c.email);
    setOpen(false);
  };

  return (
    <div className="relative" ref={wrapRef}>
      <label className="form-label">Find Client</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name, email or address…"
          className="form-input pl-9 pr-9"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-neutral-400" />}
        {!loading && query && (
          <button onClick={() => { setQuery(''); setResults([]); setOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 bg-white border border-neutral-200 rounded-xl shadow-card-md w-full overflow-hidden">
          {results.map(c => (
            <button key={c.email} onClick={() => pick(c)}
              className="w-full text-left px-4 py-3 hover:bg-neutral-50 border-b border-neutral-100 last:border-0 transition-colors flex items-start gap-3 group">
              <div className="w-7 h-7 rounded-full bg-neutral-100 group-hover:bg-brand-100 flex items-center justify-center shrink-0 mt-0.5 transition-colors">
                <User className="w-3.5 h-3.5 text-neutral-400 group-hover:text-brand-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-900">{c.first_name} {c.last_name}</p>
                <p className="text-xs text-neutral-500 truncate">{c.email}</p>
                {c.address && <p className="text-xs text-neutral-400 truncate">{c.address}{c.city ? `, ${c.city}` : ''}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
      {open && !loading && results.length === 0 && query.trim().length >= 2 && (
        <div className="absolute z-20 mt-1 bg-white border border-neutral-200 rounded-xl shadow-card-md w-full px-4 py-4 text-center">
          <p className="text-sm text-neutral-500">No clients found</p>
        </div>
      )}
    </div>
  );
}

/* ── Day view with cities ─────────────────────────────────────── */
interface DayAssignment {
  title: string;
  service_type: string;
  display_address: string | null;
  city?: string;
}

function DayViewModal({ date, onClose }: { date: string; onClose(): void }) {
  const [rows, setRows] = useState<DayAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!date) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('team_daily_assignments')
        .select('title,service_type,display_address')
        .eq('assignment_date', date)
        .order('sort_order');
      // Parse city from display_address
      const parsed: DayAssignment[] = (data || []).map((r: any) => {
        const parts = (r.display_address || '').split(',').map((s: string) => s.trim());
        return { ...r, city: parts.length >= 2 ? parts[parts.length - 2] : parts[0] || '' };
      });
      setRows(parsed);
      setLoading(false);
    })();
  }, [date]);

  const formatted = new Date(date + 'T00:00:00').toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' });

  // Group cities by service type for summary
  const cityGroups: Record<string, string[]> = {};
  rows.forEach(r => {
    const key = r.service_type || 'Unknown';
    if (!cityGroups[key]) cityGroups[key] = [];
    if (r.city) cityGroups[key].push(r.city);
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-card-lg w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Schedule for {formatted}</h3>
            <p className="text-xs text-neutral-500 mt-0.5">{rows.length} assignment{rows.length !== 1 ? 's' : ''} — cities & service types</p>
          </div>
          <button onClick={onClose} className="btn-icon"><X className="w-4 h-4" /></button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-neutral-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
              <Calendar className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Nothing scheduled on this day yet.</p>
            </div>
          ) : (
            <div>
              {/* Summary by service type */}
              {Object.keys(cityGroups).length > 0 && (
                <div className="px-5 py-4 border-b border-neutral-100 bg-neutral-50">
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">City Summary by Service</p>
                  <div className="space-y-2">
                    {Object.entries(cityGroups).map(([type, cities]) => (
                      <div key={type} className="flex items-start gap-3">
                        <span className="badge-teal text-xs shrink-0 mt-0.5">{type}</span>
                        <div className="flex flex-wrap gap-1">
                          {cities.map((city, i) => (
                            <span key={i} className="inline-flex items-center gap-1 text-xs text-neutral-600 bg-white border border-neutral-200 rounded-full px-2 py-0.5">
                              <MapPin className="w-2.5 h-2.5 text-neutral-400" />{city || '—'}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Full list */}
              <div className="divide-y divide-neutral-100">
                {rows.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <span className="w-5 h-5 rounded-full bg-neutral-100 text-neutral-500 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-800 truncate">{r.title || '—'}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {r.service_type && <span className="text-xs text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full font-medium">{r.service_type}</span>}
                        {r.city && (
                          <span className="text-xs text-neutral-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{r.city}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Day summary (compact, for date field) ─────────────────────── */
interface ServiceCount { service_type: string; confirmed: number; pending: number; }

function useDaySummary(date: string) {
  const [counts, setCounts] = useState<ServiceCount[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const [assignRes, bookingRes] = await Promise.all([
        supabase.from('team_daily_assignments').select('service_type').eq('assignment_date', d),
        supabase.from('bookings').select('service_type, status').eq('event_date', d).in('status', ['pending', 'approved']),
      ]);
      const confirmedMap: Record<string, number> = {};
      for (const row of assignRes.data || []) { const k = row.service_type || 'Unknown'; confirmedMap[k] = (confirmedMap[k] || 0) + 1; }
      const pendingMap: Record<string, number> = {};
      for (const row of bookingRes.data || []) { if (row.status === 'pending') { const k = row.service_type || 'Unknown'; pendingMap[k] = (pendingMap[k] || 0) + 1; } }
      const allTypes = Array.from(new Set([...Object.keys(confirmedMap), ...Object.keys(pendingMap)])).sort();
      setCounts(allTypes.map(t => ({ service_type: t, confirmed: confirmedMap[t] || 0, pending: pendingMap[t] || 0 })));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (date) fetchData(date); else setCounts([]); }, [date, fetchData]);
  return { counts, loading };
}

function DaySummary({ date, onViewFull }: { date: string; onViewFull(): void }) {
  const { counts, loading } = useDaySummary(date);
  if (!date) return null;
  const total = counts.reduce((s, c) => s + c.confirmed + c.pending, 0);
  return (
    <div className="mt-3 card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-neutral-100 bg-neutral-50">
        <MapPin className="w-4 h-4 text-neutral-500" />
        <span className="text-xs font-semibold text-neutral-700">Day summary</span>
        {loading && <span className="ml-auto text-xs text-neutral-400 animate-pulse">Loading…</span>}
        {!loading && total === 0 && <span className="ml-auto text-xs text-neutral-400">Nothing booked yet</span>}
        {!loading && total > 0 && (
          <button onClick={onViewFull} className="ml-auto flex items-center gap-1 text-xs text-brand-600 font-semibold hover:underline">
            <Eye className="w-3 h-3" /> View cities ({total})
          </button>
        )}
      </div>
      {!loading && counts.length > 0 && (
        <div className="divide-y divide-neutral-100">
          {counts.map(row => (
            <div key={row.service_type} className="flex items-center gap-3 px-4 py-2.5">
              <span className="badge-teal text-xs">{row.service_type}</span>
              <div className="flex items-center gap-3 ml-auto text-xs">
                {row.confirmed > 0 && <span className="flex items-center gap-1 text-green-700 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" />{row.confirmed} confirmed</span>}
                {row.pending > 0 && <span className="flex items-center gap-1 text-amber-600 font-medium"><Clock className="w-3.5 h-3.5" />{row.pending} pending</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && counts.length === 0 && (
        <div className="px-4 py-3 flex items-center gap-2 text-xs text-neutral-400">
          <Layers className="w-4 h-4" /> No bookings or assignments on this date yet.
        </div>
      )}
    </div>
  );
}

/* ── Service type selector ─────────────────────────────────────── */
function ServiceTypeSelector({ value, onChange, error }: { value: string; onChange(v: string): void; error?: string }) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  useEffect(() => {
    if (value) {
      const group = SERVICE_GROUPS.find(g => (g.services as readonly string[]).includes(value));
      if (group) setOpenGroup(group.label);
    }
  }, []);

  return (
    <div>
      <label className="form-label">Service Type</label>
      <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white">
        {SERVICE_GROUPS.map(group => {
          const isOpen = openGroup === group.label;
          const hasSelected = (group.services as readonly string[]).includes(value);
          return (
            <div key={group.label} className="border-b border-neutral-100 last:border-0">
              <button
                type="button"
                onClick={() => setOpenGroup(isOpen ? null : group.label)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${hasSelected ? 'bg-brand-50' : 'hover:bg-neutral-50'}`}
              >
                <span className={`text-sm font-semibold ${hasSelected ? 'text-brand-700' : 'text-neutral-700'}`}>
                  {group.label}
                  {hasSelected && <span className="ml-2 text-xs font-medium text-brand-600">— {value}</span>}
                </span>
                {isOpen ? <ChevronDown className="w-4 h-4 text-neutral-400" /> : <ChevronRight className="w-4 h-4 text-neutral-400" />}
              </button>
              {isOpen && (
                <div className="bg-neutral-50 border-t border-neutral-100">
                  {group.services.map(service => (
                    <button
                      key={service}
                      type="button"
                      onClick={() => onChange(service)}
                      className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm text-left transition-colors border-b border-neutral-100 last:border-0 ${
                        value === service
                          ? 'bg-brand-600 text-white'
                          : 'hover:bg-neutral-100 text-neutral-700'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${value === service ? 'border-white bg-white/20' : 'border-neutral-300'}`}>
                        {value === service && <span className="w-2 h-2 rounded-full bg-white block" />}
                      </span>
                      {service}
                      {AUTO_APPROVE_TYPES.includes(service as ServiceType) && (
                        <span className={`ml-auto text-xs font-medium flex items-center gap-1 ${value === service ? 'text-white/80' : 'text-green-600'}`}>
                          <Zap className="w-3 h-3" /> Direct
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

/* ── Confirm modal ─────────────────────────────────────────────── */
function ConfirmModal({ data, clientName, mode, onConfirm, onCancel }: {
  data: BookingFormData; clientName: string; mode: 'standard' | 'auto_approve' | 'pre_book';
  onConfirm(): void; onCancel(): void;
}) {
  const modeLabel = {
    standard:     { title: 'Submit Booking Request',   sub: 'Will go to admin for approval.',          btnText: 'Submit Request',       btnCls: 'bg-brand-600 hover:bg-brand-700' },
    auto_approve: { title: 'Add to Daily Assignments', sub: 'Added directly — no approval needed.',    btnText: 'Confirm & Add',        btnCls: 'bg-green-600 hover:bg-green-700' },
    pre_book:     { title: 'Add to Pre-Book List',     sub: 'Admin will assign a date later.',         btnText: 'Add to Pre-Book List', btnCls: 'bg-amber-500 hover:bg-amber-600' },
  }[mode];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-card-lg max-w-md w-full p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-neutral-900">{modeLabel.title}</h3>
            <p className="text-sm text-neutral-500 mt-0.5">{modeLabel.sub}</p>
          </div>
          <button onClick={onCancel} className="btn-icon -mr-1"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-2.5 bg-neutral-50 rounded-xl p-4 border border-neutral-100 text-sm mb-5">
          <Row label="Client" value={clientName} />
          <Row label="Email" value={data.email} />
          <Row label="Service" value={data.serviceType === 'Custom Job' && data.customJobName ? `Custom — ${data.customJobName}` : data.serviceType} />
          {data.eventDate
            ? <Row label={data.isPreBook ? 'Preferred Date' : 'Date'} value={new Date(data.eventDate + 'T00:00:00').toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />
            : <Row label="Date" value="To be assigned by admin" />}
          {data.balanceDue && <Row label="Balance Due" value={`$${data.balanceDue}`} />}
          {data.customNote && <Row label="Notes" value={data.customNote} />}
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
          <button onClick={onConfirm} className={`flex-1 btn btn-md text-white ${modeLabel.btnCls}`}>
            {mode === 'auto_approve' && <Zap className="w-4 h-4" />}
            {mode === 'pre_book' && <BookMarked className="w-4 h-4" />}
            {mode === 'standard' && <Send className="w-4 h-4" />}
            {modeLabel.btnText}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-28 text-neutral-500 shrink-0 text-sm">{label}</span>
      <span className="text-neutral-800 font-medium text-sm">{value}</span>
    </div>
  );
}

function ClientInfoCell({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  const display = value?.trim() || '—';
  return (
    <div className="bg-white border border-neutral-100 rounded-lg p-2">
      <p className="text-xs font-medium text-neutral-400 mb-0.5 flex items-center gap-1">{icon} {label}</p>
      <p className="text-sm text-neutral-700 break-words">{display}</p>
    </div>
  );
}

function SuccessScreen({ mode, onNew, onDash }: { mode: 'standard' | 'auto_approve' | 'pre_book'; onNew(): void; onDash(): void }) {
  const msgs = {
    standard:     { title: 'Request Submitted',      body: 'Your booking request is pending admin approval.' },
    auto_approve: { title: 'Added to Assignments',   body: 'The job has been added directly to Daily Assignments.' },
    pre_book:     { title: 'Added to Pre-Book List', body: "Admin will assign a service date. You'll see it once a date is set." },
  }[mode];
  const isPreBook = mode === 'pre_book';
  return (
    <div className="page-shell items-center justify-center p-4">
      <div className="card card-body max-w-sm w-full text-center">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isPreBook ? 'bg-amber-100' : 'bg-green-100'}`}>
          {isPreBook ? <BookMarked className="w-7 h-7 text-amber-600" /> : <CheckCircle2 className="w-7 h-7 text-green-600" />}
        </div>
        <h2 className="text-lg font-semibold text-neutral-900 mb-1">{msgs.title}</h2>
        <p className="text-sm text-neutral-500 mb-6">{msgs.body}</p>
        <div className="flex gap-3">
          <button onClick={onNew} className="btn-secondary flex-1">New Request</button>
          <button onClick={onDash} className="btn-primary flex-1">Dashboard</button>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ────────────────────────────────────────────── */
export default function BookClient() {
  const navigate = useNavigate();
  const location = useLocation();
  const clientEmail = location.state?.clientEmail || '';
  const technician = JSON.parse(sessionStorage.getItem('technician') || '{}');
  const isAdmin = technician.role === 'Admin';

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedMode, setSubmittedMode] = useState<'standard' | 'auto_approve' | 'pre_book' | null>(null);
  const [formData, setFormData] = useState<BookingFormData | null>(null);
  const [clientName, setClientName] = useState('');
  const [isPreBook, setIsPreBook] = useState(false);
  const [skipApproval, setSkipApproval] = useState(false);

  const [clientInfo, setClientInfo] = useState<ClientRow | null>(null);
  const [showDayView, setShowDayView] = useState(false);
  const [showWeeklyMap, setShowWeeklyMap] = useState(false);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { email: clientEmail, isPreBook: false, skipApproval: false },
  });

  const watchedServiceType = watch('serviceType') as ServiceType | undefined;
  const watchedEmail = watch('email');
  const isPoolClosing = watchedServiceType === 'Pool Closing';
  const watchedDate = watch('eventDate');

  useEffect(() => {
    if (!watchedEmail || !isPoolClosing) { setClientInfo(null); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from('clients').select(CLIENT_COLS).eq('email', watchedEmail.toLowerCase().trim()).maybeSingle<ClientRow>();
      setClientInfo(data || null);
    }, 300);
    return () => clearTimeout(t);
  }, [watchedEmail, isPoolClosing]);

  useEffect(() => {
    if (!PRE_BOOKABLE_TYPES.includes(watchedServiceType as ServiceType)) {
      setIsPreBook(false);
      setValue('isPreBook', false);
    }
  }, [watchedServiceType, setValue]);

  // Auto-approve types are already direct; skip-approval allows admin to force direct for others
  const isAutoApprove = AUTO_APPROVE_TYPES.includes(watchedServiceType as ServiceType) || (isAdmin && skipApproval);
  const canPreBook = PRE_BOOKABLE_TYPES.includes(watchedServiceType as ServiceType);
  const showBalanceDue = watchedServiceType === 'Liner Replacement — Inground (1st Visit)';

  function getMode(): 'standard' | 'auto_approve' | 'pre_book' {
    if (isAutoApprove) return 'auto_approve';
    if (isPreBook) return 'pre_book';
    return 'standard';
  }

  const onSubmit = async (data: BookingFormData) => {
    const cleanEmail = data.email.toLowerCase().trim();
    const { data: clientRow } = await supabase.from('clients').select('id,first_name,last_name,email').eq('email', cleanEmail).maybeSingle<ClientRow>();
    setClientName(buildClientTitle(clientRow, cleanEmail));
    setFormData({ ...data, isPreBook, skipApproval });
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    if (!formData) return;
    setIsSubmitting(true);
    setShowConfirmation(false);
    const mode = getMode();
    const cleanEmail = formData.email.toLowerCase().trim();

    try {
      const { data: clientRow } = await supabase.from('clients').select(CLIENT_COLS).eq('email', cleanEmail).maybeSingle<ClientRow>();
      const displayName = buildClientTitle(clientRow, cleanEmail);
      const displayAddress = buildAddress(clientRow);
      const now = new Date().toISOString();

      if (mode === 'pre_book') {
        const { error } = await supabase.from('bookings').insert({
          email: cleanEmail, service_type: formData.serviceType,
          event_date: formData.eventDate || '2099-01-01', pre_book_date: formData.eventDate || null,
          start_time: now, end_time: now, service_team: '',
          custom_note: formData.customNote || '', custom_job_name: '',
          closing_add_ons: clientRow?.pool_closing_add_ons || '',
          status: 'pre_book', requested_by: technician.staff_id || technician.id || '',
          client_name: displayName, n8n_triggered: false, updated_at: now,
        });
        if (error) throw error;
      } else if (mode === 'auto_approve') {
        const eventDate = formData.eventDate!;
        const startTime = new Date(`${eventDate}T08:00:00-04:00`).toISOString();
        const endTime = new Date(`${eventDate}T17:00:00-04:00`).toISOString();
        const approvedBy = technician.staff_id || technician.id || technician.name || '';
        const serviceLabel = formData.serviceType === 'Custom Job'
          ? `Custom Job — ${formData.customJobName || ''}`.trim()
          : formData.serviceType;

        const { data: assignmentData, error: assignError } = await supabase
          .from('team_daily_assignments')
          .insert({
            assignment_date: eventDate, team: null, client_email: cleanEmail,
            client_id: clientRow?.id || null, sort_order: 9999, title: displayName,
            service_type: serviceLabel,
            admin_note: formData.customNote || '', display_address: displayAddress,
            display_phone: clientRow?.phone || '', display_pool_type: clientRow?.pool_type || '',
            display_pool_cover: clientRow?.pool_cover || '', display_pool_opening: clientRow?.pool_opening || '',
            display_pool_closing: clientRow?.pool_closing || '', display_pool_maintenance: clientRow?.pool_maintenance || '',
            display_backyard_access: clientRow?.backyard_access_approval || '',
            display_opening_add_ons: clientRow?.pool_opening_add_on || '',
            display_closing_add_ons: clientRow?.pool_closing_add_ons || '',
            status: 'Unallocated', assigned_technician_id: null, report_completed: false,
            created_from_booking: true, created_by: approvedBy,
          }).select('id').single();
        if (assignError) throw assignError;

        const bookingPayload: Record<string, unknown> = {
          email: cleanEmail, service_type: formData.serviceType,
          event_date: eventDate, start_time: startTime, end_time: endTime, service_team: '',
          custom_note: formData.customNote || '', custom_job_name: formData.customJobName || '',
          closing_add_ons: clientRow?.pool_closing_add_ons || '',
          status: 'approved', requested_by: technician.staff_id || technician.id || '',
          client_name: displayName, approved_by: approvedBy, approved_at: now,
          assignment_id: assignmentData.id, n8n_triggered: false, updated_at: now,
        };
        if (formData.balanceDue) bookingPayload.balance_due = parseFloat(formData.balanceDue);
        const { error } = await supabase.from('bookings').insert(bookingPayload);
        if (error) throw error;
      } else {
        const eventDate = formData.eventDate!;
        const bookingPayload: Record<string, unknown> = {
          email: cleanEmail, service_type: formData.serviceType,
          event_date: eventDate, start_time: new Date(`${eventDate}T08:00:00-04:00`).toISOString(),
          end_time: new Date(`${eventDate}T17:00:00-04:00`).toISOString(), service_team: '',
          custom_note: formData.customNote || '', custom_job_name: '',
          closing_add_ons: clientRow?.pool_closing_add_ons || '',
          status: 'pending', requested_by: technician.staff_id || technician.id || '',
          client_name: displayName, n8n_triggered: false, updated_at: now,
        };
        if (formData.balanceDue) bookingPayload.balance_due = parseFloat(formData.balanceDue);
        const { error } = await supabase.from('bookings').insert(bookingPayload);
        if (error) throw error;
      }

      setSubmittedMode(mode);
      reset();
      setIsPreBook(false);
      setSkipApproval(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedMode) {
    return <SuccessScreen mode={submittedMode} onNew={() => setSubmittedMode(null)} onDash={() => navigate('/dashboard')} />;
  }

  const mode = getMode();

  const modeBanner = {
    standard:     { cls: 'bg-brand-50 border-brand-200 text-brand-800',  icon: <Send className="w-4 h-4 shrink-0 mt-0.5 text-brand-500" />, title: 'Requires admin approval', body: 'Once approved, the booking will appear in Daily Assignments.' },
    auto_approve: { cls: 'bg-green-50 border-green-200 text-green-800',  icon: <Zap className="w-4 h-4 shrink-0 mt-0.5 text-green-500" />, title: 'Goes straight to Daily Assignments', body: 'No admin approval needed — this job will be added directly.' },
    pre_book:     { cls: 'bg-amber-50 border-amber-200 text-amber-800',  icon: <BookMarked className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />, title: 'Adding to Pre-Book list', body: 'Admin will assign a service date later.' },
  }[mode];

  return (
    <div className="page-shell">
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="btn-icon"><ArrowLeft className="w-4 h-4" /></button>
            <div className="navbar-brand"><Waves className="w-5 h-5" /><span>New Booking</span></div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-500">
            <User className="w-3.5 h-3.5" />
            <span>{technician.name || technician.staff_id}</span>
          </div>
        </div>
      </nav>

      <main className="page-content max-w-2xl">
        {/* Mode banner */}
        <div className={`mb-5 p-4 rounded-xl border text-sm flex gap-3 ${modeBanner.cls}`}>
          {modeBanner.icon}
          <div>
            <p className="font-semibold">{modeBanner.title}</p>
            <p className="mt-0.5 opacity-80 text-xs">{modeBanner.body}</p>
          </div>
        </div>

        {/* Admin skip-approval toggle */}
        {isAdmin && watchedServiceType && !AUTO_APPROVE_TYPES.includes(watchedServiceType as ServiceType) && (
          <div className="mb-5 flex items-start gap-3 p-3.5 rounded-xl border border-green-200 bg-green-50">
            <button
              type="button"
              onClick={() => setSkipApproval(s => !s)}
              className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${skipApproval ? 'bg-green-600 border-green-600' : 'border-green-400 bg-white'}`}
            >
              {skipApproval && <span className="w-2.5 h-2.5 bg-white rounded-sm block" />}
            </button>
            <div>
              <p className="text-sm font-semibold text-green-800 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Skip approval — add directly to schedule</p>
              <p className="text-xs text-green-700 mt-0.5">Admin override: bypasses the booking request queue.</p>
            </div>
          </div>
        )}

        <div className="card card-body">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <ClientSearchInline onSelect={email => setValue('email', email, { shouldValidate: true })} />

            <div>
              <label className="form-label">Client Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
                <input type="email" {...register('email')} className="form-input pl-9" placeholder="client@example.com" />
              </div>
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>

            <ServiceTypeSelector
              value={watchedServiceType || ''}
              onChange={v => setValue('serviceType', v as ServiceType, { shouldValidate: true })}
              error={errors.serviceType?.message}
            />

            {/* Pool Closing — client info + add-ons */}
            {isPoolClosing && (
              <div className="space-y-4">
                {clientInfo && (
                  <div className="bg-brand-50/60 border border-brand-100 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-brand-700 uppercase tracking-wide flex items-center gap-1.5">
                      <Waves className="w-3.5 h-3.5" /> Client Information — Double Check
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <ClientInfoCell icon={<User className="w-3 h-3" />} label="Name" value={[clientInfo.first_name, clientInfo.last_name].filter(Boolean).join(' ')} />
                      <ClientInfoCell icon={<Phone className="w-3 h-3" />} label="Phone" value={clientInfo.phone} />
                      <ClientInfoCell icon={<MapPin className="w-3 h-3" />} label="Address" value={[clientInfo.address, clientInfo.city, clientInfo.zip].filter(Boolean).join(', ')} />
                      <ClientInfoCell icon={<Waves className="w-3 h-3" />} label="Pool Type" value={clientInfo.pool_type} />
                      <ClientInfoCell icon={<FileText className="w-3 h-3" />} label="Pool Size" value={clientInfo.pool_size} />
                      <ClientInfoCell icon={<FileText className="w-3 h-3" />} label="Cover Type" value={clientInfo.pool_cover} />
                      <ClientInfoCell icon={<CheckCircle2 className="w-3 h-3" />} label="Backyard Access" value={clientInfo.backyard_access_approval} />
                      <ClientInfoCell icon={<FileText className="w-3 h-3" />} label="Closing Package" value={clientInfo.pool_closing} />
                    </div>
                  </div>
                )}
                <div className="bg-brand-50/40 border border-brand-200 rounded-xl p-4">
                  <label className="form-label font-semibold text-neutral-700">Pool Closing Add-Ons <span className="text-xs font-normal text-neutral-400">(from HubSpot)</span></label>
                  <div className="flex flex-wrap gap-1.5">
                    {clientInfo?.pool_closing_add_ons && parseAddOns(clientInfo.pool_closing_add_ons).length > 0 ? parseAddOns(clientInfo.pool_closing_add_ons).map(a => (
                      <span key={a} className="inline-flex items-center px-2.5 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-medium">{a}</span>
                    )) : <span className="text-xs text-neutral-400">None</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Balance due — Liner Inground 1st Visit */}
            {showBalanceDue && (
              <div>
                <label className="form-label">
                  <span className="flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-neutral-400" />Balance Due</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-medium">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...register('balanceDue')}
                    className="form-input pl-7"
                  />
                </div>
                <p className="form-hint">Amount still owed by the client for this liner job.</p>
              </div>
            )}

            {canPreBook && !isAutoApprove && (
              <div className="flex items-start gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50">
                <button
                  type="button"
                  onClick={() => { const next = !isPreBook; setIsPreBook(next); setValue('isPreBook', next); }}
                  className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${isPreBook ? 'bg-amber-500 border-amber-500' : 'border-amber-400 bg-white'}`}
                >
                  {isPreBook && <span className="w-2.5 h-2.5 bg-white rounded-sm block" />}
                </button>
                <div>
                  <p className="text-sm font-semibold text-amber-800">Pre-book (add to waiting list)</p>
                  <p className="text-xs text-amber-700 mt-0.5">Skip approval for now — admin will assign a date closer to the season.</p>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between">
                <label className="form-label">{isPreBook ? 'Preferred Date (optional)' : 'Requested Date'}</label>
                <button type="button" onClick={() => setShowWeeklyMap(true)} className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                  <Map className="w-3.5 h-3.5" />Weekly Map
                </button>
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
                <input type="date" {...register('eventDate')} className="form-input pl-9" />
              </div>
              {errors.eventDate && <p className="form-error">{errors.eventDate.message}</p>}
              {isPreBook && <p className="form-hint">Leave blank if no preferred date — admin will choose.</p>}
              {watchedDate && (
                <DaySummary
                  date={watchedDate}
                  onViewFull={() => setShowDayView(true)}
                />
              )}
            </div>

            <div>
              <label className="form-label">Notes (optional)</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 text-neutral-400 w-4 h-4" />
                <textarea {...register('customNote')} rows={3} className="form-textarea pl-9" placeholder="Additional notes or instructions…" />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`btn btn-md text-white disabled:opacity-50 ${mode === 'auto_approve' ? 'bg-green-600 hover:bg-green-700' : mode === 'pre_book' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-brand-600 hover:bg-brand-700'}`}
              >
                {mode === 'auto_approve' && <Zap className="w-4 h-4" />}
                {mode === 'pre_book' && <BookMarked className="w-4 h-4" />}
                {mode === 'standard' && <Send className="w-4 h-4" />}
                {isSubmitting ? 'Submitting…' : mode === 'auto_approve' ? 'Add to Assignments' : mode === 'pre_book' ? 'Add to Pre-Book List' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </main>

      {showConfirmation && formData && (
        <ConfirmModal data={formData} clientName={clientName} mode={mode} onConfirm={handleConfirm} onCancel={() => setShowConfirmation(false)} />
      )}

      {showDayView && watchedDate && (
        <DayViewModal date={watchedDate} onClose={() => setShowDayView(false)} />
      )}

      {showWeeklyMap && (
        <WeeklyMapModal
          onClose={() => setShowWeeklyMap(false)}
          onSelectDate={(date) => { setValue('eventDate', date, { shouldValidate: true }); setShowWeeklyMap(false); }}
        />
      )}
    </div>
  );
}
