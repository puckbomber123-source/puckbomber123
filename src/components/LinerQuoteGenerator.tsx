import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, User, X, Loader2, FileText, Download, Mail, CheckCircle,
  AlertTriangle, Calculator, Sparkles, Waves,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

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
}

interface N8nResult {
  springEstimateNumber?: string;
  springEstimateTotal?: number;
  summerEstimateNumber?: string;
  summerEstimateTotal?: number;
  springPdfUrl?: string;
  summerPdfUrl?: string;
  emailDraftUrl?: string;
  error?: string;
}

const DEFAULT_SPRING_LINER_PRICE = 6.5;
const DEFAULT_SUMMER_LINER_PRICE = 5.8;

function getReplacementDefaults(sqft: number): { spring: number; summer: number } {
  if (sqft <= 392) return { summer: 1149, spring: 1249 };
  if (sqft <= 450) return { summer: 1149, spring: 1249 };
  if (sqft <= 512) return { summer: 1249, spring: 1349 };
  if (sqft <= 544) return { summer: 1249, spring: 1349 };
  if (sqft <= 648) return { summer: 1249, spring: 1449 };
  return { summer: 1399, spring: 1549 };
}

export default function LinerQuoteGenerator() {
  // ── Client search ──
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Client[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || trimmed.length < 2) { setResults([]); setShowDropdown(false); return; }
    setSearching(true);
    const { data } = await supabase.rpc('search_clients', { query: trimmed, max_results: 10 });
    setResults((data as Client[]) || []);
    setShowDropdown(true);
    setSearching(false);
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => doSearch(query), 200);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query, doSearch]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectClient = (c: Client) => {
    setSelectedClient(c);
    setShowDropdown(false);
    setQuery(`${c.first_name} ${c.last_name}`);
  };

  const clearClient = () => {
    setSelectedClient(null);
    setQuery('');
    setResults([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // ── Form state ──
  const [width, setWidth] = useState<string>('');
  const [length, setLength] = useState<string>('');
  const [language, setLanguage] = useState<'en' | 'fr'>('en');
  const [springLinerPrice, setSpringLinerPrice] = useState<string>(String(DEFAULT_SPRING_LINER_PRICE));
  const [summerLinerPrice, setSummerLinerPrice] = useState<string>(String(DEFAULT_SUMMER_LINER_PRICE));
  const [springReplacementPrice, setSpringReplacementPrice] = useState<string>('');
  const [summerReplacementPrice, setSummerReplacementPrice] = useState<string>('');
  const [includeDrainClean, setIncludeDrainClean] = useState(false);

  // ── Derived square footage ──
  const sqft = useMemo(() => {
    const w = parseFloat(width) || 0;
    const l = parseFloat(length) || 0;
    return Math.round(w * l * 100) / 100;
  }, [width, length]);

  // ── Auto-update replacement prices when dimensions change ──
  const userOverrideRef = useRef<{ spring: boolean; summer: boolean }>({ spring: false, summer: false });

  useEffect(() => {
    if (sqft <= 0) return;
    const defaults = getReplacementDefaults(sqft);
    if (!userOverrideRef.current.spring) setSpringReplacementPrice(String(defaults.spring));
    if (!userOverrideRef.current.summer) setSummerReplacementPrice(String(defaults.summer));
  }, [sqft]);

  const handleSpringReplacementChange = (v: string) => {
    userOverrideRef.current.spring = true;
    setSpringReplacementPrice(v);
  };
  const handleSummerReplacementChange = (v: string) => {
    userOverrideRef.current.summer = true;
    setSummerReplacementPrice(v);
  };

  // ── Submission ──
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<N8nResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canSubmit = !!selectedClient && sqft > 0 && !submitting;

  const handleGenerate = async () => {
    if (!selectedClient || sqft <= 0) return;
    setSubmitting(true);
    setErrorMsg(null);
    setResult(null);

    const springRep = parseFloat(springReplacementPrice) || 0;
    const summerRep = parseFloat(summerReplacementPrice) || 0;
    const springLiner = parseFloat(springLinerPrice) || 0;
    const summerLiner = parseFloat(summerLinerPrice) || 0;

    const payload = {
      clientId: selectedClient.id || '',
      clientName: `${selectedClient.first_name} ${selectedClient.last_name}`.trim(),
      clientEmail: selectedClient.email,
      width: parseFloat(width) || 0,
      length: parseFloat(length) || 0,
      squareFootage: sqft,
      language,
      spring: {
        linerPricePerSquareFoot: springLiner,
        replacementPrice: springRep,
        drainAndCleanPrice: includeDrainClean ? 699 : 0,
      },
      summer: {
        linerPricePerSquareFoot: summerLiner,
        replacementPrice: summerRep,
        drainAndCleanPrice: includeDrainClean ? 299 : 0,
      },
      includeDrainAndClean,
    };

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-liner-quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Failed to send to n8n (${res.status})`);
      }

      setResult({} as N8nResult);
      toast.success('Estimate request sent to n8n');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send estimate request';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setResult(null);
    setErrorMsg(null);
  };

  return (
    <div className="space-y-4">
      {/* ── Client selector ── */}
      <div>
        <label className="form-label">Client</label>
        <div className="relative" ref={dropdownRef}>
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setSelectedClient(null); }}
              onFocus={() => results.length > 0 && setShowDropdown(true)}
              placeholder="Search by name, email, phone, or address…"
              className="form-input pl-11 pr-10 py-2.5"
            />
            <div className="absolute right-3 flex items-center gap-1">
              {searching && <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />}
              {query && <button onClick={clearClient} className="btn-icon p-1"><X className="w-4 h-4" /></button>}
            </div>
          </div>

          {showDropdown && results.length > 0 && !selectedClient && (
            <div className="absolute z-20 w-full mt-1.5 bg-white rounded-xl shadow-card-lg border border-neutral-100 overflow-hidden">
              {results.map(c => (
                <button
                  key={c.email}
                  onClick={() => selectClient(c)}
                  className="w-full text-left px-4 py-3 hover:bg-neutral-50 border-b border-neutral-50 last:border-0 transition-colors flex items-start gap-3 group"
                >
                  <div className="w-8 h-8 rounded-full bg-neutral-100 group-hover:bg-brand-100 flex items-center justify-center shrink-0 transition-colors">
                    <User className="w-4 h-4 text-neutral-400 group-hover:text-brand-500 transition-colors" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-neutral-900">{c.first_name} {c.last_name}</p>
                    <p className="text-xs text-neutral-500 truncate">{c.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Selected client info ── */}
      {selectedClient && (
        <div className="rounded-xl bg-brand-50 border border-brand-100 px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-brand-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-neutral-900">{selectedClient.first_name} {selectedClient.last_name}</p>
            <p className="text-xs text-neutral-500 truncate">{selectedClient.email}</p>
          </div>
        </div>
      )}

      {/* ── Pool dimensions ── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">Pool Width (ft)</label>
          <input
            type="number"
            value={width}
            onChange={e => setWidth(e.target.value)}
            placeholder="0"
            min="0"
            step="0.1"
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label">Pool Length (ft)</label>
          <input
            type="number"
            value={length}
            onChange={e => setLength(e.target.value)}
            placeholder="0"
            min="0"
            step="0.1"
            className="form-input"
          />
        </div>
      </div>

      {/* ── Square footage display ── */}
      <div className="rounded-xl bg-neutral-50 border border-neutral-100 px-4 py-3 flex items-center gap-3">
        <Calculator className="w-4 h-4 text-neutral-400" />
        <span className="text-sm text-neutral-500">Square Footage</span>
        <span className="text-sm font-bold text-neutral-900 ml-auto">{sqft > 0 ? `${sqft} sq. ft.` : '—'}</span>
      </div>

      {/* ── Language selector ── */}
      <div>
        <label className="form-label">Language</label>
        <div className="flex gap-2">
          <button
            onClick={() => setLanguage('en')}
            className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
              language === 'en'
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLanguage('fr')}
            className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
              language === 'fr'
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50'
            }`}
          >
            Français
          </button>
        </div>
      </div>

      {/* ── Liner prices ── */}
      <div>
        <p className="section-title">Liner Price per Sq. Ft.</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">Spring ($/sq.ft)</label>
            <input
              type="number"
              value={springLinerPrice}
              onChange={e => setSpringLinerPrice(e.target.value)}
              min="0"
              step="0.01"
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Summer ($/sq.ft)</label>
            <input
              type="number"
              value={summerLinerPrice}
              onChange={e => setSummerLinerPrice(e.target.value)}
              min="0"
              step="0.01"
              className="form-input"
            />
          </div>
        </div>
      </div>

      {/* ── Replacement prices ── */}
      <div>
        <p className="section-title">Replacement / Installation Price</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">Spring ($)</label>
            <input
              type="number"
              value={springReplacementPrice}
              onChange={e => handleSpringReplacementChange(e.target.value)}
              placeholder="Auto-calculated"
              min="0"
              step="1"
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Summer ($)</label>
            <input
              type="number"
              value={summerReplacementPrice}
              onChange={e => handleSummerReplacementChange(e.target.value)}
              placeholder="Auto-calculated"
              min="0"
              step="1"
              className="form-input"
            />
          </div>
        </div>
        <p className="form-hint">Prices auto-fill based on square footage. Edit to override.</p>
      </div>

      {/* ── Drain & Clean ── */}
      <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-neutral-200 px-4 py-3 hover:bg-neutral-50 transition-colors">
        <input
          type="checkbox"
          checked={includeDrainClean}
          onChange={e => setIncludeDrainClean(e.target.checked)}
          className="w-4 h-4 accent-brand-600"
        />
        <div className="flex-1">
          <span className="text-sm font-medium text-neutral-700">Add Drain & Clean</span>
          <p className="text-xs text-neutral-500 mt-0.5">Spring: $699 · Summer: $299</p>
        </div>
      </label>

      {/* ── Generate button ── */}
      <button
        onClick={handleGenerate}
        disabled={!canSubmit}
        className="btn-primary w-full"
      >
        {submitting ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Generating Estimates…</>
        ) : (
          <><Sparkles className="w-4 h-4" /> Generate Estimates</>
        )}
      </button>

      {/* ── Error state ── */}
      {errorMsg && !submitting && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700">Estimate generation failed</p>
              <p className="text-xs text-red-600 mt-1">{errorMsg}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Success results ── */}
      {result && !submitting && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-4 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm font-semibold text-green-800">Estimate Request Sent</p>
          </div>

          <div className="rounded-lg bg-white border border-green-100 px-4 py-3">
            <p className="text-xs text-neutral-400">Client</p>
            <p className="text-sm font-semibold text-neutral-900">{selectedClient?.first_name} {selectedClient?.last_name}</p>
            <p className="text-xs text-neutral-500 mt-2">Square Footage</p>
            <p className="text-sm font-semibold text-neutral-900">{sqft} sq. ft.</p>
          </div>

          {(result.springEstimateNumber || result.springEstimateTotal != null || result.springPdfUrl) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Spring estimate */}
              <div className="rounded-lg bg-white border border-neutral-200 px-4 py-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Waves className="w-3.5 h-3.5 text-brand-500" />
                  <p className="text-xs font-bold uppercase tracking-wide text-brand-600">Spring Estimate</p>
                </div>
                {result.springEstimateNumber && (
                  <p className="text-xs text-neutral-500">Estimate #{result.springEstimateNumber}</p>
                )}
                {result.springEstimateTotal != null && (
                  <p className="text-lg font-bold text-neutral-900">${Number(result.springEstimateTotal).toFixed(2)}</p>
                )}
                {result.springPdfUrl && (
                  <a
                    href={result.springPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary btn-sm w-full mt-1"
                  >
                    <Download className="w-3.5 h-3.5" /> Download PDF
                  </a>
                )}
              </div>

              {/* Summer estimate */}
              <div className="rounded-lg bg-white border border-neutral-200 px-4 py-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Waves className="w-3.5 h-3.5 text-amber-500" />
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-600">Summer Estimate</p>
                </div>
                {result.summerEstimateNumber && (
                  <p className="text-xs text-neutral-500">Estimate #{result.summerEstimateNumber}</p>
                )}
                {result.summerEstimateTotal != null && (
                  <p className="text-lg font-bold text-neutral-900">${Number(result.summerEstimateTotal).toFixed(2)}</p>
                )}
                {result.summerPdfUrl && (
                  <a
                    href={result.summerPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary btn-sm w-full mt-1"
                  >
                    <Download className="w-3.5 h-3.5" /> Download PDF
                  </a>
                )}
              </div>
            </div>
          )}

          {result.emailDraftUrl && (
            <div className="rounded-lg bg-white border border-blue-200 px-4 py-3 flex items-center gap-3">
              <Mail className="w-4 h-4 text-blue-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-700">Email draft created</p>
                <p className="text-xs text-neutral-500">Open the draft to review and send it to the client.</p>
              </div>
              <a
                href={result.emailDraftUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary btn-sm shrink-0"
              >
                <Mail className="w-3.5 h-3.5" /> Open Draft
              </a>
            </div>
          )}

          <p className="text-xs text-neutral-500 text-center">
            The estimate data has been sent to n8n. Check your n8n workflow and QuickBooks for the generated estimates.
          </p>

          <button onClick={resetForm} className="btn-secondary w-full">
            <FileText className="w-4 h-4" /> Generate New Quote
          </button>
        </div>
      )}
    </div>
  );
}
