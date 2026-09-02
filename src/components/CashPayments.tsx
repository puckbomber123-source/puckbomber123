import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, DollarSign, CheckCircle2, X, RefreshCw,
  Calendar, User, FileText, Check, Waves, ChevronDown, ChevronUp,
  Search, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface CashPayment {
  id: string;
  client_name: string;
  client_email: string | null;
  service_type: string;
  amount_owed: number;
  notes: string | null;
  assignment_date: string | null;
  recorded_by: string | null;
  paid: boolean;
  paid_at: string | null;
  created_at: string;
}

interface ClientResult {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  city: string | null;
}

interface NewPaymentForm {
  client_name: string;
  client_email: string;
  service_type: string;
  amount_owed: string;
  notes: string;
  assignment_date: string;
}

const EMPTY_FORM: NewPaymentForm = {
  client_name: '',
  client_email: '',
  service_type: '',
  amount_owed: '',
  notes: '',
  assignment_date: '',
};

function ClientSearchInline({
  onSelect,
}: {
  onSelect: (name: string, email: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ClientResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      const q = query.trim();
      const { data } = await supabase
        .from('clients')
        .select('id, first_name, last_name, email, city')
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(8);
      setResults(data || []);
      setOpen(true);
      setSearching(false);
    }, 280);
    return () => clearTimeout(timer);
  }, [query]);

  const pick = (c: ClientResult) => {
    onSelect(`${c.first_name} ${c.last_name}`, c.email || '');
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="form-label">Link to Existing Client</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="form-input pl-8"
          placeholder="Search by name or email…"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-neutral-200 rounded-xl shadow-card-md overflow-hidden">
          {results.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => pick(c)}
              className="w-full text-left px-4 py-2.5 hover:bg-brand-50 transition flex items-center gap-3"
            >
              <div className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-bold text-neutral-600 shrink-0">
                {c.first_name[0]}{c.last_name[0]}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-800 truncate">{c.first_name} {c.last_name}</p>
                <p className="text-xs text-neutral-500 truncate">{c.email || 'No email'}{c.city ? ` — ${c.city}` : ''}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {open && results.length === 0 && query.trim() && !searching && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-neutral-200 rounded-xl shadow-card-md px-4 py-3">
          <p className="text-sm text-neutral-500">No clients found.</p>
        </div>
      )}
    </div>
  );
}

export default function CashPayments() {
  const navigate = useNavigate();
  const technician = JSON.parse(sessionStorage.getItem('technician') || '{}');

  const [payments, setPayments] = useState<CashPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<NewPaymentForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterPaid, setFilterPaid] = useState<'unpaid' | 'paid' | 'all'>('unpaid');
  const [search, setSearch] = useState('');

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cash_payments')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error('Failed to load cash payments');
    else setPayments(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const handleSave = async () => {
    if (!form.client_name.trim()) { toast.error('Client name is required'); return; }
    if (!form.service_type.trim()) { toast.error('Service type is required'); return; }
    const amount = parseFloat(form.amount_owed);
    if (isNaN(amount) || amount < 0) { toast.error('Enter a valid amount'); return; }

    setSaving(true);
    const { error } = await supabase.from('cash_payments').insert({
      client_name: form.client_name.trim(),
      client_email: form.client_email.trim() || null,
      service_type: form.service_type.trim(),
      amount_owed: amount,
      notes: form.notes.trim() || null,
      assignment_date: form.assignment_date || null,
      recorded_by: technician.staff_id || technician.id || '',
      paid: false,
    });
    if (error) toast.error('Failed to save');
    else {
      toast.success('Cash payment recorded');
      setForm(EMPTY_FORM);
      setShowAdd(false);
      fetchPayments();
    }
    setSaving(false);
  };

  const markPaid = async (id: string) => {
    const { error } = await supabase
      .from('cash_payments')
      .update({ paid: true, paid_at: new Date().toISOString() })
      .eq('id', id);
    if (error) toast.error('Failed to update');
    else { toast.success('Marked as paid'); fetchPayments(); }
  };

  const markUnpaid = async (id: string) => {
    const { error } = await supabase
      .from('cash_payments')
      .update({ paid: false, paid_at: null })
      .eq('id', id);
    if (error) toast.error('Failed to update');
    else { toast.success('Marked as unpaid'); fetchPayments(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this cash payment record?')) return;
    const { error } = await supabase.from('cash_payments').delete().eq('id', id);
    if (error) toast.error('Failed to delete');
    else { toast.success('Deleted'); fetchPayments(); }
  };

  const filtered = payments.filter(p => {
    if (filterPaid === 'unpaid' && p.paid) return false;
    if (filterPaid === 'paid' && !p.paid) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.client_name.toLowerCase().includes(q)
        || (p.client_email || '').toLowerCase().includes(q)
        || p.service_type.toLowerCase().includes(q);
    }
    return true;
  });

  const totalOwed = payments.filter(p => !p.paid).reduce((s, p) => s + p.amount_owed, 0);
  const totalCollected = payments.filter(p => p.paid).reduce((s, p) => s + p.amount_owed, 0);

  return (
    <div className="page-shell">
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="btn-icon"><ArrowLeft className="w-4 h-4" /></button>
            <div className="navbar-brand"><Waves className="w-5 h-5" /><span>Cash Payments</span></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAdd(s => !s)} className="btn-primary btn-sm">
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
            <button onClick={fetchPayments} className="btn-icon">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-500' : ''}`} />
            </button>
          </div>
        </div>
      </nav>

      <main className="page-content space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-neutral-900">${totalOwed.toFixed(2)}</p>
              <p className="text-xs text-neutral-500">Outstanding</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-neutral-900">${totalCollected.toFixed(2)}</p>
              <p className="text-xs text-neutral-500">Collected</p>
            </div>
          </div>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="card card-body">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-brand-600" /> Record Cash Payment
              </h2>
              <button onClick={() => { setShowAdd(false); setForm(EMPTY_FORM); }} className="btn-icon"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Client search spanning full width */}
              <div className="sm:col-span-2">
                <ClientSearchInline
                  onSelect={(name, email) => setForm(f => ({ ...f, client_name: name, client_email: email }))}
                />
              </div>
              <div>
                <label className="form-label">Client Name <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                  <input
                    type="text"
                    value={form.client_name}
                    onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                    className="form-input pl-8"
                    placeholder="Full name"
                  />
                </div>
              </div>
              <div>
                <label className="form-label">Client Email</label>
                <input
                  type="email"
                  value={form.client_email}
                  onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))}
                  className="form-input"
                  placeholder="optional"
                />
              </div>
              <div>
                <label className="form-label">Service Type <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.service_type}
                  onChange={e => setForm(f => ({ ...f, service_type: e.target.value }))}
                  className="form-input"
                  placeholder="e.g. Pool Opening, Liner Replacement…"
                />
              </div>
              <div>
                <label className="form-label">Amount Owed <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-medium">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount_owed}
                    onChange={e => setForm(f => ({ ...f, amount_owed: e.target.value }))}
                    className="form-input pl-7"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="form-label">Service Date</label>
                <input
                  type="date"
                  value={form.assignment_date}
                  onChange={e => setForm(f => ({ ...f, assignment_date: e.target.value }))}
                  className="form-input"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="form-label">Notes / Services Detail</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="form-textarea"
                  placeholder="Describe the services provided, what client owes, payment terms, etc."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setShowAdd(false); setForm(EMPTY_FORM); }} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : <><Check className="w-3.5 h-3.5" /> Save</>}
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-white rounded-xl border border-neutral-200 p-1 shadow-card">
            {(['unpaid', 'paid', 'all'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilterPaid(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition capitalize ${
                  filterPaid === tab
                    ? tab === 'paid' ? 'bg-green-600 text-white' : tab === 'unpaid' ? 'bg-amber-500 text-white' : 'bg-brand-600 text-white'
                    : 'text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search client or service…"
              className="form-input pl-8 py-2 text-sm"
            />
          </div>
        </div>

        {/* List */}
        {loading && (
          <div className="empty-state">
            <div className="spinner w-8 h-8 mb-3" />
            <p className="empty-state-title">Loading…</p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            <DollarSign className="empty-state-icon" />
            <p className="empty-state-title">No cash payments</p>
            <p className="empty-state-desc">{filterPaid === 'unpaid' ? 'No outstanding payments.' : 'No records match.'}</p>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map(p => {
            const isExpanded = expandedId === p.id;
            return (
              <div key={p.id} className={`card overflow-hidden ${p.paid ? 'opacity-70' : ''}`}>
                <div
                  className="px-4 py-3.5 flex items-start gap-3 cursor-pointer hover:bg-neutral-50 transition"
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${p.paid ? 'bg-green-100' : 'bg-amber-100'}`}>
                    {p.paid
                      ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                      : <DollarSign className="w-4 h-4 text-amber-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-neutral-900">{p.client_name}</p>
                      <p className={`text-base font-bold ${p.paid ? 'text-green-700' : 'text-amber-700'}`}>
                        ${p.amount_owed.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-neutral-500">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />{p.service_type}
                      </span>
                      {p.assignment_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(p.assignment_date + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                      {p.recorded_by && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />{p.recorded_by}
                        </span>
                      )}
                      {p.paid && p.paid_at && (
                        <span className="flex items-center gap-1 text-green-600 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          Paid {new Date(p.paid_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {p.notes && (
                      <p className="mt-1 text-xs text-neutral-400 italic line-clamp-1">"{p.notes}"</p>
                    )}
                  </div>
                  <div className="shrink-0 text-neutral-400">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-neutral-100 px-4 py-4 space-y-3 bg-neutral-50">
                    {p.notes && (
                      <div className="bg-white border border-neutral-200 rounded-xl p-3">
                        <p className="text-xs font-semibold text-neutral-500 mb-1">Services / Notes</p>
                        <p className="text-sm text-neutral-700 whitespace-pre-wrap">{p.notes}</p>
                      </div>
                    )}
                    {p.client_email && (
                      <p className="text-xs text-neutral-500">Email: {p.client_email}</p>
                    )}
                    <p className="text-xs text-neutral-400">Recorded: {new Date(p.created_at).toLocaleString()}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {!p.paid ? (
                        <button onClick={() => markPaid(p.id)} className="btn-sm bg-green-600 hover:bg-green-700 text-white btn">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Mark as Paid
                        </button>
                      ) : (
                        <button onClick={() => markUnpaid(p.id)} className="btn-secondary btn-sm">
                          <X className="w-3.5 h-3.5" /> Mark as Unpaid
                        </button>
                      )}
                      <button onClick={() => handleDelete(p.id)} className="btn-danger btn-sm">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
