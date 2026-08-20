import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, Calendar, FileText, Phone, MapPin, Droplets,
  ChevronDown, ChevronUp, CheckCircle, DollarSign, Clock,
  Image, AlertTriangle, X, User, RefreshCw, Loader2,
  ClipboardList, ExternalLink, ChevronRight, StickyNote, CalendarClock,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
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
  pool_cover: string;
  pool_opening: string;
  pool_opening_add_on: string;
  pool_opening_confirmed: string;
  pool_maintenance: string;
  pool_closing: string;
  pool_closing_add_ons: string;
  pool_closing_confirmed: string;
  backyard_access_approval: string;
  pool_size?: string;
}

interface ServiceReport {
  id: string;
  client_email: string;
  lead_technician: string;
  service_date: string;
  service_type: string;
  opening_type: string;
  opening_add_ons: string[];
  client_paid_cash: boolean;
  completed_time: string | null;
  submitted_at: string;
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
  photo_pool_area: string;
  photo_pool_equipment: string;
  photo_extra: string;
}

const SWIM_READY_VIEW_SUBSECTIONS = [
  { key: 'winter_plu', title: '1. Winter Plug Removal' },
  { key: 'pool_reins', title: '2. Pool Reinstallation' },
  { key: 'pool_light', title: '3. Pool Light' },
  { key: 'equip_2nd', title: '4. Equipment Ready for 2nd Visit' },
  { key: 'garden_hos', title: '5. Garden Hose Refill' },
  { key: 'cement_poo', title: '6. Cement Pool — Acid Wash' },
  { key: 'final_insp', title: '7. Final Inspection' },
];

function isCementPool(t: string) {
  const n = t.toLowerCase();
  return n.includes('cement') || n.includes('concrete') || n.includes('gunite');
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-CA', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

function ChipList({ items }: { items: string[] }) {
  if (!items || items.length === 0) return <p className="text-xs text-neutral-400 italic">None recorded</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(item => (
        <span key={item} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-xs font-medium">
          <CheckCircle className="w-3 h-3 text-brand-400 flex-shrink-0" /> {item}
        </span>
      ))}
    </div>
  );
}

function InfoRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-neutral-50 last:border-0 gap-3">
      <span className="text-xs text-neutral-400 shrink-0">{label}</span>
      <span className={`text-xs font-medium text-right ${accent ? 'text-amber-700 font-bold' : 'text-neutral-800'}`}>{value || '—'}</span>
    </div>
  );
}

function ReportViewer({ report, onClose }: { report: ServiceReport; onClose: () => void }) {
  const navigate = useNavigate();
  const isSwimReady = report.service_type === 'Pool Opening' &&
    (report.opening_type === 'Swim Ready' || report.opening_type === 'Swim-Ready 1st Visit');
  const checklistData = report.checklist_data;
  const completedAt = report.completed_time
    ? new Date(report.completed_time).toLocaleString('en-CA', { timeZone: 'America/Toronto', hour: '2-digit', minute: '2-digit', hour12: true })
    : null;
  const submittedAt = report.submitted_at
    ? new Date(report.submitted_at).toLocaleString('en-CA', { timeZone: 'America/Toronto', dateStyle: 'medium', timeStyle: 'short' })
    : null;
  const isServiceNotComplete = report.technician_notes?.includes('[SERVICE NOT COMPLETE]');
  const notesClean = report.technician_notes?.replace('[SERVICE NOT COMPLETE]', '').trim();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="bg-neutral-50 w-full sm:max-w-2xl sm:rounded-2xl shadow-card-lg max-h-[92vh] overflow-y-auto border border-neutral-200" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-white border-b border-neutral-100 shadow-card px-4 h-14 flex items-center gap-3 sm:rounded-t-2xl">
          <button onClick={onClose} className="btn-icon"><X className="w-4 h-4" /></button>
          <h2 className="text-sm font-semibold text-neutral-900 flex-1">Service Report</h2>
          {isServiceNotComplete && <span className="badge-red"><AlertTriangle className="w-3 h-3" />Not Complete</span>}
          <span className="badge-green"><CheckCircle className="w-3 h-3" />Submitted</span>
          <button onClick={() => navigate('/submit-report', { state: { reportId: report.id } })}
            className="btn-primary btn-sm"><ExternalLink className="w-3.5 h-3.5" />Edit</button>
        </div>
        <div className="px-4 py-4 space-y-3">
          <div className="card card-body">
            <p className="section-title">Summary</p>
            <InfoRow label="Service Date" value={formatDate(report.service_date)} />
            <InfoRow label="Service Type" value={report.service_type} />
            {report.opening_type && <InfoRow label="Opening Type" value={report.opening_type} />}
            <InfoRow label="Lead Technician" value={report.lead_technician} />
            {completedAt && (
              <div className="flex justify-between items-center py-1.5 border-b border-neutral-50 gap-3">
                <span className="text-xs text-neutral-400 flex items-center gap-1 shrink-0"><Clock className="w-3 h-3" />Completed</span>
                <span className="text-xs font-bold text-brand-700">{completedAt}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-1.5 border-b border-neutral-50 gap-3">
              <span className="text-xs text-neutral-400 flex items-center gap-1 shrink-0"><DollarSign className="w-3 h-3" />Cash Payment</span>
              <span className={`text-xs font-semibold ${report.client_paid_cash ? 'text-green-600' : 'text-neutral-400'}`}>{report.client_paid_cash ? 'Yes — paid cash' : 'No'}</span>
            </div>
            {submittedAt && <InfoRow label="Submitted" value={submittedAt} />}
          </div>

          {report.opening_add_ons?.length > 0 && (
            <div className="card card-body">
              <p className="section-title">Opening Add-ons</p>
              <div className="flex flex-wrap gap-1.5">
                {report.opening_add_ons.map(a => <span key={a} className="badge-teal">{a}</span>)}
              </div>
            </div>
          )}

          {report.pre_start_checklist?.length > 0 && (
            <div className="card card-body">
              <p className="section-title">Pre-Start Checklist</p>
              <ChipList items={report.pre_start_checklist} />
              {report.liner_pull_inspection && (
                <p className="mt-2 text-xs text-brand-700 font-medium flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Liner pull inspection completed
                </p>
              )}
            </div>
          )}

          {isSwimReady && checklistData && (
            <div>
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className="flex-1 h-px bg-neutral-200" />
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest whitespace-nowrap">Swim-Ready Checklist</span>
                <div className="flex-1 h-px bg-neutral-200" />
              </div>
              {SWIM_READY_VIEW_SUBSECTIONS.map(sub => {
                const items: string[] = checklistData[sub.key] || [];
                if (items.length === 0) return null;
                const isCement = sub.key === 'cement_poo';
                return (
                  <div key={sub.key} className={`rounded-xl border px-4 py-3 mb-2 ${isCement ? 'bg-amber-50 border-amber-200' : 'bg-white border-neutral-100'}`}>
                    <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${isCement ? 'text-amber-800' : 'text-neutral-500'}`}>{sub.title}</p>
                    <ChipList items={items} />
                  </div>
                );
              })}
            </div>
          )}

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
              <div className="card card-body">
                <p className="section-title">Equipment Checklists</p>
                <div className="space-y-3">
                  {sections.map(s => (
                    <div key={s.label}>
                      <p className="text-xs font-semibold text-neutral-500 mb-1.5">{s.label}</p>
                      <ChipList items={s.items} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {!isSwimReady && report.cement_pool?.length > 0 && (
            <div className="rounded-xl border bg-amber-50 border-amber-200 px-4 py-3">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-2">Cement Pool — Acid Wash</p>
              <ChipList items={report.cement_pool} />
            </div>
          )}

          {report.marketing?.length > 0 && (
            <div className="card card-body">
              <p className="section-title">Client Follow-Up</p>
              <ChipList items={report.marketing} />
            </div>
          )}

          {(() => {
            const items = isSwimReady && checklistData?.final_insp ? checklistData.final_insp : report.final_inspection;
            if (!items?.length) return null;
            return (
              <div className="card card-body">
                <p className="section-title">Final Inspection</p>
                <ChipList items={items} />
              </div>
            );
          })()}

          {notesClean && (
            <div className="card card-body">
              <p className="section-title flex items-center gap-1.5"><StickyNote className="w-3.5 h-3.5" />Technician Notes</p>
              {isServiceNotComplete && (
                <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                  <span className="text-xs font-bold text-red-700">SERVICE NOT COMPLETE</span>
                </div>
              )}
              <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-xl px-3 py-2.5">
                <p className="text-xs text-amber-900 whitespace-pre-wrap leading-relaxed">{notesClean}</p>
              </div>
            </div>
          )}

          {(report.photo_pool_area || report.photo_pool_equipment || report.photo_extra) && (
            <div className="card card-body">
              <p className="section-title flex items-center gap-1.5"><Image className="w-3.5 h-3.5" />Photos</p>
              <div className="space-y-3">
                {report.photo_pool_area && (
                  <div><p className="text-xs text-neutral-400 mb-1">Pool Area</p><img src={report.photo_pool_area} alt="Pool Area" className="w-full rounded-xl border border-neutral-200 object-cover max-h-56" /></div>
                )}
                {report.photo_pool_equipment && (
                  <div><p className="text-xs text-neutral-400 mb-1">Pool Equipment</p><img src={report.photo_pool_equipment} alt="Pool Equipment" className="w-full rounded-xl border border-neutral-200 object-cover max-h-56" /></div>
                )}
                {report.photo_extra && (
                  <div><p className="text-xs text-neutral-400 mb-1">Extra</p><img src={report.photo_extra} alt="Extra" className="w-full rounded-xl border border-neutral-200 object-cover max-h-56" /></div>
                )}
              </div>
            </div>
          )}

          <p className="text-center text-xs text-neutral-300 py-2">Report ID: {report.id}</p>
        </div>
      </div>
    </div>
  );
}

interface Booking {
  id: string;
  email: string;
  client_name: string | null;
  service_type: string | null;
  event_date: string | null;
  start_time: string | null;
  service_team: string | null;
  custom_note: string | null;
  custom_job_name: string | null;
  status: string | null;
  requested_by: string | null;
  rejection_reason: string | null;
  pre_book_date: string | null;
  balance_due: number | null;
  closing_add_ons: string | null;
  created_at: string;
}

type TimelineItem =
  | { kind: 'report'; date: string; report: ServiceReport }
  | { kind: 'booking'; date: string; booking: Booking };

function bookingStatusBadge(status: string | null) {
  const s = (status || '').toLowerCase();
  if (s === 'approved' || s === 'confirmed') return { cls: 'badge-green', label: 'Approved' };
  if (s === 'rejected' || s === 'declined') return { cls: 'badge-red', label: 'Rejected' };
  if (s === 'pending') return { cls: 'badge-yellow', label: 'Pending' };
  if (s === 'cancelled' || s === 'canceled') return { cls: 'badge-red', label: 'Cancelled' };
  return status ? { cls: 'badge-teal', label: status } : { cls: 'badge-teal', label: 'Booked' };
}

function BookingDetails({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const status = bookingStatusBadge(booking.status);
  const startTime = booking.start_time
    ? new Date(booking.start_time).toLocaleString('en-CA', { timeZone: 'America/Toronto', dateStyle: 'medium', timeStyle: 'short' })
    : null;
  const createdAt = booking.created_at
    ? new Date(booking.created_at).toLocaleString('en-CA', { timeZone: 'America/Toronto', dateStyle: 'medium', timeStyle: 'short' })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="bg-neutral-50 w-full sm:max-w-lg sm:rounded-2xl shadow-card-lg max-h-[92vh] overflow-y-auto border border-neutral-200" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-white border-b border-neutral-100 shadow-card px-4 h-14 flex items-center gap-3 sm:rounded-t-2xl">
          <button onClick={onClose} className="btn-icon"><X className="w-4 h-4" /></button>
          <h2 className="text-sm font-semibold text-neutral-900 flex-1 flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-brand-500" /> Booking Details
          </h2>
          <span className={status.cls}>{status.label}</span>
        </div>
        <div className="px-4 py-4 space-y-3">
          <div className="card card-body">
            <p className="section-title">Summary</p>
            <InfoRow label="Service Type" value={booking.service_type || (booking.custom_job_name || 'Custom Job')} />
            {booking.custom_job_name && booking.service_type && (
              <InfoRow label="Job Name" value={booking.custom_job_name} />
            )}
            <InfoRow label="Event Date" value={booking.event_date ? formatDate(booking.event_date) : '—'} />
            {startTime && <InfoRow label="Start Time" value={startTime} />}
            {booking.service_team && <InfoRow label="Team" value={booking.service_team} />}
            {booking.requested_by && <InfoRow label="Requested By" value={booking.requested_by} />}
            {booking.pre_book_date && <InfoRow label="Pre-Book Date" value={formatDate(booking.pre_book_date)} />}
            {booking.balance_due != null && Number(booking.balance_due) > 0 && (
              <div className="flex justify-between items-center py-1.5 border-b border-neutral-50 gap-3">
                <span className="text-xs text-neutral-400 flex items-center gap-1 shrink-0"><DollarSign className="w-3 h-3" />Balance Due</span>
                <span className="text-xs font-bold text-amber-700">${Number(booking.balance_due).toFixed(2)}</span>
              </div>
            )}
            {createdAt && <InfoRow label="Booked On" value={createdAt} />}
          </div>

          {booking.closing_add_ons && (
            <div className="card card-body">
              <p className="section-title">Closing Add-ons</p>
              <p className="text-sm text-neutral-700">{booking.closing_add_ons}</p>
            </div>
          )}

          {booking.rejection_reason && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-xs font-bold text-red-700 mb-1 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />Rejection Reason</p>
              <p className="text-sm text-red-800">{booking.rejection_reason}</p>
            </div>
          )}

          {booking.custom_note && (
            <div className="card card-body">
              <p className="section-title flex items-center gap-1.5"><StickyNote className="w-3.5 h-3.5" />Booking Note</p>
              <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-xl px-3 py-2.5">
                <p className="text-xs text-amber-900 whitespace-pre-wrap leading-relaxed">{booking.custom_note}</p>
              </div>
            </div>
          )}

          <p className="text-center text-xs text-neutral-300 py-2">Booking ID: {booking.id}</p>
        </div>
      </div>
    </div>
  );
}

function VisitHistory({ clientEmail }: { clientEmail: string }) {
  const [reports, setReports] = useState<ServiceReport[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ServiceReport | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const [reportsRes, bookingsRes] = await Promise.all([
        supabase
          .from('service_reports')
          .select('*')
          .eq('client_email', clientEmail)
          .lte('service_date', today)
          .not('completed_time', 'is', null)
          .not('submitted_at', 'is', null)
          .not('technician_notes', 'ilike', '%[SERVICE NOT COMPLETE]%')
          .order('service_date', { ascending: false }),
        supabase
          .from('bookings')
          .select('id,email,client_name,service_type,event_date,start_time,service_team,custom_note,custom_job_name,status,requested_by,rejection_reason,pre_book_date,balance_due,closing_add_ons,created_at')
          .eq('email', clientEmail)
          .order('event_date', { ascending: false }),
      ]);
      if (reportsRes.error) { toast.error('Failed to load visit history'); setReports([]); }
      else setReports((reportsRes.data as ServiceReport[]) || []);
      if (bookingsRes.error) setBookings([]);
      else setBookings((bookingsRes.data as Booking[]) || []);
      setLoading(false);
    })();
  }, [clientEmail]);

  if (loading) return (
    <div className="flex items-center justify-center py-8 text-neutral-400 gap-2">
      <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading visit history…</span>
    </div>
  );

  const isNotComplete = (r: ServiceReport) => r.technician_notes?.includes('[SERVICE NOT COMPLETE]');

  // Pair reports with bookings on the same date so booking notes are visible alongside reports
  const bookingsByDate: Record<string, Booking[]> = {};
  for (const b of bookings) {
    const d = b.event_date || b.created_at.slice(0, 10);
    if (!bookingsByDate[d]) bookingsByDate[d] = [];
    bookingsByDate[d].push(b);
  }

  const timeline: TimelineItem[] = [
    ...reports.map(r => ({ kind: 'report' as const, date: r.service_date, report: r })),
    ...bookings.map(b => ({ kind: 'booking' as const, date: b.event_date || b.created_at.slice(0, 10), booking: b })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  if (timeline.length === 0) return (
    <div className="empty-state py-8">
      <ClipboardList className="empty-state-icon" />
      <p className="empty-state-title">No visits or bookings on file</p>
    </div>
  );

  return (
    <>
      <div className="space-y-2">
        {timeline.map(item => {
          if (item.kind === 'report') {
            const r = item.report;
            return (
              <button key={`r-${r.id}`} onClick={() => setSelectedReport(r)}
                className="w-full text-left card hover:border-brand-200 hover:shadow-card-md transition-all px-4 py-3 group">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-50 group-hover:border-brand-100 transition-colors">
                    <FileText className="w-4 h-4 text-neutral-400 group-hover:text-brand-500 transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-neutral-900">{r.service_type}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded">Report</span>
                      {r.opening_type && <span className="badge-teal">{r.opening_type}</span>}
                      {isNotComplete(r) && <span className="badge-red"><AlertTriangle className="w-3 h-3" />Incomplete</span>}
                      {r.client_paid_cash && <span className="badge-green"><DollarSign className="w-3 h-3" />Cash</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-neutral-500">{formatDate(r.service_date)}</span>
                      {r.lead_technician && <span className="text-xs text-neutral-400">by {r.lead_technician}</span>}
                    </div>
                    {r.technician_notes && !isNotComplete(r) && (
                      <p className="text-xs text-neutral-400 mt-1 truncate">{r.technician_notes.replace('[SERVICE NOT COMPLETE]', '').trim()}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-brand-400 flex-shrink-0 mt-1 transition-colors" />
                </div>
              </button>
            );
          }
          const b = item.booking;
          const status = bookingStatusBadge(b.status);
          return (
            <button key={`b-${b.id}`} onClick={() => setSelectedBooking(b)}
              className="w-full text-left card hover:border-brand-200 hover:shadow-card-md transition-all px-4 py-3 group">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-100 group-hover:border-amber-200 transition-colors">
                  <CalendarClock className="w-4 h-4 text-amber-500 group-hover:text-amber-600 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-neutral-900">{b.service_type || b.custom_job_name || 'Custom Job'}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Booking</span>
                    <span className={status.cls}>{status.label}</span>
                    {b.balance_due != null && Number(b.balance_due) > 0 && (
                      <span className="badge-yellow"><DollarSign className="w-3 h-3" />${Number(b.balance_due).toFixed(2)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-neutral-500">{b.event_date ? formatDate(b.event_date) : 'Unscheduled'}</span>
                    {b.service_team && <span className="text-xs text-neutral-400">Team {b.service_team}</span>}
                  </div>
                  {b.custom_note && (
                    <p className="text-xs text-neutral-500 mt-1 truncate flex items-center gap-1">
                      <StickyNote className="w-3 h-3 text-amber-400 flex-shrink-0" />{b.custom_note}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-amber-400 flex-shrink-0 mt-1 transition-colors" />
              </div>
            </button>
          );
        })}
      </div>
      {selectedReport && <ReportViewer report={selectedReport} onClose={() => setSelectedReport(null)} />}
      {selectedBooking && <BookingDetails booking={selectedBooking} onClose={() => setSelectedBooking(null)} />}
    </>
  );
}

function ClientProfile({ client: initialClient, onClose, onRefresh }: { client: Client; onClose: () => void; onRefresh: (c: Client) => void }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'info' | 'visits'>('info');
  const [syncing, setSyncing] = useState(false);
  const [client, setClient] = useState<Client>(initialClient);
  const isCement = client.pool_type ? isCementPool(client.pool_type) : false;

  const handleSync = async () => {
    setSyncing(true);
    const id = toast.loading('Syncing from HubSpot…');
    try {
      await supabase.rpc('sync_single_client', { p_email: client.email });
      const { data: fresh } = await supabase.from('clients').select('*').eq('email', client.email).maybeSingle();
      if (fresh) { setClient(fresh as Client); onRefresh(fresh as Client); }
      toast.success('Client synced', { id });
    } catch { toast.error('Sync failed', { id }); }
    finally { setSyncing(false); }
  };

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="bg-neutral-50 border-b border-neutral-100 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-brand-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-neutral-900">{client.first_name} {client.last_name}</h2>
            <p className="text-sm text-neutral-500 truncate">{client.email}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={handleSync} disabled={syncing} className="btn-icon" title="Sync from HubSpot">
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="btn-icon"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={() => navigate('/book-client', { state: { clientEmail: client.email } })} className="btn-primary flex-1">
            <Calendar className="w-4 h-4" />Book
          </button>
          <button onClick={() => navigate('/submit-report', { state: { clientEmail: client.email } })} className="btn-secondary flex-1">
            <FileText className="w-4 h-4" />New Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-100">
        <button onClick={() => setTab('info')}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${tab === 'info' ? 'text-brand-700 border-b-2 border-brand-600' : 'text-neutral-500 hover:text-neutral-700'}`}>
          Client Info
        </button>
        <button onClick={() => setTab('visits')}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${tab === 'visits' ? 'text-brand-700 border-b-2 border-brand-600' : 'text-neutral-500 hover:text-neutral-700'}`}>
          Past Visits
        </button>
      </div>

      <div className="px-5 py-4">
        {tab === 'info' ? (
          <div className="space-y-5">
            <div>
              <p className="section-title">Contact</p>
              <div className="space-y-1.5">
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-sm text-brand-700 hover:underline">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />{client.phone}
                  </a>
                )}
                <div className="flex items-start gap-2 text-sm text-neutral-600">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-neutral-400" />
                  <span>{client.address}{client.city ? `, ${client.city}` : ''}{client.zip ? ` ${client.zip}` : ''}</span>
                </div>
              </div>
            </div>

            <div>
              <p className="section-title">Pool</p>
              <div className="grid grid-cols-2 gap-2">
                {client.pool_type && (
                  <div className={`rounded-xl p-3 border ${isCement ? 'bg-amber-50 border-amber-200' : 'bg-neutral-50 border-neutral-100'}`}>
                    <p className="text-xs text-neutral-400 mb-0.5">Type</p>
                    <p className={`text-sm font-semibold ${isCement ? 'text-amber-800' : 'text-neutral-800'}`}>{client.pool_type}</p>
                    {isCement && <p className="text-xs text-amber-600 font-medium mt-0.5">Acid wash required</p>}
                  </div>
                )}
                {client.pool_size && (
                  <div className="rounded-xl bg-neutral-50 border border-neutral-100 p-3">
                    <p className="text-xs text-neutral-400 mb-0.5">Size</p>
                    <p className="text-sm font-semibold text-neutral-800">{client.pool_size}</p>
                  </div>
                )}
                {client.pool_cover && (
                  <div className="rounded-xl bg-neutral-50 border border-neutral-100 p-3">
                    <p className="text-xs text-neutral-400 mb-0.5">Cover</p>
                    <p className="text-sm font-semibold text-neutral-800">{client.pool_cover}</p>
                  </div>
                )}
                {client.backyard_access_approval && (
                  <div className="rounded-xl bg-neutral-50 border border-neutral-100 p-3">
                    <p className="text-xs text-neutral-400 mb-0.5">Backyard Access</p>
                    <p className="text-sm font-semibold text-neutral-800">{client.backyard_access_approval}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="section-title">Services</p>
              <div className="space-y-2">
                {(client.pool_opening || client.pool_opening_add_on) && (
                  <div className="rounded-xl bg-neutral-50 border border-neutral-100 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold text-neutral-600">Opening</p>
                      {client.pool_opening_confirmed && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${client.pool_opening_confirmed === 'Yes' ? 'badge-green' : 'badge-yellow'}`}>
                          {client.pool_opening_confirmed === 'Yes' ? 'Confirmed' : client.pool_opening_confirmed}
                        </span>
                      )}
                    </div>
                    {client.pool_opening && <p className="text-sm text-neutral-700">{client.pool_opening}</p>}
                    {client.pool_opening_add_on && <p className="text-xs text-neutral-500 mt-0.5">Add-ons: {client.pool_opening_add_on}</p>}
                  </div>
                )}
                {client.pool_maintenance && (
                  <div className="rounded-xl bg-neutral-50 border border-neutral-100 p-3">
                    <p className="text-xs font-bold text-neutral-600 mb-1">Maintenance</p>
                    <p className="text-sm text-neutral-700">{client.pool_maintenance}</p>
                  </div>
                )}
                {client.pool_closing && (
                  <div className="rounded-xl bg-neutral-50 border border-neutral-100 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold text-neutral-600">Closing</p>
                      {client.pool_closing_confirmed && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${client.pool_closing_confirmed === 'Yes' ? 'badge-green' : 'badge-yellow'}`}>
                          {client.pool_closing_confirmed === 'Yes' ? 'Confirmed' : client.pool_closing_confirmed}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-700">{client.pool_closing}</p>
                    {client.pool_closing_add_ons && <p className="text-xs text-neutral-500 mt-0.5">Add-ons: {client.pool_closing_add_ons}</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <VisitHistory clientEmail={client.email} />
        )}
      </div>
    </div>
  );
}

export default function ClientSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Client[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
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
    const handler = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectClient = (c: Client) => { setSelectedClient(c); setShowDropdown(false); setQuery(`${c.first_name} ${c.last_name}`); };
  const clearSelection = () => { setSelectedClient(null); setQuery(''); setResults([]); setTimeout(() => inputRef.current?.focus(), 50); };

  return (
    <div className="w-full">
      <div className="relative mb-5" ref={dropdownRef}>
        <div className="relative flex items-center">
          <Search className="absolute left-4 w-4 h-4 text-neutral-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedClient(null); }}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder="Search by name, email, phone, or address…"
            className="form-input pl-11 pr-24 py-3"
          />
          <div className="absolute right-3 flex items-center gap-2">
            {searching && <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />}
            {query && <button onClick={clearSelection} className="btn-icon p-1"><X className="w-4 h-4" /></button>}
          </div>
        </div>

        {showDropdown && results.length > 0 && !selectedClient && (
          <div className="absolute z-20 w-full mt-1.5 bg-white rounded-xl shadow-card-lg border border-neutral-100 overflow-hidden">
            {results.map(c => (
              <button key={c.email} onClick={() => selectClient(c)}
                className="w-full text-left px-4 py-3.5 hover:bg-neutral-50 border-b border-neutral-50 last:border-0 transition-colors flex items-start gap-3 group">
                <div className="w-8 h-8 rounded-full bg-neutral-100 group-hover:bg-brand-100 flex items-center justify-center flex-shrink-0 transition-colors">
                  <User className="w-4 h-4 text-neutral-400 group-hover:text-brand-500 transition-colors" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-neutral-900">{c.first_name} {c.last_name}</p>
                  <p className="text-xs text-neutral-500 truncate">{c.email}</p>
                  {c.address && <p className="text-xs text-neutral-400 truncate">{c.address}{c.city ? `, ${c.city}` : ''}</p>}
                </div>
                {c.pool_type && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-neutral-50 text-neutral-500 border border-neutral-100 flex-shrink-0 self-center">
                    <Droplets className="w-3 h-3" />{c.pool_type}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {showDropdown && !searching && results.length === 0 && query.trim().length >= 2 && !selectedClient && (
          <div className="absolute z-20 w-full mt-1.5 bg-white rounded-xl shadow-card-lg border border-neutral-100 px-4 py-5 text-center">
            <p className="text-sm text-neutral-500 font-medium">No clients found</p>
            <p className="text-xs text-neutral-400 mt-1">Try a different name, email, phone, or address</p>
          </div>
        )}
      </div>

      {selectedClient && (
        <ClientProfile client={selectedClient} onClose={clearSelection} onRefresh={c => setSelectedClient(c)} />
      )}

      {!selectedClient && !query && (
        <div className="empty-state py-10">
          <Search className="empty-state-icon" />
          <p className="empty-state-title">Search for a client to view their profile and visit history</p>
        </div>
      )}
    </div>
  );
}
