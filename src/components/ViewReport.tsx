import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft, CheckCircle, DollarSign, Clock,
  Image, Loader2, AlertTriangle
} from 'lucide-react';

interface ReportRow {
  id: string;
  client_email: string;
  lead_technician: string;
  service_date: string;
  service_type: string;
  opening_type: string;
  opening_add_ons: string[];
  client_paid_cash: boolean;
  completed_time: string | null;
  time_finished: string | null;
  technician_notes: string;
  pre_start_checklist: string[];
  liner_pull_inspection: boolean;
  checklist_data: Record<string, string[]> | null;
  winter_plug: string[];
  pool_reinstallation: string[];
  pool_light: string[];
  pool_pump: string[];
  valves_plumbing: string[];
  sand_filter: string[];
  cartridge_filter: string[];
  salt_system: string[];
  chlorinator: string[];
  heater: string[];
  above_ground: string[];
  garden_hose: string[];
  cement_pool: string[];
  marketing: string[];
  final_inspection: string[];
  closing_add_ons: string[];
  return_plug_qty: number | null;
  gizmo_qty: number | null;
  yellow_cover_picks_qty: number | null;
  photo_pool_area: string;
  photo_pool_equipment: string;
  photo_extra: string;
  submitted_at: string;
}

interface ClientRow {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  pool_type: string;
}

const SWIM_READY_VIEW_SUBSECTIONS: { key: string; title: string }[] = [
  { key: 'winter_plu', title: '1. Winter Plug Removal' },
  { key: 'pool_reins', title: '2. Pool Reinstallation' },
  { key: 'pool_light', title: '3. Pool Light' },
  { key: 'equip_2nd', title: '4. Equipment Ready for 2nd Visit' },
  { key: 'pool_pump', title: '4. Equipment Ready for 2nd Visit (legacy)' },
  { key: 'garden_hos', title: '5. Garden Hose Refill' },
  { key: 'cement_poo', title: '6. Cement Pool — Acid Wash' },
  { key: 'final_insp', title: '7. Final Inspection' },
];

function Section({ title, children, accent }: { title: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border overflow-hidden mb-4 shadow-sm ${accent ? 'border-amber-300 bg-amber-50' : 'border-neutral-100 bg-white'}`}>
      <div className={`px-5 py-3.5 border-b ${accent ? 'border-amber-200' : 'border-neutral-100'}`}>
        <h3 className={`text-sm font-bold uppercase tracking-wide ${accent ? 'text-amber-800' : 'text-neutral-700'}`}>{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function ChipList({ items }: { items: string[] }) {
  if (!items || items.length === 0) return <p className="text-sm text-neutral-400 italic">None recorded</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(item => (
        <span key={item} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-xs font-medium">
          <CheckCircle className="w-3 h-3 text-brand-500" /> {item}
        </span>
      ))}
    </div>
  );
}

function InfoRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-neutral-50 last:border-0">
      <span className="text-sm text-neutral-400 shrink-0 mr-4">{label}</span>
      <span className={`text-sm font-medium text-right ${valueClass || 'text-neutral-800'}`}>{value || '—'}</span>
    </div>
  );
}

export default function ViewReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const reportId = (location.state as { reportId?: string })?.reportId;

  const [report, setReport] = useState<ReportRow | null>(null);
  const [client, setClient] = useState<ClientRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!reportId) { setError('No report ID provided'); setLoading(false); return; }
    (async () => {
      const { data, error: err } = await supabase
        .from('service_reports')
        .select('*')
        .eq('id', reportId)
        .maybeSingle();
      if (err || !data) { setError('Report not found'); setLoading(false); return; }
      setReport(data as ReportRow);
      if (data.client_email) {
        const { data: c } = await supabase
          .from('clients')
          .select('first_name,last_name,email,phone,address,city,pool_type')
          .eq('email', data.client_email)
          .maybeSingle();
        if (c) setClient(c as ClientRow);
      }
      setLoading(false);
    })();
  }, [reportId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center gap-3 text-neutral-500">
        <AlertTriangle className="w-10 h-10 text-amber-400" />
        <p className="text-base font-medium">{error || 'Report not found'}</p>
        <button onClick={() => navigate(-1)} className="text-sm text-brand-600 hover:underline">Go back</button>
      </div>
    );
  }

  const isSwimReady = report.service_type === 'Pool Opening' && report.opening_type === 'Swim Ready';
  const checklistData = report.checklist_data;

  const completedAt = report.completed_time
    ? new Date(report.completed_time).toLocaleString('en-CA', { timeZone: 'America/Toronto', hour: '2-digit', minute: '2-digit', hour12: true })
    : null;

  const submittedAt = report.submitted_at
    ? new Date(report.submitted_at).toLocaleString('en-CA', { timeZone: 'America/Toronto', dateStyle: 'medium', timeStyle: 'short' })
    : null;

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="navbar">
        <div className="navbar-inner flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-neutral-600 hover:text-neutral-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <h1 className="text-base font-bold text-neutral-900 flex-1">View Report</h1>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 border border-green-300 text-green-800 text-xs font-semibold">
            <CheckCircle className="w-3.5 h-3.5" /> Submitted
          </span>
        </div>
      </header>

      <div className="page-content">

        {/* Summary */}
        <Section title="Summary">
          <div>
            <InfoRow label="Client" value={client ? `${client.first_name} ${client.last_name}` : report.client_email} />
            <InfoRow label="Email" value={report.client_email} />
            {client && <InfoRow label="Phone" value={client.phone} />}
            {client && <InfoRow label="Address" value={`${client.address}${client.city ? ', ' + client.city : ''}`} />}
            {client && <InfoRow label="Pool Type" value={client.pool_type} />}
            <InfoRow label="Service Date" value={report.service_date} />
            <InfoRow label="Service Type" value={report.service_type} />
            {report.opening_type && <InfoRow label="Opening Type" value={report.opening_type} />}
            <InfoRow label="Technician" value={report.lead_technician} />
            {completedAt && (
              <div className="flex justify-between py-1.5 border-b border-neutral-50">
                <span className="text-sm text-neutral-400 flex items-center gap-1 shrink-0 mr-4"><Clock className="w-3.5 h-3.5" /> Completed Time</span>
                <span className="text-sm font-bold text-brand-700">{completedAt}</span>
              </div>
            )}
            <div className="flex justify-between py-1.5 border-b border-neutral-50">
              <span className="text-sm text-neutral-400 flex items-center gap-1 shrink-0 mr-4"><DollarSign className="w-3.5 h-3.5" /> Cash Payment</span>
              <span className={`text-sm font-semibold ${report.client_paid_cash ? 'text-green-600' : 'text-neutral-400'}`}>
                {report.client_paid_cash ? 'Yes — paid cash' : 'No'}
              </span>
            </div>
            {submittedAt && <InfoRow label="Submitted At" value={submittedAt} />}
          </div>
        </Section>

        {/* Opening add-ons */}
        {report.opening_add_ons?.length > 0 && (
          <Section title="Opening Add-ons">
            <div className="flex flex-wrap gap-2">
              {report.opening_add_ons.map(a => (
                <span key={a} className="px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-medium">{a}</span>
              ))}
            </div>
          </Section>
        )}

        {/* Closing add-ons */}
        {report.closing_add_ons?.length > 0 && (
          <Section title="Pool Closing Add-ons">
            <div className="flex flex-wrap gap-2">
              {report.closing_add_ons.map(a => (
                <span key={a} className="px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-medium">{a}</span>
              ))}
            </div>
            {(report.return_plug_qty != null || report.gizmo_qty != null || report.yellow_cover_picks_qty != null) && (
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-neutral-700">
                {report.return_plug_qty != null && <span><strong className="text-neutral-900">Return Plugs:</strong> {report.return_plug_qty}</span>}
                {report.gizmo_qty != null && <span><strong className="text-neutral-900">Gizmos:</strong> {report.gizmo_qty}</span>}
                {report.yellow_cover_picks_qty != null && <span><strong className="text-neutral-900">Yellow Cover Picks:</strong> {report.yellow_cover_picks_qty}</span>}
              </div>
            )}
          </Section>
        )}

        {/* Pre-start */}
        {report.pre_start_checklist?.length > 0 && (
          <Section title="Pre-Start Checklist">
            <ChipList items={report.pre_start_checklist} />
            {report.liner_pull_inspection && (
              <p className="mt-3 text-sm text-brand-700 font-medium flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> Liner pull inspection completed
              </p>
            )}
          </Section>
        )}

        {/* Swim-Ready structured checklist */}
        {isSwimReady && checklistData && (
          <div>
            <div className="flex items-center gap-2 mb-4 px-1">
              <div className="flex-1 h-px bg-neutral-200" />
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest whitespace-nowrap">Swim-Ready Checklist</span>
              <div className="flex-1 h-px bg-neutral-200" />
            </div>
            {SWIM_READY_VIEW_SUBSECTIONS.map(sub => {
              const items: string[] = checklistData[sub.key] || [];
              if (items.length === 0) return null;
              const isCementSection = sub.key === 'cement_poo';
              return (
                <Section key={sub.key} title={sub.title} accent={isCementSection}>
                  <ChipList items={items} />
                </Section>
              );
            })}
          </div>
        )}

        {/* Legacy flat equipment checklists (non-Swim-Ready) */}
        {!isSwimReady && (() => {
          const sections = [
            { label: 'Winter Plugs', items: report.winter_plug },
            { label: 'Pool Reinstallation', items: report.pool_reinstallation },
            { label: 'Pool Light', items: report.pool_light },
            { label: 'Pool Pump', items: report.pool_pump },
            { label: 'Valves & Plumbing', items: report.valves_plumbing },
            { label: 'Sand Filter', items: report.sand_filter },
            { label: 'Cartridge Filter', items: report.cartridge_filter },
            { label: 'Salt System', items: report.salt_system },
            { label: 'Chlorinator', items: report.chlorinator },
            { label: 'Heater', items: report.heater },
            { label: 'Above Ground Pool', items: report.above_ground },
            { label: 'Garden Hose / Water Level', items: report.garden_hose },
          ].filter(s => s.items && s.items.length > 0);
          if (sections.length === 0) return null;
          return (
            <Section title="Equipment Checklists">
              <div className="space-y-5">
                {sections.map(s => (
                  <div key={s.label}>
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-wide mb-2">{s.label}</p>
                    <ChipList items={s.items} />
                  </div>
                ))}
              </div>
            </Section>
          );
        })()}

        {/* Cement pool (legacy flat) */}
        {!isSwimReady && report.cement_pool?.length > 0 && (
          <Section title="Cement Pool — Acid Wash" accent>
            <ChipList items={report.cement_pool} />
          </Section>
        )}

        {/* Client follow-up */}
        {(() => {
          const items = isSwimReady && checklistData?.marketing ? checklistData.marketing : report.marketing;
          if (!items?.length) return null;
          return (
            <Section title="Client Follow-Up">
              <ChipList items={items} />
            </Section>
          );
        })()}

        {/* Final inspection */}
        {(() => {
          const items = isSwimReady && checklistData?.final_insp ? checklistData.final_insp : report.final_inspection;
          if (!items?.length) return null;
          return (
            <Section title="Final Inspection">
              <ChipList items={items} />
            </Section>
          );
        })()}

        {/* Notes */}
        {report.technician_notes && (
          <Section title="Technician Notes">
            <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-xl px-4 py-3">
              <p className="text-sm text-amber-900 whitespace-pre-wrap leading-relaxed">{report.technician_notes}</p>
            </div>
          </Section>
        )}

        {/* Photos */}
        {(report.photo_pool_area || report.photo_pool_equipment || report.photo_extra) && (
          <Section title="Photos">
            <div className="space-y-4">
              {report.photo_pool_area && (
                <div>
                  <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2 flex items-center gap-1"><Image className="w-3.5 h-3.5" /> Pool Area</p>
                  <img src={report.photo_pool_area} alt="Pool Area" className="w-full rounded-xl border border-neutral-200 object-cover max-h-72" />
                </div>
              )}
              {report.photo_pool_equipment && (
                <div>
                  <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2 flex items-center gap-1"><Image className="w-3.5 h-3.5" /> Pool Equipment</p>
                  <img src={report.photo_pool_equipment} alt="Pool Equipment" className="w-full rounded-xl border border-neutral-200 object-cover max-h-72" />
                </div>
              )}
              {report.photo_extra && (
                <div>
                  <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2 flex items-center gap-1"><Image className="w-3.5 h-3.5" /> Extra</p>
                  <img src={report.photo_extra} alt="Extra" className="w-full rounded-xl border border-neutral-200 object-cover max-h-72" />
                </div>
              )}
            </div>
          </Section>
        )}

        <div className="text-center py-4">
          <p className="text-xs text-neutral-300">Report ID: {report.id}</p>
        </div>

      </div>
    </div>
  );
}
