import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ADMIN_EMAIL = "theo@novopiscines.ca";
const FROM_ADDRESS = "Piscines Novo <services@novopiscines.ca>";
const REPLY_TO = "services@novopiscines.ca";

// Pool type → swim ready next-step URL
const SWIM_READY_LINKS: Record<string, string> = {
  inground_liner: "https://www.novopiscines.ca/in-ground-liner-pool-opening-swim-ready/",
  cement: "https://www.novopiscines.ca/in-ground-cement-pool-opening-swim-ready/",
  aboveground: "https://www.novopiscines.ca/above-ground-liner-pool-opening-swim-ready/",
};

function getSwimReadyLink(poolType?: string): string {
  if (!poolType) return SWIM_READY_LINKS.inground_liner;
  const t = poolType.toLowerCase();
  if (t.includes('above') || t.includes('hors') || t.includes('agp')) return SWIM_READY_LINKS.aboveground;
  if (t.includes('cement') || t.includes('concrete') || t.includes('gunite') || t.includes('béton')) return SWIM_READY_LINKS.cement;
  return SWIM_READY_LINKS.inground_liner;
}

// ─── Shared types ────────────────────────────────────────────────────────────

interface ClientData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  pool_type?: string;
  pool_cover?: string;
  pool_opening?: string;
  pool_closing?: string;
  pool_maintenance?: string;
  backyard_access_approval?: string;
  pool_opening_add_on?: string;
  pool_closing_add_ons?: string;
}

interface ReportDraft {
  serviceDate: string;
  serviceType: string;
  openingType: string;
  openingAddOns: string[];
  clientPaidCash: boolean;
  cashAmount?: string;
  completedTime?: string;
  preStartChecklist: string[];
  technicianNotes: string;
  marketing: string[];
  finalInspection: string[];
  cementPool: string[];
  swimReadyChecklist?: Record<string, string[]>;
  closingChecklist?: string[];
  closingChecklistAll?: string[];
  [key: string]: unknown;
}

// ─── Service Report email ─────────────────────────────────────────────────────

const SWIM_READY_EMAIL_SUBSECTIONS: { key: string; title: string }[] = [
  { key: 'winter_plu', title: '1. Winter Plug Removal' },
  { key: 'pool_reins', title: '2. Pool Reinstallation' },
  { key: 'pool_light', title: '3. Pool Light' },
  { key: 'pool_pump',  title: '4. Pool Pump' },
  { key: 'valves_plu', title: '5. Valves & Plumbing' },
  { key: 'sand_filte', title: '6. Sand Filter' },
  { key: 'cartridge_', title: '7. Cartridge Filter' },
  { key: 'salt_syste', title: '8. Salt System' },
  { key: 'chlorinato', title: '9. Chlorinator' },
  { key: 'heater',     title: '10. Heater' },
  { key: 'abovegroun', title: '11. Above-Ground Pool Checks' },
  { key: 'garden_hos', title: '12. Garden Hose Refill Policy' },
  { key: 'cement_poo', title: '13. Cement Pool — Acid Wash' },
  { key: 'marketing',  title: '14. Marketing' },
  { key: 'final_insp', title: '15. Final Inspection' },
];

interface EmailPayload {
  type?: 'report' | 'rejection' | 'rejection_batch' | 'weekly_confirmation';
  reportId?: string;
  client?: ClientData | null;
  draft?: ReportDraft;
  techName?: string;
  techStaffId?: string;
  technicianNames?: string[];
  photoUrls?: { areaUrl: string; equipUrl: string; extraUrl: string; removedPartsUrl?: string };
  // single rejection
  booking?: BookingRejectionData;
  // batch rejection
  bookings?: BookingRejectionData[];
  reason?: string;
  rejected_by?: string;
  // weekly confirmation fields
  weekSummary?: WeekSummaryData;
}

// ─── Rejection email ──────────────────────────────────────────────────────────

interface BookingRejectionData {
  id: string;
  client_name: string;
  email: string;
  service_type: string;
  event_date: string;
  rejection_reason: string;
  rejected_by: string;
  custom_note?: string;
  client_phone?: string;
  client_address?: string;
  client_pool_type?: string;
}

function buildRejectionHtml(booking: BookingRejectionData): string {
  const now = new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto', dateStyle: 'full', timeStyle: 'short' });
  const serviceDate = new Date(booking.event_date + 'T00:00:00').toLocaleDateString('en-CA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Booking Request Rejected — ${booking.client_name}</title></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:24px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:#DC2626;padding:28px 32px;">
      <h1 style="color:white;margin:0;font-size:20px;font-weight:700;">Booking Request Rejected</h1>
      <p style="color:#FCA5A5;margin:6px 0 0;font-size:13px;">${now}</p>
    </div>
    <div style="padding:28px 32px;">
      <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:20px;margin-bottom:24px;">
        <h2 style="font-size:13px;font-weight:700;color:#991B1B;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 12px;">Rejection Details</h2>
        <p style="margin:0;font-size:14px;color:#7F1D1D;line-height:1.6;">${booking.rejection_reason}</p>
      </div>
      <div style="background:#F9FAFB;border-radius:12px;padding:20px;margin-bottom:24px;">
        <h2 style="font-size:14px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 16px;">Request Summary</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:5px 0;color:#6B7280;font-size:13px;width:40%;">Client</td><td style="font-size:13px;font-weight:600;color:#111827;">${booking.client_name}</td></tr>
          <tr><td style="padding:5px 0;color:#6B7280;font-size:13px;">Email</td><td style="font-size:13px;color:#111827;">${booking.email}</td></tr>
          ${booking.client_phone ? `<tr><td style="padding:5px 0;color:#6B7280;font-size:13px;">Phone</td><td style="font-size:13px;color:#111827;">${booking.client_phone}</td></tr>` : ''}
          ${booking.client_address ? `<tr><td style="padding:5px 0;color:#6B7280;font-size:13px;">Address</td><td style="font-size:13px;color:#111827;">${booking.client_address}</td></tr>` : ''}
          ${booking.client_pool_type ? `<tr><td style="padding:5px 0;color:#6B7280;font-size:13px;">Pool Type</td><td style="font-size:13px;color:#111827;">${booking.client_pool_type}</td></tr>` : ''}
          <tr><td style="padding:5px 0;color:#6B7280;font-size:13px;">Service</td><td style="font-size:13px;font-weight:600;color:#1D4ED8;">${booking.service_type}</td></tr>
          <tr><td style="padding:5px 0;color:#6B7280;font-size:13px;">Requested Date</td><td style="font-size:13px;font-weight:600;color:#111827;">${serviceDate}</td></tr>
          ${booking.custom_note ? `<tr><td style="padding:5px 0;color:#6B7280;font-size:13px;">Notes</td><td style="font-size:13px;color:#6B7280;font-style:italic;">${booking.custom_note}</td></tr>` : ''}
          <tr><td style="padding:5px 0;color:#6B7280;font-size:13px;">Rejected By</td><td style="font-size:13px;color:#111827;">${booking.rejected_by}</td></tr>
        </table>
      </div>
    </div>
    <div style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:20px 32px;text-align:center;">
      <p style="color:#9CA3AF;font-size:12px;margin:0;">Piscines Novo — Booking Request System</p>
      <p style="color:#9CA3AF;font-size:11px;margin:6px 0 0;">Booking ID: ${booking.id}</p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Weekly confirmation email ────────────────────────────────────────────────

interface DayGroup {
  date: string;
  team: string;
  assignments: AssignmentSummary[];
}

interface AssignmentSummary {
  title: string;
  email: string;
  service_type: string;
  display_address?: string;
  display_phone?: string;
  display_pool_type?: string;
  display_pool_cover?: string;
  display_backyard_access?: string;
  display_pool_opening?: string;
  display_pool_closing?: string;
  display_pool_maintenance?: string;
  display_opening_add_ons?: string;
  display_closing_add_ons?: string;
  admin_note?: string;
}

interface WeekSummaryData {
  weekLabel: string;
  days: DayGroup[];
  sentBy: string;
}

function val(v?: string | null) {
  return v && v.trim() ? v.trim() : null;
}

function buildWeeklyHtml(data: WeekSummaryData): string {
  const now = new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto', dateStyle: 'full', timeStyle: 'short' });

  const TEAM_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    PRINCESSDAVID: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
    TONYVAN:       { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
    JARVISVAN:     { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
    SONIC:         { bg: '#FFF1F2', text: '#9F1239', border: '#FECDD3' },
  };

  const byDate: Record<string, DayGroup[]> = {};
  data.days.forEach(d => {
    if (!byDate[d.date]) byDate[d.date] = [];
    byDate[d.date].push(d);
  });

  const sortedDates = Object.keys(byDate).sort();

  const daysHtml = sortedDates.map(date => {
    const groups = byDate[date];
    const dayLabel = new Date(date + 'T00:00:00').toLocaleDateString('en-CA', {
      weekday: 'long', month: 'long', day: 'numeric',
    });
    const totalJobs = groups.reduce((s, g) => s + g.assignments.length, 0);

    const teamsHtml = groups.map(group => {
      const tc = TEAM_COLORS[group.team] || { bg: '#F9FAFB', text: '#374151', border: '#E5E7EB' };
      const jobsHtml = group.assignments.map((a, idx) => {
        const serviceTypeLabel = a.service_type
          ? `<span style="display:inline-block;background:#EFF6FF;color:#1D4ED8;border-radius:12px;padding:2px 10px;font-size:11px;font-weight:600;margin-left:6px;">${a.service_type}</span>`
          : '';

        const rows: string[] = [];
        if (val(a.email)) rows.push(`<tr><td style="padding:3px 0;color:#9CA3AF;font-size:12px;width:38%;">Email</td><td style="font-size:12px;color:#374151;">${val(a.email)}</td></tr>`);
        if (val(a.display_phone)) rows.push(`<tr><td style="padding:3px 0;color:#9CA3AF;font-size:12px;">Phone</td><td style="font-size:12px;color:#374151;">${val(a.display_phone)}</td></tr>`);
        if (val(a.display_address)) rows.push(`<tr><td style="padding:3px 0;color:#9CA3AF;font-size:12px;">Address</td><td style="font-size:12px;color:#374151;">${val(a.display_address)}</td></tr>`);
        if (val(a.display_pool_type)) rows.push(`<tr><td style="padding:3px 0;color:#9CA3AF;font-size:12px;">Pool Type</td><td style="font-size:12px;color:#374151;">${val(a.display_pool_type)}</td></tr>`);
        if (val(a.display_pool_cover)) rows.push(`<tr><td style="padding:3px 0;color:#9CA3AF;font-size:12px;">Cover</td><td style="font-size:12px;color:#374151;">${val(a.display_pool_cover)}</td></tr>`);
        if (val(a.display_backyard_access)) rows.push(`<tr><td style="padding:3px 0;color:#9CA3AF;font-size:12px;">Backyard Access</td><td style="font-size:12px;color:#374151;">${val(a.display_backyard_access)}</td></tr>`);

        const st = (a.service_type || '').toLowerCase();
        if (st.includes('opening')) {
          if (val(a.display_pool_opening)) rows.push(`<tr><td style="padding:3px 0;color:#9CA3AF;font-size:12px;">Opening Package</td><td style="font-size:12px;color:#374151;">${val(a.display_pool_opening)}</td></tr>`);
          if (val(a.display_opening_add_ons)) rows.push(`<tr><td style="padding:3px 0;color:#9CA3AF;font-size:12px;">Opening Add-ons</td><td style="font-size:12px;color:#374151;">${val(a.display_opening_add_ons)}</td></tr>`);
        }
        if (st.includes('closing')) {
          if (val(a.display_pool_closing)) rows.push(`<tr><td style="padding:3px 0;color:#9CA3AF;font-size:12px;">Closing Package</td><td style="font-size:12px;color:#374151;">${val(a.display_pool_closing)}</td></tr>`);
          if (val(a.display_closing_add_ons)) rows.push(`<tr><td style="padding:3px 0;color:#9CA3AF;font-size:12px;">Closing Add-ons</td><td style="font-size:12px;color:#374151;">${val(a.display_closing_add_ons)}</td></tr>`);
        }
        if (st.includes('maintenance') && val(a.display_pool_maintenance)) {
          rows.push(`<tr><td style="padding:3px 0;color:#9CA3AF;font-size:12px;">Maintenance</td><td style="font-size:12px;color:#374151;">${val(a.display_pool_maintenance)}</td></tr>`);
        }
        if (val(a.admin_note)) rows.push(`<tr><td style="padding:3px 0;color:#9CA3AF;font-size:12px;">Note</td><td style="font-size:12px;color:#92400E;font-style:italic;">${val(a.admin_note)}</td></tr>`);

        return `<div style="background:white;border:1px solid #E5E7EB;border-radius:10px;padding:14px 16px;margin-bottom:8px;">
          <div style="display:flex;align-items:center;margin-bottom:8px;">
            <span style="font-size:11px;font-weight:700;color:#9CA3AF;margin-right:8px;">#${idx + 1}</span>
            <span style="font-size:14px;font-weight:700;color:#111827;">${a.title || a.email}</span>
            ${serviceTypeLabel}
          </div>
          ${rows.length > 0 ? `<table style="width:100%;border-collapse:collapse;">${rows.join('')}</table>` : ''}
        </div>`;
      }).join('');

      return `<div style="margin-bottom:12px;">
        <div style="background:${tc.bg};border:1px solid ${tc.border};border-radius:8px;padding:8px 14px;margin-bottom:8px;display:inline-block;">
          <span style="font-size:12px;font-weight:700;color:${tc.text};text-transform:uppercase;letter-spacing:0.05em;">${group.team}</span>
          <span style="font-size:11px;color:${tc.text};opacity:0.7;margin-left:8px;">${group.assignments.length} job${group.assignments.length !== 1 ? 's' : ''}</span>
        </div>
        ${jobsHtml}
      </div>`;
    }).join('');

    return `<div style="margin-bottom:28px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid #E5E7EB;">
        <h3 style="margin:0;font-size:16px;font-weight:700;color:#111827;">${dayLabel}</h3>
        <span style="font-size:12px;color:#6B7280;background:#F3F4F6;padding:3px 10px;border-radius:20px;">${totalJobs} job${totalJobs !== 1 ? 's' : ''}</span>
      </div>
      ${teamsHtml}
    </div>`;
  }).join('');

  const totalJobs = data.days.reduce((s, d) => s + d.assignments.length, 0);

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Weekly Service Confirmation — ${data.weekLabel}</title></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:680px;margin:24px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:#1D4ED8;padding:28px 32px;">
      <h1 style="color:white;margin:0;font-size:22px;font-weight:700;">Weekly Service Confirmation</h1>
      <p style="color:#BFDBFE;margin:8px 0 0;font-size:14px;font-weight:600;">${data.weekLabel}</p>
      <p style="color:#93C5FD;margin:4px 0 0;font-size:12px;">Sent ${now} by ${data.sentBy}</p>
    </div>
    <div style="background:#EFF6FF;padding:16px 32px;border-bottom:1px solid #DBEAFE;">
      <p style="margin:0;font-size:13px;color:#1E40AF;">
        <strong>${totalJobs} scheduled service${totalJobs !== 1 ? 's' : ''}</strong> across ${sortedDates.length} day${sortedDates.length !== 1 ? 's' : ''}
        &nbsp;·&nbsp; ${data.days.length} team route${data.days.length !== 1 ? 's' : ''}
      </p>
    </div>
    <div style="padding:28px 32px;">
      ${daysHtml}
    </div>
    <div style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:20px 32px;text-align:center;">
      <p style="color:#9CA3AF;font-size:12px;margin:0;">Piscines Novo — Weekly Service Confirmation</p>
      <p style="color:#9CA3AF;font-size:11px;margin:6px 0 0;">This is an automated summary for the week of ${data.weekLabel}</p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Batch rejection email ────────────────────────────────────────────────────

function buildBatchRejectionHtml(bookings: BookingRejectionData[], reason: string, rejectedBy: string): string {
  const now = new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto', dateStyle: 'full', timeStyle: 'short' });

  const rows = bookings.map((b, idx) => {
    const serviceDate = new Date(b.event_date + 'T00:00:00').toLocaleDateString('en-CA', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    });
    return `<div style="background:white;border:1px solid #E5E7EB;border-radius:10px;padding:14px 16px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="font-size:11px;font-weight:700;color:#9CA3AF;">#${idx + 1}</span>
        <span style="font-size:14px;font-weight:700;color:#111827;">${b.client_name}</span>
        <span style="font-size:11px;font-weight:600;background:#EFF6FF;color:#1D4ED8;padding:2px 8px;border-radius:10px;">${b.service_type}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:3px 0;color:#9CA3AF;font-size:12px;width:38%;">Email</td><td style="font-size:12px;color:#374151;">${b.email}</td></tr>
        ${b.client_phone ? `<tr><td style="padding:3px 0;color:#9CA3AF;font-size:12px;">Phone</td><td style="font-size:12px;color:#374151;">${b.client_phone}</td></tr>` : ''}
        ${b.client_address ? `<tr><td style="padding:3px 0;color:#9CA3AF;font-size:12px;">Address</td><td style="font-size:12px;color:#374151;">${b.client_address}</td></tr>` : ''}
        ${b.client_pool_type ? `<tr><td style="padding:3px 0;color:#9CA3AF;font-size:12px;">Pool Type</td><td style="font-size:12px;color:#374151;">${b.client_pool_type}</td></tr>` : ''}
        <tr><td style="padding:3px 0;color:#9CA3AF;font-size:12px;">Requested Date</td><td style="font-size:12px;color:#374151;font-weight:600;">${serviceDate}</td></tr>
        ${b.custom_note ? `<tr><td style="padding:3px 0;color:#9CA3AF;font-size:12px;">Note</td><td style="font-size:12px;color:#6B7280;font-style:italic;">${b.custom_note}</td></tr>` : ''}
      </table>
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${bookings.length} Booking Requests Rejected</title></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:640px;margin:24px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:#DC2626;padding:28px 32px;">
      <h1 style="color:white;margin:0;font-size:20px;font-weight:700;">${bookings.length} Booking Request${bookings.length !== 1 ? 's' : ''} Rejected</h1>
      <p style="color:#FCA5A5;margin:6px 0 0;font-size:13px;">${now}</p>
    </div>
    <div style="padding:28px 32px;">
      <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <p style="font-size:12px;font-weight:700;color:#991B1B;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 6px;">Rejection Reason</p>
        <p style="margin:0;font-size:14px;color:#7F1D1D;line-height:1.6;">${reason}</p>
        <p style="margin:8px 0 0;font-size:12px;color:#B91C1C;">Rejected by: ${rejectedBy}</p>
      </div>
      <h2 style="font-size:14px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 14px;">Rejected Requests (${bookings.length})</h2>
      ${rows}
    </div>
    <div style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:20px 32px;text-align:center;">
      <p style="color:#9CA3AF;font-size:12px;margin:0;">Piscines Novo — Booking Request System</p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Service report helpers ───────────────────────────────────────────────────

function chipListHtml(items: string[]): string {
  if (!items || items.length === 0) return '<p style="color:#9CA3AF;font-size:12px;font-style:italic;">None recorded</p>';
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;">` +
    items.map(item =>
      `<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;background:#EFF6FF;border:1px solid #BFDBFE;color:#1E40AF;font-size:12px;font-weight:500;">&#10003; ${item}</span>`
    ).join('') +
    `</div>`;
}

function swimReadyChecklistHtml(swimReady: Record<string, string[]>): string {
  return SWIM_READY_EMAIL_SUBSECTIONS.map(sub => {
    const items: string[] = swimReady[sub.key] || [];
    if (items.length === 0) return '';
    const isCement = sub.key === 'cement_poo';
    return `<div style="margin-bottom:16px;">
      <p style="font-size:12px;font-weight:700;color:${isCement ? '#92400E' : '#374151'};text-transform:uppercase;letter-spacing:0.06em;margin:0 0 8px;padding:6px 10px;background:${isCement ? '#FEF3C7' : '#F9FAFB'};border-radius:6px;">${sub.title}</p>
      ${chipListHtml(items)}
    </div>`;
  }).join('');
}

function photoBlock(url: string, label: string): string {
  if (!url) return '';
  return `<div style="margin-bottom:16px;">
    <p style="font-size:12px;color:#6B7280;margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">${label}</p>
    <img src="${url}" alt="${label}" style="width:100%;max-width:480px;border-radius:10px;border:1px solid #E5E7EB;" />
  </div>`;
}

function buildSwimReadyNextStepsBlock(poolType?: string): string {
  const link = getSwimReadyLink(poolType);
  return `
  <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:20px;margin-bottom:24px;">
    <h2 style="font-size:14px;font-weight:700;color:#1E40AF;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 10px;">Next Step — Book Your 2nd Visit</h2>
    <p style="margin:0 0 12px;font-size:14px;color:#111827;line-height:1.6;">
      Your pool opening 1st visit is complete! Once your pool is <strong>filled up</strong>, reply to this email to book your 2nd visit and get swim-ready.
    </p>
    <p style="margin:0 0 16px;font-size:13px;color:#374151;line-height:1.6;">
      Read the details below to understand what happens next and what to expect at the 2nd visit.
    </p>
    <div style="display:flex;flex-wrap:wrap;gap:10px;">
      <a href="${link}" style="display:inline-block;background:#1D4ED8;color:white;font-size:13px;font-weight:600;padding:10px 20px;border-radius:8px;text-decoration:none;">
        Read Details &rarr;
      </a>
      <a href="mailto:services@novopiscines.ca?subject=Book%202nd%20Visit" style="display:inline-block;background:white;color:#1D4ED8;font-size:13px;font-weight:600;padding:10px 20px;border-radius:8px;text-decoration:none;border:2px solid #1D4ED8;">
        Reply to Book 2nd Visit
      </a>
    </div>
  </div>`;
}

function formatTechName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function buildTechDisplay(payload: EmailPayload, forClient: boolean): string {
  const names = payload.technicianNames && payload.technicianNames.length > 0
    ? payload.technicianNames
    : (payload.techName ? [payload.techName] : []);
  if (names.length === 0) return '';
  const formatted = names.map(formatTechName);
  if (forClient) return formatted.join(', ');
  return names.join(', '); // admin sees full names
}

function buildClosingChecklistHtml(allItems: string[], doneItems: string[], forClient: boolean): string {
  if (!allItems || allItems.length === 0) return '';
  const done = new Set(doneItems || []);
  const rows = allItems.map(item => {
    const isDone = done.has(item);
    if (forClient) {
      return `<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid #F3F4F6;">
        <span style="flex-shrink:0;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;${isDone ? 'background:#DCFCE7;color:#16A34A;' : 'background:#FEE2E2;color:#DC2626;'}">${isDone ? '&#10003;' : '&#10007;'}</span>
        <span style="font-size:13px;color:${isDone ? '#374151' : '#6B7280'};line-height:1.5;${isDone ? '' : 'text-decoration:line-through;opacity:0.7;'}">${item}</span>
      </div>`;
    }
    return `<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid #F3F4F6;">
      <span style="flex-shrink:0;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;${isDone ? 'background:#DCFCE7;color:#16A34A;' : 'background:#FEE2E2;color:#DC2626;'}">${isDone ? '&#10003;' : '&#10007;'}</span>
      <span style="font-size:13px;color:${isDone ? '#374151' : '#6B7280'};line-height:1.5;${isDone ? '' : 'text-decoration:line-through;opacity:0.7;'}">${item}</span>
    </div>`;
  }).join('');
  return `<div style="background:#F9FAFB;border-radius:12px;padding:16px 20px;margin-bottom:24px;">${rows}</div>`;
}

const REVIEW_LINK = "https://g.page/r/CdFTMUDvEQ1EEAE/review";

function buildReviewBlockEn(techFirstName: string): string {
  return `
  <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:24px;margin-top:24px;">
    <h2 style="font-size:16px;font-weight:700;color:#1E40AF;margin:0 0 10px;">Are you happy with my work?</h2>
    <p style="margin:0 0 14px;font-size:14px;color:#374151;line-height:1.6;">
      Hi, ${techFirstName} here again. If you have a minute, leaving a quick Google review really means a lot to me. It helps other pool owners find Piscines Novo, and it directly supports me — our technicians can earn performance bonuses of up to $300 per customer based on client feedback. Your kind words truly make a difference for the person who just closed your pool.
    </p>
    <a href="${REVIEW_LINK}" style="display:inline-block;background:#1D4ED8;color:white;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">
      Share your experience on Google &rarr;
    </a>
  </div>`;
}

function buildReviewBlockFr(techFirstName: string): string {
  return `
  <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:24px;margin-top:24px;">
    <h2 style="font-size:16px;font-weight:700;color:#1E40AF;margin:0 0 10px;">Êtes-vous satisfait de mon travail ?</h2>
    <p style="margin:0 0 14px;font-size:14px;color:#374151;line-height:1.6;">
      Salut, c'est ${techFirstName} encore. Si vous avez une minute, laisser un petit avis Google veut vraiment dire beaucoup pour moi. Ça aide d'autres propriétaires de piscines à trouver Piscines Novo, et ça me soutient directement — nos techniciens peuvent gagner des bonis de performance allant jusqu'à 300 $ par client selon les commentaires des clients. Vos mots gentils font vraiment une différence pour la personne qui vient de fermer votre piscine.
    </p>
    <a href="${REVIEW_LINK}" style="display:inline-block;background:#1D4ED8;color:white;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">
      Partagez votre expérience sur Google &rarr;
    </a>
  </div>`;
}

function buildAddOnsBlock(addOns: string[], qtyParts: string[]): string {
  if (addOns.length === 0) return '';
  return `<div style="margin-bottom:24px;">
    ${addOns.map((a: string) => `<span style="display:inline-block;background:#EFF6FF;color:#1D4ED8;border-radius:20px;padding:4px 12px;font-size:12px;font-weight:600;margin:3px;">${a}</span>`).join('')}
    ${qtyParts.length > 0 ? `<p style="margin:10px 0 0;font-size:13px;color:#374151;font-weight:600;">${qtyParts.join(' · ')}</p>` : ''}
  </div>`;
}

function buildNotesBlock(notes: string, fontSize: string): string {
  if (!notes) return '';
  return `<div style="background:#FEF3C7;border-left:4px solid #F59E0B;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:24px;">
    <p style="margin:0;font-size:${fontSize};color:#92400E;line-height:1.6;">${notes.replace(/\n/g, '<br/>')}</p>
  </div>`;
}

function buildClosingClientHtml(payload: EmailPayload): string {
  const { client, draft, photoUrls, reportId } = payload;
  if (!draft || !photoUrls) return '';
  const clientFirst = client?.first_name || 'there';
  const clientName = client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() : 'Client';
  const now = new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto', dateStyle: 'full', timeStyle: 'short' });

  const techDisplay = buildTechDisplay(payload, true);
  const techFirstName = techDisplay ? techDisplay.split(' ')[0] : 'your technician';

  const closingAll = (draft.closingChecklistAll as string[]) || [];
  const closingDone = (draft.closingChecklist as string[]) || [];

  const addOns = (draft.closingAddOns as string[]) || [];
  const qtyParts: string[] = [];
  if (addOns.includes('Return Plug') && draft.returnPlugQty) qtyParts.push(`Return Plugs: ${draft.returnPlugQty}`);
  if (addOns.includes('Gizmo') && draft.gizmoQty) qtyParts.push(`Gizmos: ${draft.gizmoQty}`);
  if (addOns.includes('Yellow Cover Picks') && draft.yellowCoverPicksQty) qtyParts.push(`Yellow Cover Picks: ${draft.yellowCoverPicksQty}`);

  const photoSection = (photoUrls.areaUrl || photoUrls.equipUrl || photoUrls.extraUrl || photoUrls.removedPartsUrl)
    ? `<div style="margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:700;color:#374151;margin:0 0 16px;">Photos from your closing</h2>
        ${photoBlock(photoUrls.areaUrl, 'Pool Area')}
        ${photoBlock(photoUrls.equipUrl, 'Pool Equipment')}
        ${photoBlock(photoUrls.extraUrl, 'Extra')}
        ${photoBlock(photoUrls.removedPartsUrl || '', 'Removed Parts & Storage')}
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Pool Closing Report — ${clientName}</title></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:24px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:#0F766E;padding:28px 32px;">
      <h1 style="color:white;margin:0;font-size:22px;font-weight:700;">Pool Closing Report</h1>
      <p style="color:#99F6E4;margin:8px 0 0;font-size:14px;">${now}</p>
    </div>
    <div style="padding:28px 32px;">
      <p style="font-size:16px;color:#374151;line-height:1.7;margin:0 0 20px;">
        Hi ${clientFirst},<br/><br/>
        ${techFirstName} here. I just finished closing your pool for the season and wanted to walk you through everything I did today. Here's a detailed summary of the work completed at your property on ${draft.serviceDate}.
      </p>

      <div style="background:#F9FAFB;border-radius:12px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:4px 0;color:#6B7280;font-size:13px;width:40%;">Client</td><td style="font-size:13px;font-weight:600;color:#111827;">${clientName}</td></tr>
          <tr><td style="padding:4px 0;color:#6B7280;font-size:13px;">Address</td><td style="font-size:13px;color:#111827;">${client?.address || '—'}${client?.city ? ', ' + client.city : ''}</td></tr>
          <tr><td style="padding:4px 0;color:#6B7280;font-size:13px;">Pool Type</td><td style="font-size:13px;color:#111827;">${client?.pool_type || '—'}</td></tr>
          <tr><td style="padding:4px 0;color:#6B7280;font-size:13px;">Service Date</td><td style="font-size:13px;font-weight:600;color:#111827;">${draft.serviceDate}</td></tr>
          <tr><td style="padding:4px 0;color:#6B7280;font-size:13px;">Technician(s)</td><td style="font-size:13px;color:#111827;">${techDisplay}</td></tr>
          ${draft.completedTime ? `<tr><td style="padding:4px 0;color:#6B7280;font-size:13px;">Completed At</td><td style="font-size:13px;font-weight:600;color:#0F766E;">${draft.completedTime}</td></tr>` : ''}
        </table>
      </div>

      ${addOns.length > 0 ? `<h2 style="font-size:16px;font-weight:700;color:#374151;margin:0 0 12px;">Add-ons completed</h2>${buildAddOnsBlock(addOns, qtyParts)}` : ''}

      ${draft.technicianNotes ? `<h2 style="font-size:16px;font-weight:700;color:#374151;margin:0 0 12px;">Notes from ${techFirstName}</h2>${buildNotesBlock(draft.technicianNotes as string, '14px')}` : ''}

      ${closingAll.length > 0 ? `
      <h2 style="font-size:16px;font-weight:700;color:#374151;margin:0 0 8px;">What was done today</h2>
      <p style="font-size:13px;color:#6B7280;margin:0 0 12px;">Here's the full closing checklist. Items marked with a green check were completed, and any items that weren't done are clearly marked.</p>
      ${buildClosingChecklistHtml(closingAll, closingDone, true)}
      ` : ''}

      ${photoUrls.removedPartsUrl ? `
      <h2 style="font-size:16px;font-weight:700;color:#374151;margin:0 0 8px;">Removed parts & storage</h2>
      <p style="font-size:13px;color:#6B7280;margin:0 0 12px;">Here's where your removed parts were stored for the winter:</p>
      ${photoBlock(photoUrls.removedPartsUrl, 'Removed Parts / Storage')}
      ` : ''}

      ${photoSection}

      <div style="background:#F0FDFA;border:1px solid #99F6E4;border-radius:12px;padding:20px;margin-bottom:24px;">
        <h2 style="font-size:15px;font-weight:700;color:#0F766E;margin:0 0 8px;">Questions about your closing?</h2>
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">
          If you usually do something differently, or if you have any questions about anything in this report, just reply to this email and we'll be happy to help.
        </p>
      </div>

      ${buildReviewBlockEn(techFirstName)}
    </div>
    <div style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:20px 32px;text-align:center;">
      <p style="color:#9CA3AF;font-size:12px;margin:0;">Piscines Novo — Pool Service</p>
      <p style="color:#9CA3AF;font-size:11px;margin:6px 0 0;">Report ID: ${reportId || ''}</p>
    </div>
  </div>
</body>
</html>`;
}

function buildClosingClientHtmlFr(payload: EmailPayload): string {
  const { client, draft, photoUrls, reportId } = payload;
  if (!draft || !photoUrls) return '';
  const clientFirst = client?.first_name || '';
  const clientName = client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() : 'Client';
  const now = new Date().toLocaleString('fr-CA', { timeZone: 'America/Toronto', dateStyle: 'full', timeStyle: 'short' });

  const techDisplay = buildTechDisplay(payload, true);
  const techFirstName = techDisplay ? techDisplay.split(' ')[0] : 'votre technicien';

  const closingAll = (draft.closingChecklistAll as string[]) || [];
  const closingDone = (draft.closingChecklist as string[]) || [];

  const addOns = (draft.closingAddOns as string[]) || [];
  const qtyParts: string[] = [];
  if (addOns.includes('Return Plug') && draft.returnPlugQty) qtyParts.push(`Bouchons de retour: ${draft.returnPlugQty}`);
  if (addOns.includes('Gizmo') && draft.gizmoQty) qtyParts.push(`Gizmos: ${draft.gizmoQty}`);
  if (addOns.includes('Yellow Cover Picks') && draft.yellowCoverPicksQty) qtyParts.push(`Piquets de couverture jaune: ${draft.yellowCoverPicksQty}`);

  const photoSection = (photoUrls.areaUrl || photoUrls.equipUrl || photoUrls.extraUrl || photoUrls.removedPartsUrl)
    ? `<div style="margin-bottom:24px;">
        <h2 style="font-size:16px;font-weight:700;color:#374151;margin:0 0 16px;">Photos de votre fermeture</h2>
        ${photoBlock(photoUrls.areaUrl, 'Zone de la piscine')}
        ${photoBlock(photoUrls.equipUrl, 'Équipement de la piscine')}
        ${photoBlock(photoUrls.extraUrl, 'Supplémentaire')}
        ${photoBlock(photoUrls.removedPartsUrl || '', 'Pièces retirées et entreposage')}
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Rapport de fermeture — ${clientName}</title></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:24px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:#0F766E;padding:28px 32px;">
      <h1 style="color:white;margin:0;font-size:22px;font-weight:700;">Rapport de fermeture de piscine</h1>
      <p style="color:#99F6E4;margin:8px 0 0;font-size:14px;">${now}</p>
    </div>
    <div style="padding:28px 32px;">
      <p style="font-size:16px;color:#374151;line-height:1.7;margin:0 0 20px;">
        Bonjour ${clientFirst},<br/><br/>
        C'est ${techFirstName}. Je viens de terminer la fermeture de votre piscine pour la saison et je voulais vous expliquer tout ce que j'ai fait aujourd'hui. Voici un résumé détaillé des travaux effectués à votre propriété le ${draft.serviceDate}.
      </p>

      <div style="background:#F9FAFB;border-radius:12px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:4px 0;color:#6B7280;font-size:13px;width:40%;">Client</td><td style="font-size:13px;font-weight:600;color:#111827;">${clientName}</td></tr>
          <tr><td style="padding:4px 0;color:#6B7280;font-size:13px;">Adresse</td><td style="font-size:13px;color:#111827;">${client?.address || '—'}${client?.city ? ', ' + client.city : ''}</td></tr>
          <tr><td style="padding:4px 0;color:#6B7280;font-size:13px;">Type de piscine</td><td style="font-size:13px;color:#111827;">${client?.pool_type || '—'}</td></tr>
          <tr><td style="padding:4px 0;color:#6B7280;font-size:13px;">Date du service</td><td style="font-size:13px;font-weight:600;color:#111827;">${draft.serviceDate}</td></tr>
          <tr><td style="padding:4px 0;color:#6B7280;font-size:13px;">Technicien(s)</td><td style="font-size:13px;color:#111827;">${techDisplay}</td></tr>
          ${draft.completedTime ? `<tr><td style="padding:4px 0;color:#6B7280;font-size:13px;">Terminé à</td><td style="font-size:13px;font-weight:600;color:#0F766E;">${draft.completedTime}</td></tr>` : ''}
        </table>
      </div>

      ${addOns.length > 0 ? `<h2 style="font-size:16px;font-weight:700;color:#374151;margin:0 0 12px;">Options complétées</h2>${buildAddOnsBlock(addOns, qtyParts)}` : ''}

      ${draft.technicianNotes ? `<h2 style="font-size:16px;font-weight:700;color:#374151;margin:0 0 12px;">Notes de ${techFirstName}</h2>${buildNotesBlock(draft.technicianNotes as string, '14px')}` : ''}

      ${closingAll.length > 0 ? `
      <h2 style="font-size:16px;font-weight:700;color:#374151;margin:0 0 8px;">Ce qui a été fait aujourd'hui</h2>
      <p style="font-size:13px;color:#6B7280;margin:0 0 12px;">Voici la liste de fermeture complète. Les éléments marqués d'une coche verte ont été complétés, et ceux qui n'ont pas été faits sont clairement indiqués.</p>
      ${buildClosingChecklistHtml(closingAll, closingDone, true)}
      ` : ''}

      ${photoUrls.removedPartsUrl ? `
      <h2 style="font-size:16px;font-weight:700;color:#374151;margin:0 0 8px;">Pièces retirées et entreposage</h2>
      <p style="font-size:13px;color:#6B7280;margin:0 0 12px;">Voici où vos pièces retirées ont été entreposées pour l'hiver :</p>
      ${photoBlock(photoUrls.removedPartsUrl, 'Pièces retirées et entreposage')}
      ` : ''}

      ${photoSection}

      <div style="background:#F0FDFA;border:1px solid #99F6E4;border-radius:12px;padding:20px;margin-bottom:24px;">
        <h2 style="font-size:15px;font-weight:700;color:#0F766E;margin:0 0 8px;">Questions sur votre fermeture ?</h2>
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">
          Si vous faites habituellement les choses différemment, ou si vous avez des questions sur quoi que ce soit dans ce rapport, répondez simplement à ce courriel et nous serons heureux de vous aider.
        </p>
      </div>

      ${buildReviewBlockFr(techFirstName)}
    </div>
    <div style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:20px 32px;text-align:center;">
      <p style="color:#9CA3AF;font-size:12px;margin:0;">Piscines Novo — Service de piscine</p>
      <p style="color:#9CA3AF;font-size:11px;margin:6px 0 0;">Report ID: ${reportId || ''}</p>
    </div>
  </div>
</body>
</html>`;
}

function buildReportHtml(payload: EmailPayload, forClient = false): string {
  const { client, draft, photoUrls, reportId } = payload;
  if (!draft || !photoUrls) return '';
  const clientName = client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() : 'Unknown';
  const now = new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto', dateStyle: 'full', timeStyle: 'short' });

  const isSwimReady1stVisit =
    draft.serviceType === 'Pool Opening' &&
    (draft.openingType === 'Swim-Ready 1st Visit' || draft.openingType === 'Swim Ready 1st Visit');

  const techDisplay = buildTechDisplay(payload, forClient);

  const headerColor = '#1D4ED8';
  const greeting = forClient
    ? `<p style="color:#BFDBFE;margin:6px 0 0;font-size:14px;">Hello ${client?.first_name || clientName}, here is your service report.</p>`
    : '';

  // Invoice note shown only to client
  const invoiceBlock = forClient ? `
  <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
    <p style="font-size:13px;font-weight:700;color:#92400E;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 6px;">Invoice</p>
    <p style="margin:0;font-size:14px;color:#78350F;line-height:1.6;">An invoice will be sent to you shortly.</p>
  </div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Service Report — ${clientName}</title></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:24px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:${headerColor};padding:28px 32px;">
      <h1 style="color:white;margin:0;font-size:20px;font-weight:700;">Pool Service Report</h1>
      ${greeting}
      <p style="color:#93C5FD;margin:6px 0 0;font-size:13px;">${now}</p>
    </div>
    <div style="padding:28px 32px;">
      ${invoiceBlock}
      ${isSwimReady1stVisit ? buildSwimReadyNextStepsBlock(client?.pool_type) : ''}
      <div style="background:#F9FAFB;border-radius:12px;padding:20px;margin-bottom:24px;">
        <h2 style="font-size:14px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 16px;">Summary</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:4px 0;color:#6B7280;font-size:13px;width:40%;">Client</td><td style="font-size:13px;font-weight:600;color:#111827;">${clientName}</td></tr>
          ${!forClient ? `<tr><td style="padding:4px 0;color:#6B7280;font-size:13px;">Email</td><td style="font-size:13px;color:#111827;">${client?.email || '—'}</td></tr>` : ''}
          ${!forClient ? `<tr><td style="padding:4px 0;color:#6B7280;font-size:13px;">Phone</td><td style="font-size:13px;color:#111827;">${client?.phone || '—'}</td></tr>` : ''}
          <tr><td style="padding:4px 0;color:#6B7280;font-size:13px;">Address</td><td style="font-size:13px;color:#111827;">${client?.address || '—'}${client?.city ? ', ' + client.city : ''}</td></tr>
          <tr><td style="padding:4px 0;color:#6B7280;font-size:13px;">Pool Type</td><td style="font-size:13px;color:#111827;">${client?.pool_type || '—'}</td></tr>
          <tr><td style="padding:4px 0;color:#6B7280;font-size:13px;">Service Date</td><td style="font-size:13px;font-weight:600;color:#111827;">${draft.serviceDate}</td></tr>
          <tr><td style="padding:4px 0;color:#6B7280;font-size:13px;">Service Type</td><td style="font-size:13px;font-weight:600;color:#1D4ED8;">${draft.serviceType}</td></tr>
          ${draft.openingType ? `<tr><td style="padding:4px 0;color:#6B7280;font-size:13px;">Opening Type</td><td style="font-size:13px;color:#111827;">${draft.openingType}</td></tr>` : ''}
          <tr><td style="padding:4px 0;color:#6B7280;font-size:13px;">Technician(s)</td><td style="font-size:13px;color:#111827;">${techDisplay}</td></tr>
          ${!forClient ? `<tr><td style="padding:4px 0;color:#6B7280;font-size:13px;">Cash Payment</td><td style="font-size:13px;color:${draft.clientPaidCash ? '#16A34A' : '#6B7280'};">${draft.clientPaidCash ? `&#10003; Yes${draft.cashAmount ? ' — $' + draft.cashAmount : ''}` : 'No'}</td></tr>` : ''}
          ${draft.completedTime ? `<tr><td style="padding:4px 0;color:#6B7280;font-size:13px;">Completed Time</td><td style="font-size:13px;font-weight:700;color:#1D4ED8;">${draft.completedTime}</td></tr>` : ''}
        </table>
      </div>
      ${draft.openingAddOns?.length ? `<div style="margin-bottom:24px;"><h2 style="font-size:14px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 12px;">Opening Add-ons</h2>${(draft.openingAddOns as string[]).map((a: string) => `<span style="display:inline-block;background:#EFF6FF;color:#1D4ED8;border-radius:20px;padding:4px 12px;font-size:12px;font-weight:600;margin:3px;">${a}</span>`).join('')}</div>` : ''}
      ${(() => {
        const addOns = (draft.closingAddOns as string[]) || [];
        if (addOns.length === 0) return '';
        const qtyParts: string[] = [];
        if (addOns.includes('Return Plug') && draft.returnPlugQty) qtyParts.push(`Return Plugs: ${draft.returnPlugQty}`);
        if (addOns.includes('Gizmo') && draft.gizmoQty) qtyParts.push(`Gizmos: ${draft.gizmoQty}`);
        if (addOns.includes('Yellow Cover Picks') && draft.yellowCoverPicksQty) qtyParts.push(`Yellow Cover Picks: ${draft.yellowCoverPicksQty}`);
        const qtyRow = qtyParts.length > 0
          ? `<p style="margin:10px 0 0;font-size:13px;color:#374151;font-weight:600;">${qtyParts.join(' · ')}</p>`
          : '';
        return `<div style="margin-bottom:24px;"><h2 style="font-size:14px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 12px;">Pool Closing Add-ons</h2>${addOns.map((a: string) => `<span style="display:inline-block;background:#EFF6FF;color:#1D4ED8;border-radius:20px;padding:4px 12px;font-size:12px;font-weight:600;margin:3px;">${a}</span>`).join('')}${qtyRow}</div>`;
      })()}
      ${draft.serviceType === 'Pool Opening' && draft.openingType === 'Swim Ready' && draft.swimReadyChecklist ? `<div style="margin-bottom:24px;"><h2 style="font-size:14px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 16px;">Swim-Ready Checklist</h2>${swimReadyChecklistHtml(draft.swimReadyChecklist as Record<string, string[]>)}</div>` : ''}
      ${draft.serviceType === 'Pool Closing' && draft.closingChecklistAll && (draft.closingChecklistAll as string[]).length > 0 ? `<div style="margin-bottom:24px;"><h2 style="font-size:14px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 12px;">Closing Checklist (Done / Not Done)</h2>${buildClosingChecklistHtml(draft.closingChecklistAll as string[], (draft.closingChecklist as string[]) || [], false)}</div>` : ''}
      ${draft.technicianNotes ? `<div style="margin-bottom:24px;"><h2 style="font-size:14px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 12px;">Technician Notes</h2><div style="background:#FEF3C7;border-left:4px solid #F59E0B;border-radius:0 8px 8px 0;padding:14px 16px;"><p style="margin:0;font-size:13px;color:#92400E;line-height:1.5;">${(draft.technicianNotes as string).replace(/\n/g, '<br/>')}</p></div></div>` : ''}
      ${(!draft.swimReadyChecklist || draft.serviceType !== 'Pool Opening' || draft.openingType !== 'Swim Ready') && draft.finalInspection?.length ? `<div style="margin-bottom:24px;"><h2 style="font-size:14px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 12px;">Final Inspection</h2>${chipListHtml(draft.finalInspection as string[])}</div>` : ''}
      ${(!draft.swimReadyChecklist || draft.serviceType !== 'Pool Opening' || draft.openingType !== 'Swim Ready') && draft.marketing?.length ? `<div style="margin-bottom:24px;"><h2 style="font-size:14px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 12px;">Client Follow-Up</h2>${chipListHtml(draft.marketing as string[])}</div>` : ''}
      ${(photoUrls.areaUrl || photoUrls.equipUrl || photoUrls.extraUrl || photoUrls.removedPartsUrl) ? `<div style="margin-bottom:24px;"><h2 style="font-size:14px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 16px;">Photos</h2>${photoBlock(photoUrls.areaUrl, 'Pool Area')}${photoBlock(photoUrls.equipUrl, 'Pool Equipment')}${photoBlock(photoUrls.extraUrl, 'Extra')}${photoBlock(photoUrls.removedPartsUrl || '', 'Removed Parts / Storage')}</div>` : ''}
    </div>
    <div style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:20px 32px;text-align:center;">
      <p style="color:#9CA3AF;font-size:12px;margin:0;">Piscines Novo — Pool Service</p>
      <p style="color:#9CA3AF;font-size:11px;margin:6px 0 0;">Report ID: ${reportId || ''}</p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_KEY) {
      return new Response(JSON.stringify({ error: "Resend API key not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json() as EmailPayload;
    const emailType = payload.type || 'report';

    // For report emails, collect all recipients and send once with both in `to`
    if (emailType === 'rejection' && payload.booking) {
      const b = payload.booking;
      const subject = `Booking Rejected — ${b.client_name} — ${b.service_type} — ${b.event_date}`;
      const html = buildRejectionHtml(b);
      await sendEmail(RESEND_KEY, { to: [ADMIN_EMAIL], subject, html, cc: ["services@novopiscines.ca"] });

    } else if (emailType === 'rejection_batch' && payload.bookings?.length) {
      const count = payload.bookings.length;
      const reason = payload.reason || 'No reason provided';
      const subject = `${count} Booking Request${count !== 1 ? 's' : ''} Rejected — ${reason.slice(0, 60)}`;
      const html = buildBatchRejectionHtml(payload.bookings, reason, payload.rejected_by || '');
      await sendEmail(RESEND_KEY, { to: [ADMIN_EMAIL], subject, html, cc: ["services@novopiscines.ca"] });

    } else if (emailType === 'weekly_confirmation' && payload.weekSummary) {
      const ws = payload.weekSummary;
      const subject = `Weekly Service Confirmation — ${ws.weekLabel}`;
      const html = buildWeeklyHtml(ws);
      await sendEmail(RESEND_KEY, { to: [ADMIN_EMAIL], subject, html, cc: ["services@novopiscines.ca"] });

    } else {
      // Service report
      const { client, draft } = payload;
      const clientName = client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() : 'Client';
      const isClosing = draft?.serviceType === 'Pool Closing';
      const subject = isClosing
        ? `Piscines Novo — Pool Closing Report — ${clientName} — ${draft?.serviceDate}`
        : `Piscines Novo — Service Report — ${clientName} — ${draft?.serviceDate}`;
      const subjectFr = `Piscines Novo — Rapport de fermeture — ${clientName} — ${draft?.serviceDate}`;

      const clientEmail = client?.email?.trim();

      if (isClosing) {
        // Pool Closing: send only to client (EN + FR), CC services — no admin copy
        if (clientEmail && clientEmail !== ADMIN_EMAIL) {
          await sendEmail(RESEND_KEY, { to: [clientEmail], subject, html: buildClosingClientHtml(payload), cc: ["services@novopiscines.ca"] });
          await sendEmail(RESEND_KEY, { to: [clientEmail], subject: subjectFr, html: buildClosingClientHtmlFr(payload), cc: ["services@novopiscines.ca"] });
        }
      } else {
        // All other service types: admin gets internal copy, client gets standard copy
        await sendEmail(RESEND_KEY, { to: [ADMIN_EMAIL], subject, html: buildReportHtml(payload, false) });
        if (clientEmail && clientEmail !== ADMIN_EMAIL) {
          await sendEmail(RESEND_KEY, { to: [clientEmail], subject, html: buildReportHtml(payload, true), cc: ["services@novopiscines.ca"] });
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: "Internal error", details: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function sendEmail(
  apiKey: string,
  opts: { to: string[]; subject: string; html: string; cc?: string[] }
): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: opts.to,
      ...(opts.cc ? { cc: opts.cc } : {}),
      reply_to: REPLY_TO,
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}
