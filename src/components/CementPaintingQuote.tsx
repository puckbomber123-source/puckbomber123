import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, User, X, Loader2, FileText, CheckCircle,
  AlertTriangle, Calculator, Sparkles, Paintbrush,
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

const EPOXY_PRICE_PER_GALLON = 264.99;
const WATERBASE_PRICE_PER_GALLON = 160;

function getLabourDefault(width: number, length: number): number {
  const w = width || 0;
  const l = length || 0;
  if (w <= 14 && l <= 28) return 699;
  if (w <= 18 && l <= 36) return 799;
  return 899;
}

export default function CementPaintingQuote() {
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
  const [coldQuote, setColdQuote] = useState(false);
  const [includeDrainClean, setIncludeDrainClean] = useState(false);
  const [drainCleanPrice, setDrainCleanPrice] = useState<string>('299');
  const [numGallons, setNumGallons] = useState<string>('');
  const [paintType, setPaintType] = useState<'epoxy' | 'waterbase'>('epoxy');
  const [epoxyPricePerGallon, setEpoxyPricePerGallon] = useState<string>(String(EPOXY_PRICE_PER_GALLON));
  const [waterbasePricePerGallon, setWaterbasePricePerGallon] = useState<string>(String(WATERBASE_PRICE_PER_GALLON));
  const [labourPrice, setLabourPrice] = useState<string>('');

  // ── Derived square footage ──
  const sqft = useMemo(() => {
    const w = parseFloat(width) || 0;
    const l = parseFloat(length) || 0;
    return Math.round(w * l * 100) / 100;
  }, [width, length]);

  // ── Auto-update labour price when dimensions change ──
  const labourOverrideRef = useRef(false);

  useEffect(() => {
    const w = parseFloat(width) || 0;
    const l = parseFloat(length) || 0;
    if (w <= 0 || l <= 0) return;
    if (!labourOverrideRef.current) {
      setLabourPrice(String(getLabourDefault(w, l)));
    }
  }, [width, length]);

  const handleLabourChange = (v: string) => {
    labourOverrideRef.current = true;
    setLabourPrice(v);
  };

  // ── Derived totals ──
  const pricePerGallon = useMemo(() => {
    return paintType === 'epoxy'
      ? parseFloat(epoxyPricePerGallon) || 0
      : parseFloat(waterbasePricePerGallon) || 0;
  }, [paintType, epoxyPricePerGallon, waterbasePricePerGallon]);

  const paintTotal = useMemo(() => {
    const gallons = parseInt(numGallons) || 0;
    return Math.round(gallons * pricePerGallon * 100) / 100;
  }, [numGallons, pricePerGallon]);

  const drainCost = useMemo(() => {
    return includeDrainClean ? (parseFloat(drainCleanPrice) || 0) : 0;
  }, [includeDrainClean, drainCleanPrice]);

  const grandTotal = useMemo(() => {
    const labour = parseFloat(labourPrice) || 0;
    return Math.round((paintTotal + labour + drainCost) * 100) / 100;
  }, [paintTotal, labourPrice, drainCost]);

  // ── Submission ──
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canSubmit = !!selectedClient && sqft > 0 && !submitting;

  const handleGenerate = async () => {
    if (!selectedClient || sqft <= 0) return;
    setSubmitting(true);
    setErrorMsg(null);
    setResult(false);

    const labour = parseFloat(labourPrice) || 0;
    const gallons = parseInt(numGallons) || 0;
    const epoxyPerGal = parseFloat(epoxyPricePerGallon) || 0;
    const waterbasePerGal = parseFloat(waterbasePricePerGallon) || 0;
    const dcPrice = includeDrainClean ? (parseFloat(drainCleanPrice) || 0) : 0;

    try {
      const { error } = await supabase.from('cement_painting_quotes').insert({
        client_id: selectedClient.id || null,
        client_name: `${selectedClient.first_name} ${selectedClient.last_name}`.trim(),
        client_email: selectedClient.email,
        width: parseFloat(width) || 0,
        length: parseFloat(length) || 0,
        square_footage: sqft,
        language,
        cold_quote: coldQuote,
        include_drain_clean: includeDrainClean,
        drain_clean_price: dcPrice,
        num_gallons: gallons,
        epoxy_price_per_gallon: epoxyPerGal,
        waterbase_price_per_gallon: waterbasePerGal,
        paint_type: paintType,
        paint_total: paintTotal,
        labour_price: labour,
        grand_total: grandTotal,
      });

      if (error) throw error;

      setSubmitting(false);
      setResult(true);
      toast.success('Cement painting estimate sent to n8n');
    } catch (err) {
      setSubmitting(false);
      const msg = err instanceof Error ? err.message : 'Failed to send estimate request';
      setErrorMsg(msg);
      toast.error(msg);
    }
  };

  const resetForm = () => {
    setResult(false);
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

      {/* ── Cold Quote ── */}
      <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-neutral-200 px-4 py-3 hover:bg-neutral-50 transition-colors">
        <input
          type="checkbox"
          checked={coldQuote}
          onChange={e => setColdQuote(e.target.checked)}
          className="w-4 h-4 accent-brand-600"
        />
        <div className="flex-1">
          <span className="text-sm font-medium text-neutral-700">Cold Quote</span>
          <p className="text-xs text-neutral-500 mt-0.5">Client has not requested a quote — sending one proactively.</p>
        </div>
      </label>

      {/* ── Paint type ── */}
      <div>
        <p className="section-title">Paint Type</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setPaintType('epoxy')}
            className={`rounded-lg border px-4 py-3 text-sm font-medium transition-all text-left ${
              paintType === 'epoxy'
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50'
            }`}
          >
            <span className="block font-semibold">INSL-X Epoxy</span>
            <span className={`text-xs ${paintType === 'epoxy' ? 'text-brand-100' : 'text-neutral-500'}`}>Epoxy-base pool paint</span>
          </button>
          <button
            onClick={() => setPaintType('waterbase')}
            className={`rounded-lg border px-4 py-3 text-sm font-medium transition-all text-left ${
              paintType === 'waterbase'
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50'
            }`}
          >
            <span className="block font-semibold">INSL-X Water-Base</span>
            <span className={`text-xs ${paintType === 'waterbase' ? 'text-brand-100' : 'text-neutral-500'}`}>Water-base pool paint</span>
          </button>
        </div>
      </div>

      {/* ── Paint price per gallon (editable) ── */}
      <div>
        <label className="form-label">
          {paintType === 'epoxy' ? 'Epoxy Price per Gallon' : 'Water-Base Price per Gallon'} ($/gal)
        </label>
        <input
          type="number"
          value={paintType === 'epoxy' ? epoxyPricePerGallon : waterbasePricePerGallon}
          onChange={e => paintType === 'epoxy' ? setEpoxyPricePerGallon(e.target.value) : setWaterbasePricePerGallon(e.target.value)}
          min="0"
          step="0.01"
          className="form-input"
        />
      </div>

      {/* ── Number of gallons ── */}
      <div>
        <label className="form-label">Number of Gallons</label>
        <input
          type="number"
          value={numGallons}
          onChange={e => setNumGallons(e.target.value)}
          placeholder="0"
          min="0"
          step="1"
          className="form-input"
        />
      </div>

      {/* ── Paint total display ── */}
      <div className="rounded-xl bg-neutral-50 border border-neutral-100 px-4 py-3 flex items-center gap-3">
        <Paintbrush className="w-4 h-4 text-neutral-400" />
        <span className="text-sm text-neutral-500">Paint Total ({numGallons || 0} gal × ${pricePerGallon.toFixed(2)})</span>
        <span className="text-sm font-bold text-neutral-900 ml-auto">${paintTotal.toFixed(2)}</span>
      </div>

      {/* ── Labour price ── */}
      <div>
        <p className="section-title">Pool Painting Labour</p>
        <label className="form-label">Labour Price ($)</label>
        <input
          type="number"
          value={labourPrice}
          onChange={e => handleLabourChange(e.target.value)}
          placeholder="Auto-calculated"
          min="0"
          step="1"
          className="form-input"
        />
        <p className="form-hint">
          Auto-fills based on pool size: 14×28 or smaller $699 · 18×36 or smaller $799 · 20×40 or larger $899. Edit to override.
        </p>
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
          <p className="text-xs text-neutral-500 mt-0.5">Optional — default $299</p>
        </div>
      </label>

      {includeDrainClean && (
        <div>
          <label className="form-label">Drain & Clean Price ($)</label>
          <input
            type="number"
            value={drainCleanPrice}
            onChange={e => setDrainCleanPrice(e.target.value)}
            min="0"
            step="1"
            className="form-input"
          />
        </div>
      )}

      {/* ── Grand total ── */}
      <div className="rounded-xl bg-brand-50 border border-brand-200 px-4 py-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-brand-700">Grand Total</span>
        <span className="text-2xl font-bold text-brand-900">${grandTotal.toFixed(2)}</span>
      </div>

      {/* ── Generate button ── */}
      <button
        onClick={handleGenerate}
        disabled={!canSubmit}
        className="btn-primary w-full"
      >
        {submitting ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Generating Estimate…</>
        ) : (
          <><Sparkles className="w-4 h-4" /> Generate Estimate</>
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
            <p className="text-xs text-neutral-500 mt-2">Pool Size</p>
            <p className="text-sm font-semibold text-neutral-900">{width} × {length} ft ({sqft} sq. ft.)</p>
            <p className="text-xs text-neutral-500 mt-2">Grand Total</p>
            <p className="text-lg font-bold text-neutral-900">${grandTotal.toFixed(2)}</p>
          </div>

          <p className="text-xs text-neutral-500 text-center">
            The estimate data has been sent to n8n. Check your n8n workflow and QuickBooks for the generated estimate.
          </p>

          <button onClick={resetForm} className="btn-secondary w-full">
            <FileText className="w-4 h-4" /> Generate New Quote
          </button>
        </div>
      )}
    </div>
  );
}
