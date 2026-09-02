import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, RefreshCw, Calendar, MapPin, Users,
  FileText, CheckCircle2, Clock, XCircle, ChevronDown, ChevronUp,
  History, Waves, Phone, StickyNote, ReceiptText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface Assignment {
  id: string;
  assignment_date: string;
  team: string | null;
  title: string;
  client_email: string;
  service_type: string | null;
  status: string | null;
  admin_note: string | null;
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
  completed: boolean | null;
  report_completed: boolean | null;
  invoice_sent: boolean | null;
  invoice_sent_at: string | null;
  assigned_technician_id: string | null;
  created_from_booking: boolean | null;
  created_at: string;
}

function statusBadge(status: string | null, completed: boolean | null) {
  if (completed) return { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: 'Completed' };
  const s = (status || '').toLowerCase();
  if (s === 'unallocated') return { bg: 'bg-neutral-100', text: 'text-neutral-600', icon: <Clock className="w-3.5 h-3.5" />, label: 'Unallocated' };
  if (s === 'cancelled' || s === 'canceled') return { bg: 'bg-red-100', text: 'text-red-600', icon: <XCircle className="w-3.5 h-3.5" />, label: 'Cancelled' };
  return { bg: 'bg-brand-100', text: 'text-brand-700', icon: <Clock className="w-3.5 h-3.5" />, label: status || 'Scheduled' };
}

function fmt(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-CA', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });
}

function clean(v?: string | null) {
  return v && v.trim() ? v.trim() : null;
}

export default function ClientHistory() {
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Assignment[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(false); // newest first by default
  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setSearched(true);
    setExpandedId(null);

    const lower = trimmed.toLowerCase();

    // Search by email (exact-ish) OR by title/name (ilike)
    const { data, error } = await supabase
      .from('team_daily_assignments')
      .select('id,assignment_date,team,title,client_email,service_type,status,admin_note,display_address,display_phone,display_pool_type,display_pool_cover,display_pool_opening,display_pool_closing,display_pool_maintenance,display_backyard_access,display_opening_add_ons,display_closing_add_ons,completed,report_completed,invoice_sent,invoice_sent_at,assigned_technician_id,created_from_booking,created_at')
      .or(`client_email.ilike.%${lower}%,title.ilike.%${trimmed}%`)
      .order('assignment_date', { ascending: false })
      .limit(200);

    if (error) {
      toast.error('Search failed');
      setResults([]);
    } else {
      setResults(data || []);
    }
    setLoading(false);
  }, []);

  const sorted = [...results].sort((a, b) => {
    const d = a.assignment_date.localeCompare(b.assignment_date);
    return sortAsc ? d : -d;
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') runSearch(query);
  };

  // Group by client name / email for summary
  const clientName = sorted.length > 0 ? sorted[0].title : '';
  const clientEmail = sorted.length > 0 ? sorted[0].client_email : '';
  const completedCount = sorted.filter(a => a.completed || a.report_completed).length;

  return (
    <div className="page-shell">
      {/* Header */}
      <header className="navbar">
        <div className="navbar-inner flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin')}
              className="text-neutral-500 hover:text-neutral-800 transition p-1 rounded-lg hover:bg-neutral-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <History className="w-6 h-6 text-brand-600" />
            <span className="text-lg font-bold text-neutral-900">Client Assignment History</span>
          </div>
        </div>
      </header>

      <div className="page-content space-y-5">

        {/* Search bar */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5">
          <p className="text-sm text-neutral-500 mb-3">Search by client name or email to see every time they appeared in Daily Assignments.</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Client name or email…"
                className="w-full pl-9 pr-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              />
            </div>
            <button
              onClick={() => runSearch(query)}
              disabled={loading || !query.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="py-12 text-center text-neutral-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" /> Searching…
          </div>
        )}

        {/* No results */}
        {!loading && searched && results.length === 0 && (
          <div className="py-16 text-center text-neutral-400">
            <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No assignments found</p>
            <p className="text-sm mt-1">Try a different name or email address.</p>
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <>
            {/* Summary bar */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2">
              <div>
                <p className="text-xs text-neutral-400 font-medium">Client</p>
                <p className="text-sm font-bold text-neutral-900">{clientName}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400 font-medium">Email</p>
                <p className="text-sm text-neutral-700">{clientEmail}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400 font-medium">Total Appearances</p>
                <p className="text-sm font-bold text-neutral-900">{results.length}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400 font-medium">Completed</p>
                <p className="text-sm font-bold text-green-700">{completedCount}</p>
              </div>
              <div className="ml-auto">
                <button
                  onClick={() => setSortAsc(p => !p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  {sortAsc ? 'Oldest first' : 'Newest first'}
                </button>
              </div>
            </div>

            {/* Assignment cards */}
            <div className="space-y-3">
              {sorted.map(a => {
                const sb = statusBadge(a.status, a.completed);
                const isExpanded = expandedId === a.id;

                return (
                  <div key={a.id} className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                    {/* Row */}
                    <div
                      className="px-4 sm:px-5 py-4 flex items-start gap-3 cursor-pointer hover:bg-neutral-50/60 transition"
                      onClick={() => setExpandedId(isExpanded ? null : a.id)}
                    >
                      {/* Date badge */}
                      <div className="shrink-0 w-14 text-center bg-brand-50 border border-brand-100 rounded-xl py-1.5">
                        <p className="text-xs font-medium text-brand-500 leading-none">
                          {new Date(a.assignment_date + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short' }).toUpperCase()}
                        </p>
                        <p className="text-xl font-bold text-brand-700 leading-tight">
                          {new Date(a.assignment_date + 'T00:00:00').getDate()}
                        </p>
                        <p className="text-xs text-brand-400 leading-none">
                          {new Date(a.assignment_date + 'T00:00:00').getFullYear()}
                        </p>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <p className="font-semibold text-neutral-900">{a.service_type || 'Service'}</p>
                            <p className="text-sm text-neutral-500">{fmt(a.assignment_date)}</p>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${sb.bg} ${sb.text}`}>
                            {sb.icon} {sb.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-neutral-500">
                          {a.team && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" /> {a.team}
                            </span>
                          )}
                          {clean(a.display_address) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" /> {a.display_address}
                            </span>
                          )}
                          {a.invoice_sent && (
                            <span className="flex items-center gap-1 text-green-600">
                              <ReceiptText className="w-3.5 h-3.5" /> Invoice sent
                            </span>
                          )}
                          {a.created_from_booking && (
                            <span className="flex items-center gap-1 text-brand-500">
                              <FileText className="w-3.5 h-3.5" /> From booking
                            </span>
                          )}
                        </div>
                        {clean(a.admin_note) && (
                          <p className="mt-1.5 text-xs text-neutral-400 italic truncate">"{a.admin_note}"</p>
                        )}
                      </div>

                      <div className="shrink-0 text-neutral-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-neutral-100 px-5 py-4 space-y-4">
                        {/* Pool info grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <Cell icon={<Waves className="w-3.5 h-3.5" />} label="Pool Type" value={a.display_pool_type} />
                          <Cell icon={<FileText className="w-3.5 h-3.5" />} label="Pool Cover" value={a.display_pool_cover} />
                          <Cell icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Backyard Access" value={a.display_backyard_access} />
                          <Cell icon={<FileText className="w-3.5 h-3.5" />} label="Opening Package" value={a.display_pool_opening} />
                          <Cell icon={<FileText className="w-3.5 h-3.5" />} label="Closing Package" value={a.display_pool_closing} />
                          <Cell icon={<FileText className="w-3.5 h-3.5" />} label="Maintenance" value={a.display_pool_maintenance} />
                          {clean(a.display_opening_add_ons) && (
                            <Cell icon={<FileText className="w-3.5 h-3.5" />} label="Opening Add-ons" value={a.display_opening_add_ons} />
                          )}
                          {clean(a.display_closing_add_ons) && (
                            <Cell icon={<FileText className="w-3.5 h-3.5" />} label="Closing Add-ons" value={a.display_closing_add_ons} />
                          )}
                          <Cell icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={a.display_phone} />
                        </div>

                        {/* Meta row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <MetaCell label="Team" value={a.team || '—'} />
                          <MetaCell label="Technician" value={a.assigned_technician_id || '—'} />
                          <MetaCell label="Report" value={a.report_completed ? 'Submitted' : 'Not submitted'} />
                          <MetaCell label="Invoice" value={a.invoice_sent ? `Sent${a.invoice_sent_at ? ' ' + new Date(a.invoice_sent_at).toLocaleDateString() : ''}` : 'Not sent'} />
                        </div>

                        {clean(a.admin_note) && (
                          <div className="bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3">
                            <p className="text-xs font-medium text-neutral-400 mb-1 flex items-center gap-1"><StickyNote className="w-3.5 h-3.5" /> Admin Note</p>
                            <p className="text-sm text-neutral-700">{a.admin_note}</p>
                          </div>
                        )}

                        <div className="pt-1">
                          <button
                            onClick={() => navigate(`/team-assignments?date=${a.assignment_date}`)}
                            className="flex items-center gap-2 px-4 py-2 bg-neutral-50 text-neutral-700 border border-neutral-200 rounded-lg text-sm font-medium hover:bg-neutral-100 transition"
                          >
                            <Calendar className="w-4 h-4" /> Open in Daily Assignments
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Prompt state */}
        {!searched && !loading && (
          <div className="py-20 text-center text-neutral-400">
            <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-neutral-500">Enter a client name or email above</p>
            <p className="text-sm mt-1">Every daily assignment for that client will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Cell({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  const v = value && value.trim() ? value.trim() : null;
  if (!v) return null;
  return (
    <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-3">
      <p className="text-xs font-medium text-neutral-400 mb-0.5 flex items-center gap-1">{icon} {label}</p>
      <p className="text-sm text-neutral-800 break-words">{v}</p>
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-neutral-400 mb-0.5">{label}</p>
      <p className="text-sm text-neutral-700">{value}</p>
    </div>
  );
}
