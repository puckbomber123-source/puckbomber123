import React, { useEffect, useState, useCallback } from 'react';
import { Package, TrendingUp, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ReportRow {
  id: string;
  lead_technician: string;
  service_date: string;
  closing_add_ons: string[] | null;
  gizmo_qty: number | null;
  return_plug_qty: number | null;
  yellow_cover_picks_qty: number | null;
}

interface TechStats {
  name: string;
  reportCount: number;
  addonCounts: Record<string, number>;
  totalAddons: number;
  reports: ReportRow[];
}

const ADDON_ORDER = [
  'Gizmo',
  'Return Plug',
  'Yellow Cover Picks',
  'Cover Installation',
  'Elastic Cover Installation',
  'Salt Cell Cleaning',
  'Pools Over 512 sq ft (16\u2032 x 32\u2032)',
  'Pools Over 650 sq ft (18\u2032 x 36\u2032 or larger)',
];

function addonSortKey(a: string) {
  const idx = ADDON_ORDER.indexOf(a);
  return idx === -1 ? 999 : idx;
}

export default function ClosingAddonTracker() {
  const [stats, setStats] = useState<TechStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_reports')
        .select('id,lead_technician,service_date,closing_add_ons,gizmo_qty,return_plug_qty,yellow_cover_picks_qty')
        .ilike('service_type', '%closing%')
        .not('lead_technician', 'is', null)
        .order('service_date', { ascending: false });
      if (error) throw error;

      const rows = (data || []) as ReportRow[];
      const byTech: Record<string, TechStats> = {};

      for (const r of rows) {
        const name = (r.lead_technician || '').trim();
        if (!name) continue;
        if (!byTech[name]) {
          byTech[name] = { name, reportCount: 0, addonCounts: {}, totalAddons: 0, reports: [] };
        }
        const t = byTech[name];
        t.reportCount++;
        t.reports.push(r);

        const addons = r.closing_add_ons || [];
        for (const a of addons) {
          t.addonCounts[a] = (t.addonCounts[a] || 0) + 1;
          t.totalAddons++;
        }

        if (r.gizmo_qty != null && r.gizmo_qty > 0) {
          t.addonCounts['Gizmo'] = (t.addonCounts['Gizmo'] || 0) + r.gizmo_qty;
        }
        if (r.return_plug_qty != null && r.return_plug_qty > 0) {
          t.addonCounts['Return Plug'] = (t.addonCounts['Return Plug'] || 0) + r.return_plug_qty;
        }
        if (r.yellow_cover_picks_qty != null && r.yellow_cover_picks_qty > 0) {
          t.addonCounts['Yellow Cover Picks'] = (t.addonCounts['Yellow Cover Picks'] || 0) + r.yellow_cover_picks_qty;
        }
      }

      const arr = Object.values(byTech).sort((a, b) => b.totalAddons - a.totalAddons);
      setStats(arr);
    } catch {
      setStats([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-neutral-400 gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading closing add-on tracker…</span>
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="card card-body text-center py-6">
        <Package className="w-6 h-6 text-neutral-300 mx-auto mb-2" />
        <p className="text-sm text-neutral-500">No pool closing reports with add-ons yet.</p>
      </div>
    );
  }

  const allAddons = Array.from(
    new Set(stats.flatMap(t => Object.keys(t.addonCounts)))
  ).sort((a, b) => addonSortKey(a) - addonSortKey(b));

  return (
    <div className="space-y-3">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card card-body !p-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-1.5 text-brand-600 bg-brand-50">
            <Package className="w-4 h-4" />
          </div>
          <p className="text-lg font-bold text-neutral-900">
            {stats.reduce((s, t) => s + t.totalAddons, 0)}
          </p>
          <p className="text-[11px] text-neutral-500">Total Add-ons</p>
        </div>
        <div className="card card-body !p-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-1.5 text-teal-600 bg-teal-50">
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-lg font-bold text-neutral-900">
            {stats.reduce((s, t) => s + t.reportCount, 0)}
          </p>
          <p className="text-[11px] text-neutral-500">Closing Reports</p>
        </div>
        <div className="card card-body !p-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-1.5 text-amber-600 bg-amber-50">
            <Package className="w-4 h-4" />
          </div>
          <p className="text-lg font-bold text-neutral-900">{allAddons.length}</p>
          <p className="text-[11px] text-neutral-500">Add-on Types</p>
        </div>
        <div className="card card-body !p-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-1.5 text-blue-600 bg-blue-50">
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-lg font-bold text-neutral-900">{stats.length}</p>
          <p className="text-[11px] text-neutral-500">Technicians</p>
        </div>
      </div>

      {/* Per-technician breakdown */}
      <div className="space-y-2">
        {stats.map((tech, idx) => {
          const isOpen = expanded === tech.name;
          const sortedAddons = Object.entries(tech.addonCounts).sort(
            (a, b) => addonSortKey(a[0]) - addonSortKey(b[0])
          );
          return (
            <div key={tech.name} className="card overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : tech.name)}
                className="w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-neutral-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-brand-100 text-brand-700">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-neutral-800">{tech.name}</span>
                    <span className="badge-teal text-[10px]">{tech.reportCount} report{tech.reportCount !== 1 ? 's' : ''}</span>
                    <span className="badge-yellow text-[10px]">{tech.totalAddons} add-on{tech.totalAddons !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {sortedAddons.slice(0, 5).map(([addon, count]) => (
                      <span key={addon} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-50 border border-neutral-100 text-xs text-neutral-600">
                        {addon}: <strong className="text-neutral-800">{count}</strong>
                      </span>
                    ))}
                    {sortedAddons.length > 5 && (
                      <span className="text-xs text-neutral-400">+{sortedAddons.length - 5} more</span>
                    )}
                  </div>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-neutral-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />}
              </button>

              {isOpen && (
                <div className="border-t border-neutral-100 px-4 py-4 space-y-4">
                  {/* Full add-on breakdown */}
                  <div>
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-wide mb-2">Add-on Breakdown</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {sortedAddons.map(([addon, count]) => (
                        <div key={addon} className="rounded-lg bg-neutral-50 border border-neutral-100 px-3 py-2">
                          <p className="text-xs text-neutral-500">{addon}</p>
                          <p className="text-base font-bold text-neutral-900">{count}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent reports */}
                  <div>
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-wide mb-2">Closing Reports</p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {tech.reports.slice(0, 20).map(r => {
                        const addons = r.closing_add_ons || [];
                        const qtyParts: string[] = [];
                        if (r.gizmo_qty) qtyParts.push(`Gizmo ×${r.gizmo_qty}`);
                        if (r.return_plug_qty) qtyParts.push(`Return Plug ×${r.return_plug_qty}`);
                        if (r.yellow_cover_picks_qty) qtyParts.push(`Yellow Cover Picks ×${r.yellow_cover_picks_qty}`);
                        return (
                          <div key={r.id} className="flex items-center gap-2 bg-white rounded-lg border border-neutral-200 px-3 py-2">
                            <span className="text-xs text-neutral-500 shrink-0">{r.service_date}</span>
                            <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                              {addons.map(a => (
                                <span key={a} className="px-1.5 py-0.5 rounded bg-brand-50 border border-brand-100 text-[10px] text-brand-700 font-medium">{a}</span>
                              ))}
                              {qtyParts.map(q => (
                                <span key={q} className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-100 text-[10px] text-amber-700 font-medium">{q}</span>
                              ))}
                              {addons.length === 0 && qtyParts.length === 0 && (
                                <span className="text-xs text-neutral-400 italic">No add-ons</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {tech.reports.length > 20 && (
                        <p className="text-xs text-neutral-400 text-center pt-1">Showing 20 of {tech.reports.length}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
