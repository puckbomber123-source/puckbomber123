import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp,
  Search, StickyNote, Calendar, Users, X,
  UserPlus, Pencil, Save, Copy, Check, MapPin,
  ChevronLeft, ChevronRight, Navigation,
  ClipboardList, ClipboardCheck, AlertTriangle, RefreshCw,
  History, Loader2, Mail
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { AddOnPicker, parseAddOns, serializeAddOns } from '../lib/addons';

const TEAMS = ['PRINCESSDAVID', 'TONYVAN', 'JARVISVAN', 'SONIC'] as const;
type Team = typeof TEAMS[number];

const TEAM_COLORS: Record<Team, { bg: string; border: string; header: string; light: string; text: string }> = {
  PRINCESSDAVID: { bg: 'bg-sky-50', border: 'border-sky-200', header: 'bg-sky-600', light: 'bg-sky-100', text: 'text-sky-700' },
  TONYVAN:       { bg: 'bg-emerald-50', border: 'border-emerald-200', header: 'bg-emerald-600', light: 'bg-emerald-100', text: 'text-emerald-700' },
  JARVISVAN:     { bg: 'bg-amber-50', border: 'border-amber-200', header: 'bg-amber-600', light: 'bg-amber-100', text: 'text-amber-700' },
  SONIC:         { bg: 'bg-rose-50', border: 'border-rose-200', header: 'bg-rose-600', light: 'bg-rose-100', text: 'text-rose-700' },
};

interface Client {
  id?: string;
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
}

interface Technician {
  id: string;
  staff_id: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface PresetMember {
  id: string;
  team: Team;
  staff_id: string;
  technician?: Technician;
}

interface DailyMember {
  id: string;
  assignment_date: string;
  team: Team;
  staff_id: string;
  technician?: Technician;
}

const SERVICE_TYPES = ['Silver Opening', 'Swim-Ready Opening', 'Pool Opening — 2nd Visit', 'Pool Closing', 'Pool Maintenance', 'Service Call', 'Leak Detection', 'Pressure Test', 'Liner Replacement', 'Liner Measurement'] as const;
type ServiceType = typeof SERVICE_TYPES[number];

interface Assignment {
  id: string;
  assignment_date: string;
  team: Team | null;
  client_email: string;
  sort_order: number;
  admin_note: string;
  title: string;
  service_type: string;
  display_pool_type: string | null;
  display_address: string | null;
  display_phone: string | null;
  display_pool_cover: string | null;
  display_pool_opening: string | null;
  display_pool_closing: string | null;
  display_pool_maintenance: string | null;
  display_backyard_access: string | null;
  display_opening_add_ons: string | null;
  display_closing_add_ons: string | null;
  display_pool_size: string | null;
  completed: boolean;
  reschedule_cancel: boolean;
  report_completed: boolean;
  linked_report_id: string | null;
  status: string | null;
  assigned_technician_id: string | null;
  created_from_booking: boolean;
  service_not_complete: boolean;
  cash_paid_amount: number | null;
  client?: Client;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

// Returns the target PRINCESSDAVID date for a van assignment:
// Mon/Tue → following Friday; Wed/Thu/Fri → following Monday
function getPrincessTargetDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay(); // 0=Sun,1=Mon,...,6=Sat
  let daysAhead: number;
  if (dow === 1 || dow === 2) {
    // Monday or Tuesday → next Friday
    daysAhead = (5 - dow + 7) % 7 || 7;
  } else {
    // Wed(3), Thu(4), Fri(5), or fallback → next Monday
    daysAhead = (1 - dow + 7) % 7 || 7;
  }
  return addDays(dateStr, daysAhead);
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
}

/* ── Client Search Modal ─────────────────────────────────────── */

function ClientSearchModal({ onSelect, onClose, supabaseUrl, supabaseKey }: {
  onSelect: (c: Client, serviceType: string) => void;
  onClose: () => void;
  supabaseUrl: string;
  supabaseKey: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [hubspotEmail, setHubspotEmail] = useState('');
  const [hubspotLoading, setHubspotLoading] = useState(false);
  const [tab, setTab] = useState<'db' | 'hubspot'>('db');
  const [pendingClient, setPendingClient] = useState<Client | null>(null);
  const [selectedServiceType, setSelectedServiceType] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (tab !== 'db' || !query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from('clients')
        .select('id,first_name,last_name,email,phone,address,city,zip,pool_type,pool_cover,pool_opening,pool_closing,pool_maintenance,backyard_access_approval,pool_opening_confirmed,pool_closing_confirmed,pool_opening_add_on,pool_closing_add_ons,pool_size')
        .or(`email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%,address.ilike.%${query}%`)
        .limit(8);
      setResults(data || []);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query, tab]);

  const searchHubspot = async () => {
    if (!hubspotEmail.trim()) return;
    setHubspotLoading(true);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/hubspot-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
        body: JSON.stringify({ email: hubspotEmail.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok || !data.client) {
        toast.error(data.error || 'Contact not found in HubSpot');
      } else {
        setPendingClient(data.client);
      }
    } catch {
      toast.error('HubSpot search failed');
    } finally {
      setHubspotLoading(false);
    }
  };

  if (pendingClient) {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/40" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-3 overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="text-sm font-semibold text-neutral-900">Adding: {pendingClient.first_name} {pendingClient.last_name}</h3>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Service Type <span className="text-neutral-400 font-normal normal-case">(optional)</span></label>
              <div className="grid grid-cols-1 gap-1.5">
                {SERVICE_TYPES.map(st => (
                  <button key={st} onClick={() => setSelectedServiceType(prev => prev === st ? '' : st)}
                    className={`text-left px-3 py-2 rounded-lg border text-sm font-medium transition-colors
                      ${selectedServiceType === st ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'}`}>
                    {st}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => onSelect(pendingClient, selectedServiceType)}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-700">
                Add to Team
              </button>
              <button onClick={() => { setPendingClient(null); setSelectedServiceType(''); }}
                className="px-4 py-2.5 text-sm font-medium rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50">
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-3 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Tabs */}
        <div className="flex border-b">
          <button onClick={() => setTab('db')} className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'db' ? 'border-b-2 border-brand-600 text-brand-700' : 'text-neutral-500 hover:text-neutral-700'}`}>
            Search Existing Clients
          </button>
          <button onClick={() => setTab('hubspot')} className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'hubspot' ? 'border-b-2 border-brand-600 text-brand-700' : 'text-neutral-500 hover:text-neutral-700'}`}>
            Search HubSpot by Email
          </button>
          <button onClick={onClose} className="px-3 text-neutral-400 hover:text-neutral-600"><X className="w-5 h-5" /></button>
        </div>

        {tab === 'db' ? (
          <>
            <div className="p-3 border-b flex items-center gap-2">
              <Search className="w-4 h-4 text-neutral-400 shrink-0" />
              <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search by name, email or address..."
                className="flex-1 text-sm outline-none text-neutral-800 placeholder-neutral-400" />
            </div>
            <div className="max-h-72 overflow-y-auto">
              {loading && <div className="px-4 py-6 text-center text-neutral-400 text-sm">Searching...</div>}
              {!loading && query && results.length === 0 && (
                <div className="px-4 py-5 text-center text-neutral-400 text-sm">
                  No clients found — try the HubSpot tab for new contacts
                </div>
              )}
              {!loading && !query && <div className="px-4 py-6 text-center text-neutral-400 text-sm">Type to search</div>}
              {results.map(c => (
                <button key={c.email} onClick={() => { setPendingClient(c); setSelectedServiceType(''); }}
                  className="w-full px-4 py-3 text-left hover:bg-neutral-50 border-b last:border-b-0 transition-colors">
                  <div className="font-medium text-neutral-900">{c.first_name} {c.last_name}</div>
                  <div className="text-xs text-neutral-500">{c.email}</div>
                  {c.address && <div className="text-xs text-neutral-400">{c.address}, {c.city}</div>}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="p-4 space-y-3">
            <p className="text-xs text-neutral-500">Look up a contact directly from HubSpot by their exact email. This will sync their info and add them to the assignment.</p>
            <div className="flex gap-2">
              <input
                type="email"
                value={hubspotEmail}
                onChange={e => setHubspotEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchHubspot()}
                placeholder="client@example.com"
                className="flex-1 text-sm rounded-lg border border-neutral-300 px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                autoFocus
              />
              <button
                onClick={searchHubspot}
                disabled={hubspotLoading}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {hubspotLoading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Add Member Modal (daily override) ──────────────────────── */

function AddDailyMemberModal({ team, date, technicians, existingStaffIds, onAdd, onClose }: {
  team: Team;
  date: string;
  technicians: Technician[];
  existingStaffIds: string[];
  onAdd: (tech: Technician) => void;
  onClose: () => void;
}) {
  const available = technicians.filter(t => !existingStaffIds.includes(t.staff_id));
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-3 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b">
          <div className="font-semibold text-neutral-900">Add to {team}</div>
          <div className="text-xs text-neutral-500 mt-0.5">For {formatDateDisplay(date)} only</div>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {available.length === 0 && <div className="px-4 py-6 text-center text-neutral-400 text-sm">All technicians already on this team today</div>}
          {available.map(t => (
            <button key={t.staff_id} onClick={() => onAdd(t)}
              className="w-full px-4 py-3 text-left hover:bg-neutral-50 border-b last:border-b-0 transition-colors">
              <div className="font-medium text-neutral-900">{t.first_name} {t.last_name}</div>
              <div className="text-xs text-neutral-500">{t.staff_id} · {t.role}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Editable Field ───────────────────────────────────────────── */

function EditableField({ label, value, fallback, onSave, editable }: {
  label: string; value: string | null | undefined; fallback: string | null | undefined;
  onSave: (val: string) => void; editable?: boolean;
}) {
  const display = value || fallback || '';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(display);

  const startEdit = () => { if (!editable) return; setDraft(display); setEditing(true); };
  const save = () => { onSave(draft); setEditing(false); };
  const cancel = () => { setDraft(display); setEditing(false); };

  if (editing) {
    return (
      <div className="space-y-1">
        <div className="text-xs font-medium text-neutral-400 uppercase tracking-wide">{label}</div>
        <input value={draft} onChange={e => setDraft(e.target.value)}
          className="w-full text-sm rounded border border-neutral-300 px-2 py-1.5 focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
          autoFocus onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }} />
        <div className="flex gap-1.5">
          <button onClick={save} className="px-2.5 py-1 text-xs font-medium rounded bg-brand-600 text-white hover:bg-brand-700">Save</button>
          <button onClick={cancel} className="px-2.5 py-1 text-xs font-medium rounded border border-neutral-300 text-neutral-600 hover:bg-neutral-50">Cancel</button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="text-xs font-medium text-neutral-400 uppercase tracking-wide">{label}</div>
      <div className={`flex items-center gap-1 ${editable ? 'group cursor-pointer' : ''}`} onClick={startEdit}>
        <span className={`text-sm break-words ${display ? 'text-neutral-700' : 'text-neutral-400 italic'}`}>{display || 'N/A'}</span>
        {editable && <Pencil className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
      </div>
    </div>
  );
}

function ClosingAddOnsField({ value, fallback, onSave, editable }: {
  value: string | null | undefined; fallback: string | null | undefined;
  onSave: (val: string) => void; editable?: boolean;
}) {
  const current = parseAddOns(value || fallback);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(current);

  const startEdit = () => { if (!editable) return; setDraft(current); setEditing(true); };
  const save = () => { onSave(serializeAddOns(draft)); setEditing(false); };
  const cancel = () => { setDraft(current); setEditing(false); };

  if (editing) {
    return (
      <div className="space-y-2">
        <AddOnPicker selected={draft} onChange={setDraft} label="Closing Add-Ons" />
        <div className="flex gap-1.5">
          <button onClick={save} className="px-2.5 py-1 text-xs font-medium rounded bg-brand-600 text-white hover:bg-brand-700">Save</button>
          <button onClick={cancel} className="px-2.5 py-1 text-xs font-medium rounded border border-neutral-300 text-neutral-600 hover:bg-neutral-50">Cancel</button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="text-xs font-medium text-neutral-400 uppercase tracking-wide flex items-center gap-1">
        Closing Add-ons
        {editable && <button onClick={startEdit} className="text-neutral-300 hover:text-brand-600"><Pencil className="w-3 h-3" /></button>}
      </div>
      {current.length > 0 ? (
        <div className="flex flex-wrap gap-1 mt-1">
          {current.map(a => (
            <span key={a} className="inline-flex items-center px-2 py-0.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-medium">{a}</span>
          ))}
        </div>
      ) : (
        <span className="text-sm text-neutral-400 italic">N/A</span>
      )}
    </div>
  );
}

/* ── Inline Copy Button ───────────────────────────────────────── */

function CopyBtn({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => toast.error('Failed to copy'));
  };
  return (
    <button onClick={handle}
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border transition-colors shrink-0
        ${copied ? 'border-green-300 bg-green-50 text-green-700' : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300'}`}
      title={`Copy ${label}`}>
      {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy {label}</>}
    </button>
  );
}

/* ── Maps / Address Button ────────────────────────────────────── */

function AddressBtn({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const handle = () => {
    if (isMobile) {
      const encoded = encodeURIComponent(address);
      // Try Apple Maps first (iOS), fall back to geo: URI (Android/universal)
      const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      const url = isIos
        ? `maps://?q=${encoded}`
        : `geo:0,0?q=${encoded}`;
      window.open(url, '_blank');
    } else {
      navigator.clipboard.writeText(address).then(() => {
        setCopied(true);
        toast.success('Address copied');
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => toast.error('Failed to copy'));
    }
  };

  if (isMobile) {
    return (
      <a href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
        target="_blank" rel="noopener noreferrer"
        onClick={e => { e.preventDefault(); handle(); }}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border transition-colors border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300 shrink-0">
        <Navigation className="w-3 h-3" /> Maps
      </a>
    );
  }

  return (
    <button onClick={handle}
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border transition-colors shrink-0
        ${copied ? 'border-green-300 bg-green-50 text-green-700' : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300'}`}>
      {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy Address</>}
    </button>
  );
}

/* ── Assignment Card ──────────────────────────────────────────── */

function AssignmentCard({ assignment, index, total, onDelete, onUpdate, onChangeDate, onChangeTeam, isAdmin, isSenior, onNavigate }: {
  assignment: Assignment; index: number; total: number;
  onDelete: () => void; onUpdate: (fields: Partial<Assignment>) => void;
  onChangeDate?: (newDate: string) => void;
  onChangeTeam?: (newTeam: Team) => void;
  isAdmin: boolean;
  isSenior: boolean;
  onNavigate: (path: string, state?: Record<string, unknown>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [showMovePicker, setShowMovePicker] = useState(false);
  const [movePositionDraft, setMovePositionDraft] = useState(index + 1);
  const [dateDraft, setDateDraft] = useState(assignment.assignment_date);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [sendingOnMyWay, setSendingOnMyWay] = useState(false);
  const client = assignment.client;

  const displayTitle = assignment.title || (client ? `${client.first_name} ${client.last_name}` : assignment.client_email);
  const displayAddress = assignment.display_address || (client ? `${client.address}${client.city ? ', ' + client.city : ''}${client.zip ? ' ' + client.zip : ''}` : '');

  const handleSendOnMyWay = async () => {
    const email = assignment.client_email;
    if (!email) { toast.error('No client email on this assignment'); return; }
    setSendingOnMyWay(true);
    const tid = toast.loading('Sending "on our way" email…');
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-onmyway-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          clientEmail: email,
          clientFirstName: client?.first_name || '',
          clientName: displayTitle,
          serviceType: assignment.service_type || '',
          serviceDate: assignment.assignment_date,
          address: assignment.display_address || (client ? [client.address, client.city, client.zip].filter(Boolean).join(', ') : ''),
          adminNote: assignment.admin_note || '',
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || `Status ${res.status}`);
      }
      toast.success('On My Way email sent!', { id: tid });
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : String(err)}`, { id: tid });
    } finally {
      setSendingOnMyWay(false);
    }
  };

  const isStruck = assignment.reschedule_cancel;
  const canManageSchedule = isAdmin || isSenior;
  const updateField = (field: string, value: string) => onUpdate({ [field]: value } as Partial<Assignment>);

  const handleSendReminder = async () => {
    const email = assignment.client_email;
    if (!email) { toast.error('No client email on this assignment'); return; }
    setSendingReminder(true);
    const tid = toast.loading('Sending reminder…');
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-reminder-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          clientEmail: email,
          clientFirstName: client?.first_name || '',
          clientName: displayTitle,
          serviceType: assignment.service_type || '',
          serviceDate: assignment.assignment_date,
          address: assignment.display_address || (client ? [client.address, client.city, client.zip].filter(Boolean).join(', ') : ''),
          poolType: assignment.display_pool_type || client?.pool_type || '',
          openingPackage: assignment.display_pool_opening || client?.pool_opening || '',
          openingAddOns: assignment.display_opening_add_ons || client?.pool_opening_add_on || '',
          closingPackage: assignment.display_pool_closing || client?.pool_closing || '',
          closingAddOns: assignment.display_closing_add_ons || client?.pool_closing_add_ons || '',
          maintenancePackage: assignment.display_pool_maintenance || client?.pool_maintenance || '',
          adminNote: assignment.admin_note || '',
          assignmentId: assignment.id,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || `Status ${res.status}`);
      }
      toast.success('Reminder sent!', { id: tid });
    } catch (err) {
      toast.error(`Failed to send reminder: ${err instanceof Error ? err.message : String(err)}`, { id: tid });
    } finally {
      setSendingReminder(false);
    }
  };

  return (
    <div className={`rounded-lg border shadow-sm overflow-hidden transition-all
      ${isStruck ? 'bg-red-50 border-red-200 opacity-70' : assignment.service_not_complete ? 'bg-red-50 border-red-400' : assignment.report_completed ? 'bg-green-50 border-green-300' : assignment.completed ? 'bg-white border-green-200' : 'bg-white border-neutral-200'}`}>

      {/* Main row */}
      <div className="px-3 py-3 sm:px-4">
        <div className="flex items-start gap-2">
          {/* Stop number + safer reorder */}
          <div className="flex flex-col items-center gap-1 shrink-0 mt-0.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0
              ${assignment.report_completed ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600'}`}>
              {index + 1}
            </div>
            {canManageSchedule && total > 1 && (
              <button
                onClick={() => { setMovePositionDraft(index + 1); setShowMovePicker(true); }}
                className="min-h-[32px] px-2 rounded-lg border border-neutral-200 bg-white text-[11px] font-bold text-neutral-600 hover:bg-neutral-50"
                title="Move this stop to another position"
              >
                Move
              </button>
            )}
          </div>

          {/* Title + address */}
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <div className="flex items-center gap-1">
                <input value={titleDraft} onChange={e => setTitleDraft(e.target.value)}
                  className="flex-1 text-sm font-semibold rounded border border-neutral-300 px-2 py-0.5 focus:ring-1 focus:ring-brand-500 min-w-0"
                  autoFocus onKeyDown={e => { if (e.key === 'Enter') { onUpdate({ title: titleDraft }); setEditingTitle(false); } if (e.key === 'Escape') setEditingTitle(false); }} />
                <button onClick={() => { onUpdate({ title: titleDraft }); setEditingTitle(false); }} className="p-1 text-green-600"><Save className="w-3.5 h-3.5" /></button>
                <button onClick={() => setEditingTitle(false)} className="p-1 text-neutral-400"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <div className="flex items-start gap-1.5 flex-wrap">
                <div className={`text-sm font-semibold flex items-center gap-1 leading-tight
                  ${isStruck ? 'line-through text-red-500' : 'text-neutral-900'} ${isAdmin ? 'cursor-pointer group' : ''}`}
                  onClick={() => { if (isAdmin) { setTitleDraft(displayTitle); setEditingTitle(true); } }}>
                  {displayTitle}
                  {isAdmin && <Pencil className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 shrink-0" />}
                </div>
                {assignment.service_type && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-brand-100 text-brand-700 border border-brand-200 shrink-0">
                    {assignment.service_type}
                  </span>
                )}
                {assignment.service_not_complete && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 border border-red-300 shrink-0">
                    NOT COMPLETE
                  </span>
                )}
                {assignment.cash_paid_amount != null && assignment.cash_paid_amount > 0 && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700 border border-green-300 shrink-0">
                    CASH ${assignment.cash_paid_amount.toFixed(2)}
                  </span>
                )}
                {(() => {
                  const isSwimReady = assignment.service_type === 'Swim-Ready Opening' || assignment.service_type?.includes('Swim-Ready');
                  const size = assignment.display_pool_size || client?.pool_size || '';
                  if (!isSwimReady || !size) return null;
                  const [w, h] = size.toLowerCase().replace(/\s/g, '').split('x').map(Number);
                  const isSuperLarge = w >= 45 && h >= 22;
                  const isLarge = !isSuperLarge && w >= 32 && h >= 16;
                  if (isSuperLarge) return (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 border border-red-300 shrink-0">SUPER LARGE</span>
                  );
                  if (isLarge) return (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700 border border-amber-300 shrink-0">LARGE</span>
                  );
                  return null;
                })()}
                {assignment.admin_note && (
                  <button onClick={() => setExpanded(true)}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200 shrink-0 cursor-pointer hover:bg-amber-200 transition-colors"
                    title="This client has a note — click to view">
                    <StickyNote className="w-3 h-3" /> Note
                  </button>
                )}
              </div>
            )}
            {displayAddress && !editingTitle && (
              <div className={`text-xs mt-0.5 flex items-center gap-1 ${isStruck ? 'text-red-400 line-through' : 'text-neutral-500'}`}>
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{displayAddress}</span>
              </div>
            )}
          </div>

          {/* Delete */}
          {isAdmin && (
            <button onClick={onDelete} className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-500 hover:bg-red-100 shrink-0 mt-0.5" title="Remove"><Trash2 className="w-4 h-4" /></button>
          )}
        </div>

        {/* Clean quick actions */}
        <div className="mt-4 grid grid-cols-1 gap-2 items-stretch">
          <button
            onClick={() => onNavigate('/submit-report', {
              ...(assignment.linked_report_id ? { reportId: assignment.linked_report_id } : {}),
              assignmentId: assignment.id,
              clientEmail: assignment.client_email,
              serviceType: assignment.service_type || '',
              serviceDate: assignment.assignment_date,
              returnTo: {
                path: '/team-assignments',
                date: assignment.assignment_date,
                assignmentId: assignment.id,
              },
            })}
            disabled={assignment.reschedule_cancel}
            className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all shadow-sm
              ${assignment.report_completed
                ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-500/20'
                : assignment.reschedule_cancel
                  ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                  : 'bg-brand-600 text-white hover:bg-brand-700 active:scale-95 shadow-blue-500/20'}`}
          >
            {assignment.report_completed ? <ClipboardCheck className="w-4 h-4" /> : <ClipboardList className="w-4 h-4" />}
            {assignment.report_completed ? 'Report Submitted · View / Edit' : 'Submit Report'}
          </button>

          <div className="grid grid-cols-1 sm:flex sm:items-center gap-2">
            <CopyBtn text={assignment.client_email} label="Email" />
            {displayAddress && <AddressBtn address={displayAddress} />}
          </div>
        </div>

        {/* Admin tools */}
        <div className="mt-3 grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-end gap-2">

          {isAdmin && (
            <button
              onClick={handleSendReminder}
              disabled={sendingReminder || !assignment.client_email}
              className="min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-xl bg-white text-brand-700 border border-brand-200 hover:bg-brand-50 disabled:opacity-50 transition-colors"
              title="Send service reminder email to client"
            >
              {sendingReminder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              <span>Send Reminder</span>
            </button>
          )}

          {(isAdmin || isSenior) && (
            <button
              onClick={handleSendOnMyWay}
              disabled={sendingOnMyWay || !assignment.client_email}
              className="min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-xl bg-white text-sky-700 border border-sky-200 hover:bg-sky-50 disabled:opacity-50 transition-colors"
              title="Send 'On Our Way' email to client"
            >
              {sendingOnMyWay ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
              <span>On My Way</span>
            </button>
          )}

          {canManageSchedule && onChangeDate && (
            <button onClick={() => { setShowDatePicker(true); setDateDraft(assignment.assignment_date); }}
              className="min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-xl bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100 transition-colors"
              title="Move to different date">
              <Calendar className="w-3.5 h-3.5" />
              <span>Change Date</span>
            </button>
          )}

          {canManageSchedule && onChangeTeam && (
            <button onClick={() => setShowTeamPicker(true)}
              className="min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-xl bg-neutral-50 text-neutral-700 border border-neutral-200 hover:bg-neutral-100 transition-colors"
              title="Move to different team">
              <Users className="w-3.5 h-3.5" />
              <span>Switch Team</span>
            </button>
          )}

          <button onClick={() => setExpanded(!expanded)} className="min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-xl bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50" title="Details">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span>{expanded ? 'Hide Details' : 'Details'}</span>
          </button>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-neutral-100 px-3 py-3 bg-neutral-50 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <EditableField label="Phone" value={assignment.display_phone} fallback={client?.phone} onSave={v => updateField('display_phone', v)} editable={isAdmin} />
            <EditableField label="Address" value={assignment.display_address} fallback={displayAddress} onSave={v => updateField('display_address', v)} editable={isAdmin} />
            <EditableField label="Pool Type" value={assignment.display_pool_type} fallback={client?.pool_type} onSave={v => updateField('display_pool_type', v)} editable={isAdmin} />
            <EditableField label="Pool Cover" value={assignment.display_pool_cover} fallback={client?.pool_cover} onSave={v => updateField('display_pool_cover', v)} editable={isAdmin} />
            <EditableField label="Backyard Access" value={assignment.display_backyard_access} fallback={client?.backyard_access_approval} onSave={v => updateField('display_backyard_access', v)} editable={isAdmin} />
            <EditableField label="Pool Opening" value={assignment.display_pool_opening} fallback={client?.pool_opening} onSave={v => updateField('display_pool_opening', v)} editable={isAdmin} />
            <EditableField label="Pool Closing" value={assignment.display_pool_closing} fallback={client?.pool_closing} onSave={v => updateField('display_pool_closing', v)} editable={isAdmin} />
            <EditableField label="Maintenance" value={assignment.display_pool_maintenance} fallback={client?.pool_maintenance} onSave={v => updateField('display_pool_maintenance', v)} editable={isAdmin} />
            <EditableField label="Opening Add-ons" value={assignment.display_opening_add_ons} fallback={client?.pool_opening_add_on} onSave={v => updateField('display_opening_add_ons', v)} editable={isAdmin} />
            <div className="sm:col-span-2">
              <ClosingAddOnsField
                value={assignment.display_closing_add_ons}
                fallback={client?.pool_closing_add_ons}
                editable={isAdmin}
                onSave={v => updateField('display_closing_add_ons', v)}
              />
            </div>
            <EditableField label="Pool Size" value={assignment.display_pool_size} fallback={client?.pool_size} onSave={v => updateField('display_pool_size', v)} editable={isAdmin} />
          </div>

          {/* Email */}
          <div className="border-t border-neutral-200 pt-3">
            <div className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">Email</div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-neutral-700 break-all">{assignment.client_email}</span>
              <CopyBtn text={assignment.client_email} label="Email" />
            </div>
          </div>

          {/* Note */}
          <div className="border-t border-neutral-200 pt-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-xs font-medium text-neutral-400 uppercase tracking-wide flex items-center gap-1">
                <StickyNote className="w-3.5 h-3.5" /> Note
              </div>
              {isAdmin && !editingNote && (
                <button onClick={() => { setNoteDraft(assignment.admin_note || ''); setEditingNote(true); }}
                  className="text-xs text-brand-600 hover:text-brand-800 font-medium">
                  {assignment.admin_note ? 'Edit' : 'Add note'}
                </button>
              )}
            </div>
            {editingNote ? (
              <div className="space-y-2">
                <textarea value={noteDraft} onChange={e => setNoteDraft(e.target.value)} rows={3}
                  className="w-full text-sm rounded-md border border-neutral-300 p-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  placeholder="Instructions for the team..." autoFocus />
                <div className="flex gap-2">
                  <button onClick={() => { onUpdate({ admin_note: noteDraft }); setEditingNote(false); }}
                    className="px-3 py-1.5 text-xs font-medium rounded bg-brand-600 text-white hover:bg-brand-700">Save</button>
                  <button onClick={() => setEditingNote(false)}
                    className="px-3 py-1.5 text-xs font-medium rounded border border-neutral-300 text-neutral-600 hover:bg-neutral-50">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-neutral-600 italic">
                {assignment.admin_note || <span className="text-neutral-400">No note</span>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Move Position Modal */}
      {showMovePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowMovePicker(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-neutral-900">Move stop</h3>
              <button onClick={() => setShowMovePicker(false)} className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-neutral-600 mb-4">Choose where <span className="font-semibold text-neutral-900">{displayTitle}</span> should appear in this team route.</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {Array.from({ length: total }, (_, i) => i + 1).map(pos => (
                <button
                  key={pos}
                  onClick={() => setMovePositionDraft(pos)}
                  className={`min-h-[48px] rounded-xl border text-sm font-bold transition-colors ${movePositionDraft === pos ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'}`}
                >
                  #{pos}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { onUpdate({ sort_order: movePositionDraft - 1 }); setShowMovePicker(false); }}
                disabled={movePositionDraft === index + 1}
                className="min-h-[46px] rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 disabled:opacity-50"
              >
                Move Here
              </button>
              <button onClick={() => setShowMovePicker(false)} className="min-h-[46px] rounded-xl border border-neutral-300 text-neutral-700 text-sm font-bold hover:bg-neutral-50">
                Keep Same
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Date Modal */}
      {showDatePicker && onChangeDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowDatePicker(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-neutral-900">Move to a different date</h3>
              <button onClick={() => setShowDatePicker(false)} className="text-neutral-400 hover:text-neutral-600"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-neutral-500 mb-3 truncate">Client: <span className="font-medium text-neutral-700">{displayTitle}</span></p>
            <input type="date" value={dateDraft} onChange={e => setDateDraft(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 mb-4" />
            <div className="flex gap-2">
              <button onClick={() => { if (dateDraft) { onChangeDate(dateDraft); setShowDatePicker(false); } }}
                className="flex-1 px-3 py-2.5 text-sm font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-700">Move</button>
              <button onClick={() => setShowDatePicker(false)}
                className="flex-1 px-3 py-2.5 text-sm font-medium rounded-lg border border-neutral-300 text-neutral-700 hover:bg-neutral-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Change Team Modal */}
      {showTeamPicker && onChangeTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowTeamPicker(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-neutral-900">Move to a different team</h3>
              <button onClick={() => setShowTeamPicker(false)} className="text-neutral-400 hover:text-neutral-600"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-neutral-500 mb-3 truncate">Client: <span className="font-medium text-neutral-700">{displayTitle}</span></p>
            <div className="flex flex-col gap-2">
              {(['PRINCESSDAVID','TONYVAN','JARVISVAN','SONIC'] as Team[]).filter(t => t !== assignment.team).map(t => (
                <button key={t} onClick={() => { onChangeTeam(t); setShowTeamPicker(false); }}
                  className="w-full text-left px-4 py-3 text-sm font-medium rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-800 transition-colors">
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/* ── Client History Search ────────────────────────────────────── */

interface PastAssignment {
  id: string;
  assignment_date: string;
  team: Team | null;
  title: string;
  service_type: string;
  client_email: string;
  display_address: string | null;
}

function ClientHistorySearch({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PastAssignment[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from('team_daily_assignments')
      .select('id,assignment_date,team,title,service_type,client_email,display_address')
      .or(`title.ilike.%${q}%,client_email.ilike.%${q}%`)
      .order('assignment_date', { ascending: false })
      .limit(50);
    setResults((data as PastAssignment[]) || []);
    setSearching(false);
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => doSearch(query), 250);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, doSearch]);

  const grouped = results.reduce<Record<string, PastAssignment[]>>((acc, a) => {
    (acc[a.assignment_date] = acc[a.assignment_date] || []).push(a);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 bg-black/40 px-3" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-100">
          <History className="w-4 h-4 text-neutral-500 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search client name or email…"
            className="flex-1 text-sm outline-none text-neutral-800 placeholder-neutral-400"
          />
          {searching && <Loader2 className="w-4 h-4 animate-spin text-neutral-400 shrink-0" />}
          {!searching && query && (
            <button onClick={() => setQuery('')} className="text-neutral-400 hover:text-neutral-600 shrink-0">
              <X className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 shrink-0 ml-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {!query && (
            <div className="px-4 py-8 text-center text-neutral-400 text-sm">Type to search past assignments</div>
          )}
          {query.length >= 2 && !searching && results.length === 0 && (
            <div className="px-4 py-8 text-center text-neutral-400 text-sm">No past assignments found</div>
          )}
          {sortedDates.map(date => (
            <div key={date}>
              <div className="sticky top-0 bg-neutral-50 border-b border-neutral-100 px-4 py-2 flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-600">{formatDateDisplay(date)}</span>
                <button
                  onClick={() => { onClose(); navigate('/team-assignments', { state: { date } }); }}
                  className="text-xs text-brand-600 hover:underline font-medium"
                >
                  View day →
                </button>
              </div>
              {grouped[date].map(a => (
                <button
                  key={a.id}
                  onClick={() => { onClose(); navigate('/team-assignments', { state: { date: a.assignment_date, scrollToAssignmentId: a.id } }); }}
                  className="w-full px-4 py-2.5 border-b border-gray-50 last:border-0 flex items-center gap-3 text-left hover:bg-brand-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-neutral-900 truncate">{a.title || a.client_email}</div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {a.service_type && (
                        <span className="text-xs text-brand-700 bg-brand-50 border border-brand-100 px-1.5 py-0.5 rounded font-medium">{a.service_type}</span>
                      )}
                      {a.team && (
                        <span className="text-xs text-neutral-500">{a.team}</span>
                      )}
                      {a.display_address && (
                        <span className="text-xs text-neutral-400 truncate">{a.display_address}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-brand-600 font-medium shrink-0">Go →</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Unallocated Card ─────────────────────────────────────────── */

function UnallocatedCard({ a, displayTitle, displayAddress, isCementPool, details, isAdmin, onRemove, onAssign, onReport }: {
  a: Assignment;
  displayTitle: string;
  displayAddress: string;
  isCementPool: boolean;
  details: { label: string; value: string }[];
  isAdmin: boolean;
  onRemove: () => void;
  onAssign: () => void;
  onReport: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg border border-amber-200 shadow-sm overflow-hidden">
      <div className="px-3 py-2.5">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-neutral-900">{displayTitle}</span>
              {a.service_type && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-brand-100 text-brand-700 border border-brand-200">{a.service_type}</span>
              )}
              {isCementPool && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">ACID WASH</span>
              )}
              {a.created_from_booking && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">Booked</span>
              )}
            </div>
            {displayAddress && (
              <div className="text-xs mt-0.5 flex items-center gap-1 text-neutral-500">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{displayAddress}</span>
              </div>
            )}
          </div>
          {isAdmin && (
            <button onClick={onRemove} className="p-1 text-red-300 hover:text-red-500 shrink-0"><Trash2 className="w-4 h-4" /></button>
          )}
        </div>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {isAdmin && (
            <button onClick={onAssign}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors">
              <Users className="w-3.5 h-3.5" /> Assign Team
            </button>
          )}
          {!a.report_completed && !a.reschedule_cancel && (
            <button onClick={onReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors">
              <ClipboardList className="w-3.5 h-3.5" /> Complete Report
            </button>
          )}
          {a.report_completed && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 border border-green-300 text-green-800 text-xs font-semibold">
              <ClipboardCheck className="w-3.5 h-3.5" /> Report Submitted
            </span>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-200 text-neutral-600 text-xs font-medium hover:bg-neutral-50 transition-colors ml-auto"
          >
            {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Less</> : <><ChevronDown className="w-3.5 h-3.5" /> Details</>}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-amber-100 bg-amber-50 px-3 py-3 space-y-2">
          {details.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
              {details.map(d => (
                <div key={d.label}>
                  <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">{d.label}</p>
                  <p className="text-sm text-neutral-800 font-medium">{d.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-400 italic">No additional service details on file</p>
          )}
          {a.admin_note && (
            <div className="mt-2 rounded-lg bg-amber-100 border border-amber-300 px-3 py-2">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-0.5">Note</p>
              <p className="text-sm text-amber-900">{a.admin_note}</p>
            </div>
          )}
          <div className="pt-1">
            <p className="text-xs text-neutral-400">{a.client_email}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────── */

export default function TeamAssignments() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [presetMembers, setPresetMembers] = useState<PresetMember[]>([]);
  const [dailyMembers, setDailyMembers] = useState<DailyMember[]>([]);
  const [exclusions, setExclusions] = useState<{ team: Team; staff_id: string }[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyNotes, setDailyNotes] = useState<Record<Team, { id: string; note: string }>>({} as Record<Team, { id: string; note: string }>);
  const [editingNoteTeam, setEditingNoteTeam] = useState<Team | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [searchTarget, setSearchTarget] = useState<Team | null>(null);
  const [addDailyTarget, setAddDailyTarget] = useState<Team | null>(null);
  const [assignTeamTarget, setAssignTeamTarget] = useState<string | null>(null); // assignment id
  const [showHistorySearch, setShowHistorySearch] = useState(false);

  const technician = JSON.parse(sessionStorage.getItem('technician') || '{}');
  const isAdmin = technician.role === 'Admin';
  const isSenior = technician.role === 'Pool Tech Senior';
  const isAssistant = technician.role === 'Assistant Pool Tech';
  const canManageSchedule = isAdmin || isSenior;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  // For assistants: find their team from daily members first, then preset
  const myTeam: Team | null = (() => {
    if (!isAssistant) return null;
    const dm = dailyMembers.find(m => m.staff_id === technician.id || m.staff_id === technician.staff_id);
    if (dm) return dm.team;
    const pm = presetMembers.find(m => m.staff_id === technician.id || m.staff_id === technician.staff_id);
    return pm ? pm.team : null;
  })();

  const visibleTeams = isAssistant && myTeam ? [myTeam] : [...TEAMS];

  useEffect(() => { loadAll(); }, [selectedDate]);

  // Keep a ref to the last scrollToAssignmentId we have successfully scrolled to,
  // so re-renders (e.g. after note saves) don't re-trigger the scroll.
  const lastScrolledIdRef = useRef<string | null>(null);

  // React to location.state changes (same-route navigation from ClientHistorySearch
  // does NOT remount the component, so we must watch location.state explicitly).
  useEffect(() => {
    const navState = location.state as { date?: string; scrollToAssignmentId?: string } | null;
    if (!navState) return;

    // Reset scroll tracker whenever a new target arrives
    if (navState.scrollToAssignmentId && navState.scrollToAssignmentId !== lastScrolledIdRef.current) {
      lastScrolledIdRef.current = null;
    }

    // Switch to the target date if needed
    if (navState.date) {
      setSelectedDate(prev => prev !== navState.date ? navState.date! : prev);
    }
  }, [location.state]);

  // After assignments finish loading for the correct date, scroll to the target card
  useEffect(() => {
    const navState = location.state as { date?: string; scrollToAssignmentId?: string } | null;
    const targetId = navState?.scrollToAssignmentId;
    const targetDate = navState?.date;

    if (loading || !targetId) return;
    if (lastScrolledIdRef.current === targetId) return;   // already done
    if (targetDate && selectedDate !== targetDate) return; // wrong date still loading

    const timer = window.setTimeout(() => {
      const el = document.getElementById(`assignment-${targetId}`);
      if (!el) return;
      lastScrolledIdRef.current = targetId;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-4', 'ring-blue-400', 'rounded-xl');
      window.setTimeout(() => el.classList.remove('ring-4', 'ring-blue-400', 'rounded-xl'), 2200);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [loading, selectedDate, location.state]);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadAssignments(), loadPresetMembers(), loadDailyMembers(), loadTechnicians(), loadDailyNotes(), loadExclusions()]);
    setLoading(false);
  };

  const loadDailyNotes = async () => {
    const { data } = await supabase
      .from('team_daily_notes')
      .select('id,team,note')
      .eq('assignment_date', selectedDate);
    const map = {} as Record<Team, { id: string; note: string }>;
    (data || []).forEach((row: { id: string; team: Team; note: string }) => {
      map[row.team] = { id: row.id, note: row.note };
    });
    setDailyNotes(map);
  };

  const saveDailyNote = async (team: Team, text: string) => {
    const existing = dailyNotes[team];
    if (existing) {
      await supabase.from('team_daily_notes')
        .update({ note: text, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      setDailyNotes(prev => ({ ...prev, [team]: { ...existing, note: text } }));
    } else {
      const { data } = await supabase.from('team_daily_notes')
        .insert({ assignment_date: selectedDate, team, note: text })
        .select('id,team,note').single();
      if (data) setDailyNotes(prev => ({ ...prev, [team]: { id: data.id, note: data.note } }));
    }
    setEditingNoteTeam(null);
    toast.success('Team note saved');
  };

  const loadExclusions = async () => {
    const { data } = await supabase
      .from('daily_team_member_exclusions')
      .select('team,staff_id')
      .eq('assignment_date', selectedDate);
    setExclusions((data || []) as { team: Team; staff_id: string }[]);
  };

  const excludePresetMember = async (staffId: string, team: Team) => {
    await supabase.from('daily_team_member_exclusions')
      .insert({ assignment_date: selectedDate, team, staff_id: staffId });
    setExclusions(prev => [...prev, { team, staff_id: staffId }]);
  };

  const loadTechnicians = async () => {
    const { data } = await supabase.from('technicians').select('id,staff_id,first_name,last_name,role');
    setTechnicians(data || []);
  };

  const loadPresetMembers = async () => {
    const { data: rows } = await supabase.from('team_members').select('*').order('team');
    if (!rows) { setPresetMembers([]); return; }
    const staffIds = [...new Set(rows.map((r: PresetMember) => r.staff_id))];
    if (staffIds.length === 0) { setPresetMembers([]); return; }
    const { data: techs } = await supabase.from('technicians').select('id,staff_id,first_name,last_name,role').in('staff_id', staffIds);
    const techMap: Record<string, Technician> = {};
    (techs || []).forEach((t: Technician) => { techMap[t.staff_id] = t; });
    setPresetMembers(rows.map((r: PresetMember) => ({ ...r, technician: techMap[r.staff_id] })));
  };

  const loadDailyMembers = async () => {
    const { data: rows } = await supabase.from('daily_team_member_assignments').select('*').eq('assignment_date', selectedDate);
    if (!rows || rows.length === 0) { setDailyMembers([]); return; }
    const staffIds = [...new Set(rows.map((r: DailyMember) => r.staff_id))];
    const { data: techs } = await supabase.from('technicians').select('id,staff_id,first_name,last_name,role').in('staff_id', staffIds);
    const techMap: Record<string, Technician> = {};
    (techs || []).forEach((t: Technician) => { techMap[t.staff_id] = t; });
    setDailyMembers(rows.map((r: DailyMember) => ({ ...r, technician: techMap[r.staff_id] })));
  };

  const loadAssignments = async () => {
    const { data: rows, error } = await supabase
      .from('team_daily_assignments').select('*')
      .eq('assignment_date', selectedDate).order('team').order('sort_order');
    if (error) { toast.error('Failed to load assignments'); return; }
    if (!rows || rows.length === 0) { setAssignments([]); return; }
    const emails = [...new Set(rows.map((r: Assignment) => r.client_email))];
    const { data: clients } = await supabase.from('clients')
      .select('id,first_name,last_name,email,phone,address,city,zip,pool_type,pool_cover,pool_opening,pool_closing,pool_maintenance,backyard_access_approval,pool_opening_confirmed,pool_closing_confirmed,pool_opening_add_on,pool_closing_add_ons,pool_size')
      .in('email', emails);
    const clientMap: Record<string, Client> = {};
    (clients || []).forEach((c: Client) => { clientMap[c.email] = c; });
    setAssignments(rows.map((r: Assignment) => ({ ...r, client: clientMap[r.client_email] })));
  };

  const addClient = async (team: Team, client: Client, serviceType: string = '') => {
    if (!isAdmin) return;

    const cleanEmail = client.email.toLowerCase().trim();

    // Upsert client into DB in case it came from HubSpot
    if (!client.id) {
      const { error: clientError } = await supabase
        .from('clients')
        .upsert({ ...client, email: cleanEmail }, { onConflict: 'email' });

      if (clientError) {
        toast.error(clientError.message || 'Failed to save client');
        return;
      }
    }

    if (assignments.find(a => a.team === team && a.client_email.toLowerCase() === cleanEmail)) {
      toast.error(`${client.first_name} is already on ${team}`);
      return;
    }

    const teamItems = assignments.filter(a => a.assignment_date === selectedDate && a.team === team);
    const defaultTitle = `${client.first_name} ${client.last_name}`.trim() || cleanEmail;

    const insertPayload = {
      assignment_date: selectedDate,
      team,
      client_email: cleanEmail,
      sort_order: teamItems.length,
      admin_note: '',
      title: defaultTitle,
      service_type: serviceType,
      display_address: [client.address, client.city, client.zip].filter(Boolean).join(', '),
      display_phone: client.phone || '',
      display_pool_type: client.pool_type || '',
      display_pool_cover: client.pool_cover || '',
      display_pool_opening: client.pool_opening || '',
      display_pool_closing: client.pool_closing || '',
      display_pool_maintenance: client.pool_maintenance || '',
      display_backyard_access: client.backyard_access_approval || '',
      display_opening_add_ons: client.pool_opening_add_on || '',
      display_closing_add_ons: client.pool_closing_add_ons || '',
      display_pool_size: client.pool_size || '',
      status: 'Assigned',
      assigned_technician_id: null,
      report_completed: false,
      completed: false,
      reschedule_cancel: false,
      created_by: technician.staff_id || technician.id || '',
    };

    const { data, error } = await supabase
      .from('team_daily_assignments')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      toast.error(error.message || 'Failed to add client');
      return;
    }

    setAssignments(prev => [...prev, { ...data, client }]);
    setSearchTarget(null);
    toast.success(`${defaultTitle} added to ${team}${serviceType ? ` · ${serviceType}` : ''}`);
  };

  const removeAssignment = async (id: string) => {
    if (!isAdmin) return;
    await supabase.from('team_daily_assignments').delete().eq('id', id);
    setAssignments(prev => prev.filter(a => a.id !== id));
  };

  const assignToTeam = async (id: string, team: Team) => {
    if (!canManageSchedule) return;

    const asgn = assignments.find(a => a.id === id);
    if (!asgn) return;

    const teamItems = assignments.filter(a => a.assignment_date === selectedDate && a.team === team && a.id !== id);
    const sortOrder = teamItems.length;

    const { data, error } = await supabase
      .from('team_daily_assignments')
      .update({
        team,
        status: 'Assigned',
        assigned_technician_id: null,
        sort_order: sortOrder,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast.error(error.message || 'Failed to assign');
      return;
    }

    setAssignments(prev => prev.map(a => a.id === id ? { ...a, ...data, client: a.client } : a));
    toast.success(`Job assigned to ${team}`);
  };

  const moveAssignment = async (assignment: Assignment, newDate?: string, newTeam?: Team) => {
    if (!canManageSchedule) return;

    const targetDate = newDate ?? assignment.assignment_date;
    const targetTeam = newTeam ?? assignment.team;

    if (!targetTeam) {
      toast.error('Pick a team first');
      return;
    }

    if (targetDate === assignment.assignment_date && targetTeam === assignment.team) return;

    const alreadyExists = await supabase
      .from('team_daily_assignments')
      .select('id')
      .eq('assignment_date', targetDate)
      .eq('team', targetTeam)
      .eq('client_email', assignment.client_email)
      .neq('id', assignment.id)
      .maybeSingle();

    if (alreadyExists.data) {
      toast.error(`Already on ${targetTeam} for ${formatDateDisplay(targetDate)}`);
      return;
    }

    const countResult = await supabase
      .from('team_daily_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('assignment_date', targetDate)
      .eq('team', targetTeam)
      .neq('id', assignment.id);

    const sortOrder = countResult.count ?? 0;

    const { data, error } = await supabase
      .from('team_daily_assignments')
      .update({
        assignment_date: targetDate,
        team: targetTeam,
        status: 'Assigned',
        assigned_technician_id: null,
        sort_order: sortOrder,
      })
      .eq('id', assignment.id)
      .select()
      .single();

    if (error) {
      toast.error(error.message || 'Failed to move job');
      return;
    }

    if (targetDate === selectedDate) {
      setAssignments(prev => prev.map(a => a.id === assignment.id ? { ...a, ...data, client: assignment.client } : a));
    } else {
      setAssignments(prev => prev.filter(a => a.id !== assignment.id));
    }

    toast.success(`Moved to ${targetTeam} on ${formatDateDisplay(targetDate)}`);
  };

  const updateAssignment = async (id: string, fields: Partial<Assignment>) => {
    const updatePayload: Record<string, unknown> = {};
    const allowed = [
      'title',
      'service_type',
      'admin_note',
      'display_pool_type',
      'display_address',
      'display_phone',
      'display_pool_cover',
      'display_pool_opening',
      'display_pool_closing',
      'display_pool_maintenance',
      'display_backyard_access',
      'display_opening_add_ons',
      'display_closing_add_ons',
      'display_pool_size',
      'completed',
      'reschedule_cancel',
      'report_completed',
      'linked_report_id',
    ];

    if (!isAdmin && !('sort_order' in fields)) return;

    for (const key of allowed) {
      if (key in fields) updatePayload[key] = (fields as Record<string, unknown>)[key];
    }

    if ('sort_order' in fields) {
      if (!canManageSchedule) return;

      const asgn = assignments.find(a => a.id === id);
      if (!asgn || !asgn.team) return;

      const teamItems = assignments
        .filter(a => a.team === asgn.team && a.assignment_date === asgn.assignment_date)
        .sort((a, b) => a.sort_order - b.sort_order);

      const cur = teamItems.findIndex(a => a.id === id);
      const tgt = fields.sort_order as number;

      if (cur < 0 || tgt < 0 || tgt >= teamItems.length) return;

      const reordered = [...teamItems];
      const [moved] = reordered.splice(cur, 1);
      reordered.splice(tgt, 0, moved);

      const updated = reordered.map((item, idx) => ({
        ...item,
        sort_order: idx,
        status: 'Assigned',
      }));

      setAssignments(prev => [
        ...prev.filter(a => !(a.team === asgn.team && a.assignment_date === asgn.assignment_date)),
        ...updated,
      ]);

      const results = await Promise.all(
        updated.map(item =>
          supabase
            .from('team_daily_assignments')
            .update({
              sort_order: item.sort_order,
              status: 'Assigned',
            })
            .eq('id', item.id)
        )
      );

      if (results.some(r => r.error)) {
        toast.error('Failed to reorder route');
        loadAssignments();
      }

      return;
    }

    if (Object.keys(updatePayload).length === 0) return;

    const { error } = await supabase
      .from('team_daily_assignments')
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      toast.error(error.message || 'Update failed');
      return;
    }

    setAssignments(prev => prev.map(a => a.id === id ? { ...a, ...fields } : a));
  };

  // Daily override members
  const addDailyMember = async (team: Team, tech: Technician) => {
    if (!isAdmin) return;
    const { error } = await supabase.from('daily_team_member_assignments').insert({ assignment_date: selectedDate, team, staff_id: tech.staff_id });
    if (error) { toast.error('Already on this team today'); return; }
    setDailyMembers(prev => [...prev, { id: '', assignment_date: selectedDate, team, staff_id: tech.staff_id, technician: tech }]);
    setAddDailyTarget(null);
  };
  const removeDailyMember = async (staffId: string, team: Team) => {
    if (!isAdmin) return;
    await supabase.from('daily_team_member_assignments').delete().eq('assignment_date', selectedDate).eq('team', team).eq('staff_id', staffId);
    setDailyMembers(prev => prev.filter(m => !(m.staff_id === staffId && m.team === team && m.assignment_date === selectedDate)));
  };

  // Effective members: preset (minus today's exclusions) + daily additions
  const getEffectiveMembers = (team: Team) => {
    const excludedIds = new Set(exclusions.filter(e => e.team === team).map(e => e.staff_id));
    const preset = presetMembers.filter(m => m.team === team && !excludedIds.has(m.staff_id));
    const daily = dailyMembers.filter(m => m.team === team);
    const presetIds = new Set(preset.map(m => m.staff_id));
    const extras = daily.filter(m => !presetIds.has(m.staff_id));
    return [...preset, ...extras];
  };

  const getUnallocatedAssignments = () =>
    assignments
      .filter(a => !a.team)
      .sort((a, b) => a.sort_order - b.sort_order);

  const getTeamAssignments = (team: Team) =>
    assignments
      .filter(a => a.team === team)
      .sort((a, b) => a.sort_order - b.sort_order);

  const changeDate = (delta: number) => setSelectedDate(d => addDays(d, delta));

  const backPath = isAdmin ? '/admin' : isAssistant ? '/my-route' : '/dashboard';

  return (
    <div className="page-shell">
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="flex items-center h-14 gap-3">
            <button onClick={() => navigate(backPath)} className="flex items-center text-neutral-600 hover:text-neutral-900 transition-colors shrink-0">
              <ArrowLeft className="w-5 h-5" /> <span className="hidden sm:inline ml-1">Back</span>
            </button>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Users className="w-5 h-5 text-brand-600 shrink-0" />
              <span className="text-base sm:text-lg font-semibold text-neutral-900 truncate">Daily Team Assignments</span>
            </div>
            <button
              onClick={() => setShowHistorySearch(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 shadow-sm transition-colors"
              title="Search client history"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Search</span>
            </button>
            <button
              onClick={loadAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 shadow-sm transition-colors"
              title="Refresh assignments"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Date nav */}
        <div className="flex items-center gap-2 mb-5">
          <button onClick={() => changeDate(-1)} className="p-2 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 shadow-sm" title="Previous day">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 flex-1 sm:flex-none" />
            <span className="hidden sm:inline text-sm text-neutral-500">{formatDateDisplay(selectedDate)}</span>
            <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="px-3 py-2 text-xs sm:text-sm rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 shadow-sm whitespace-nowrap">
              Today
            </button>
          </div>
          <button onClick={() => changeDate(1)} className="p-2 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 shadow-sm" title="Next day">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-neutral-400">Loading...</div>
        ) : isAssistant && !myTeam ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
            <Users className="w-12 h-12 mb-3 opacity-40" />
            <span className="text-base font-medium text-neutral-500">You are not assigned to a team today</span>
            <span className="text-sm mt-1">Contact an admin to be added to a team</span>
          </div>
        ) : (
          <>
          {/* ── Unallocated Jobs ── */}
          {isAdmin && (() => {
            const unallocated = getUnallocatedAssignments();
            if (unallocated.length === 0 && !isAdmin) return null;
            return (
              <div className="mb-5 rounded-xl border-2 border-amber-300 overflow-hidden shadow-sm bg-amber-50">
                <div className="bg-amber-500 px-3 sm:px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-white" />
                    <span className="text-white font-bold text-sm tracking-wide">Unallocated Jobs</span>
                    <span className="bg-white/25 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unallocated.length}</span>
                  </div>
                  <span className="text-amber-100 text-xs font-medium hidden sm:inline">Needs team assignment</span>
                </div>
                <div className="p-2 sm:p-3 space-y-2 min-h-[60px]">
                  {unallocated.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-5 text-amber-400">
                      <span className="text-xs">No unallocated jobs</span>
                    </div>
                  ) : (
                    unallocated.map((a) => {
                      const c = a.client;
                      const displayTitle = a.title || (c ? `${c.first_name} ${c.last_name}` : a.client_email);
                      const displayAddress = a.display_address || (c ? `${c.address}${c.city ? ', ' + c.city : ''}` : '');
                      const phone = a.display_phone || c?.phone || '';
                      const poolType = a.display_pool_type || c?.pool_type || '';
                      const poolCover = a.display_pool_cover || c?.pool_cover || '';
                      const poolOpening = a.display_pool_opening || c?.pool_opening || '';
                      const poolClosing = a.display_pool_closing || c?.pool_closing || '';
                      const poolMaintenance = a.display_pool_maintenance || c?.pool_maintenance || '';
                      const backyardAccess = a.display_backyard_access || c?.backyard_access_approval || '';
                      const openingAddOns = a.display_opening_add_ons || c?.pool_opening_add_on || '';
                      const closingAddOns = a.display_closing_add_ons || c?.pool_closing_add_ons || '';
                      const poolSize = a.display_pool_size || c?.pool_size || '';
                      const isCementPool = poolType ? /cement|concrete|gunite/i.test(poolType) : false;

                      const details = [
                        { label: 'Phone', value: phone },
                        { label: 'Pool Type', value: poolType },
                        { label: 'Pool Size', value: poolSize },
                        { label: 'Pool Cover', value: poolCover },
                        { label: 'Backyard Access', value: backyardAccess },
                        { label: 'Opening Package', value: poolOpening },
                        { label: 'Opening Add-ons', value: openingAddOns },
                        { label: 'Closing Package', value: poolClosing },
                        { label: 'Closing Add-ons', value: closingAddOns },
                        { label: 'Maintenance', value: poolMaintenance },
                      ].filter(d => d.value);

                      return (
                        <div key={a.id} id={`assignment-${a.id}`} className="scroll-mt-24 transition-all duration-300">
                        <UnallocatedCard
                          key={a.id}
                          a={a}
                          displayTitle={displayTitle}
                          displayAddress={displayAddress}
                          isCementPool={isCementPool}
                          details={details}
                          isAdmin={isAdmin}
                          onRemove={() => removeAssignment(a.id)}
                          onAssign={() => setAssignTeamTarget(a.id)}
                          onReport={() => navigate('/submit-report', { state: {
                            assignmentId: a.id,
                            clientEmail: a.client_email,
                            serviceType: a.service_type || '',
                            serviceDate: a.assignment_date,
                          }})}
                        />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })()}

          <div className={`grid gap-4 sm:gap-5 ${visibleTeams.length === 1 ? 'grid-cols-1 max-w-xl mx-auto' : 'grid-cols-1 lg:grid-cols-2'}`}>
            {visibleTeams.map(team => {
              const colors = TEAM_COLORS[team];
              const teamItems = getTeamAssignments(team);
              const effectiveMembers = getEffectiveMembers(team);
              const dailyForTeam = dailyMembers.filter(m => m.team === team);
              const dailyAllStaffIds = dailyForTeam.map(m => m.staff_id);
              const effectiveIds = effectiveMembers.map(m => m.staff_id);

              return (
                <div key={team} className={`rounded-xl border ${colors.border} overflow-hidden shadow-sm`}>
                  {/* Header */}
                  <div className={`${colors.header} px-3 sm:px-4 py-3 flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-sm tracking-wide">{team}</span>
                      <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">{teamItems.length}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isAdmin && (
                        <button onClick={() => setSearchTarget(team)}
                          className="min-h-[38px] flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors">
                          <Plus className="w-3.5 h-3.5" /><span>Add Client</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Today's team members */}
                  <div className={`${colors.light} px-3 sm:px-4 py-2 border-b ${colors.border}`}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mr-0.5">Today's Team:</span>
                      {effectiveMembers.map(m => {
                        const isDaily = dailyAllStaffIds.includes(m.staff_id);
                        const remove = isDaily
                          ? () => removeDailyMember(m.staff_id, team)
                          : () => excludePresetMember(m.staff_id, team);
                        return m.technician ? (
                          <span key={'e-' + m.staff_id + '-' + team} className={`inline-flex items-center gap-1 rounded-full pl-2 pr-1 py-0.5 text-xs font-medium border shadow-sm
                            ${isDaily ? 'bg-yellow-50 border-yellow-300 text-yellow-800' : 'bg-white border-neutral-200 text-neutral-700'}`}>
                            {m.technician.first_name} {m.technician.last_name}
                            {isAdmin && <button onClick={remove} className="text-gray-300 hover:text-red-500 ml-0.5 transition-colors"><X className="w-3 h-3" /></button>}
                          </span>
                        ) : null;
                      })}
                      {isAdmin && (
                        <button onClick={() => setAddDailyTarget(team)} className="inline-flex items-center gap-0.5 text-xs font-medium text-brand-600 hover:text-brand-800 px-1.5 py-0.5 rounded-full hover:bg-brand-50 transition-colors">
                          <UserPlus className="w-3 h-3" /> Add today
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Daily team note */}
                  {(dailyNotes[team]?.note || isAdmin) && (
                    <div className={`px-3 sm:px-4 py-2.5 border-b ${colors.border} ${colors.bg}`}>
                      {editingNoteTeam === team ? (
                        <div className="space-y-2">
                          <textarea
                            value={noteDraft}
                            onChange={e => setNoteDraft(e.target.value)}
                            rows={3}
                            autoFocus
                            placeholder="Write a note for the whole team today..."
                            className="w-full text-sm rounded-lg border border-neutral-300 p-2.5 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveDailyNote(team, noteDraft)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-700">
                              <Check className="w-3.5 h-3.5" /> Save note
                            </button>
                            <button
                              onClick={() => setEditingNoteTeam(null)}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-300 text-neutral-600 hover:bg-neutral-50">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : dailyNotes[team]?.note ? (
                        <div className="flex items-start gap-2">
                          <StickyNote className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-sm text-neutral-700 flex-1 whitespace-pre-wrap">{dailyNotes[team].note}</p>
                          {isAdmin && (
                            <button
                              onClick={() => { setNoteDraft(dailyNotes[team].note); setEditingNoteTeam(team); }}
                              className="text-neutral-400 hover:text-neutral-600 shrink-0 p-0.5">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ) : isAdmin ? (
                        <button
                          onClick={() => { setNoteDraft(''); setEditingNoteTeam(team); }}
                          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-600 transition-colors">
                          <StickyNote className="w-3.5 h-3.5" /> Add a team note for today...
                        </button>
                      ) : null}
                    </div>
                  )}

                  {/* Client list */}
                  <div className={`${colors.bg} p-2 sm:p-3 space-y-2 min-h-[80px]`}>
                    {teamItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-6 text-neutral-400">
                        <Users className="w-7 h-7 mb-2 opacity-40" />
                        <span className="text-xs">No clients assigned</span>
                        {isAdmin && <button onClick={() => setSearchTarget(team)} className="mt-2 text-xs text-brand-600 hover:text-brand-800 font-medium">+ Add first client</button>}
                      </div>
                    ) : (
                      teamItems.map((a, idx) => (
                        <div key={a.id} id={`assignment-${a.id}`} className="scroll-mt-24 transition-all duration-300">
                          <AssignmentCard assignment={a} index={idx} total={teamItems.length}
                            onDelete={() => removeAssignment(a.id)}
                            onUpdate={fields => updateAssignment(a.id, fields)}
                            onChangeDate={canManageSchedule ? (newDate) => moveAssignment(a, newDate, undefined) : undefined}
                            onChangeTeam={canManageSchedule ? (newTeam) => moveAssignment(a, undefined, newTeam) : undefined}
                            isAdmin={isAdmin}
                            isSenior={isSenior}
                            onNavigate={(path, state) => navigate(path, { state })} />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </main>

      {/* Assign Team Modal */}
      {assignTeamTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setAssignTeamTarget(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-neutral-900">Assign to Team</h3>
              <button onClick={() => setAssignTeamTarget(null)} className="text-neutral-400 hover:text-neutral-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-col gap-2">
              {TEAMS.map(t => (
                <button key={t} onClick={() => { assignToTeam(assignTeamTarget, t); setAssignTeamTarget(null); }}
                  className={`w-full text-left px-4 py-3 text-sm font-semibold rounded-lg border transition-colors
                    ${TEAM_COLORS[t].bg} ${TEAM_COLORS[t].border} ${TEAM_COLORS[t].text} hover:opacity-80`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {searchTarget && (
        <ClientSearchModal
          onSelect={(c, st) => addClient(searchTarget, c, st)}
          onClose={() => setSearchTarget(null)}
          supabaseUrl={supabaseUrl}
          supabaseKey={supabaseKey}
        />
      )}

      {addDailyTarget && (
        <AddDailyMemberModal
          team={addDailyTarget}
          date={selectedDate}
          technicians={technicians}
          existingStaffIds={dailyMembers.filter(m => m.team === addDailyTarget).map(m => m.staff_id)}
          onAdd={tech => addDailyMember(addDailyTarget, tech)}
          onClose={() => setAddDailyTarget(null)}
        />
      )}

      {showHistorySearch && (
        <ClientHistorySearch onClose={() => setShowHistorySearch(false)} />
      )}

    </div>
  );
}
