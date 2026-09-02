import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FROM_ADDRESS = "Piscines Novo <services@novopiscines.ca>";
const REPLY_TO = "services@novopiscines.ca";
const CANCEL_EMAIL = "services@novopiscines.ca";

interface ReminderPayload {
  clientEmail: string;
  clientFirstName?: string;
  clientName: string;
  serviceType: string;
  serviceDate: string;       // YYYY-MM-DD
  address?: string;
  poolType?: string;
  openingPackage?: string;
  openingAddOns?: string;
  closingPackage?: string;
  closingAddOns?: string;
  maintenancePackage?: string;
  adminNote?: string;
  assignmentId?: string;
}

function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-CA", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

// Build a mailto: URI for the cancellation button with prefilled body
function buildCancelMailto(p: ReminderPayload): string {
  const subject = encodeURIComponent("Cancel or Reschedule Request");
  const body = encodeURIComponent(
    `Hello Piscines Novo,\n\nI would like to cancel or reschedule my upcoming service.\n\nClient Name: ${p.clientName}\nService Date: ${formatDate(p.serviceDate)}\nService Type: ${p.serviceType}\nProperty Address: ${p.address || "—"}\n\nPlease confirm once the change has been made.\n\nThank you.`
  );
  return `mailto:${CANCEL_EMAIL}?subject=${subject}&body=${body}`;
}

// Service-type-specific preparation rows
function serviceInfoBlock(p: ReminderPayload): string {
  const st = (p.serviceType || "").toLowerCase();
  const rows: string[] = [];

  if (p.address) rows.push(row("Address", p.address));
  if (p.poolType) rows.push(row("Pool Type", p.poolType));

  if (st.includes("opening") && !st.includes("2nd")) {
    if (p.openingPackage) rows.push(row("Opening Package", p.openingPackage));
    if (p.openingAddOns) rows.push(row("Add-ons", p.openingAddOns));
    rows.push(infoNote("Please ensure your pool cover is accessible and the backyard gate is unlocked."));
  } else if (st.includes("2nd visit") || st.includes("2nd")) {
    rows.push(infoNote("Please ensure your pool is filled to the correct water level and the backyard gate is unlocked for the 2nd visit."));
  } else if (st.includes("closing")) {
    if (p.closingPackage) rows.push(row("Closing Package", p.closingPackage));
    if (p.closingAddOns) rows.push(row("Add-ons", p.closingAddOns));
    rows.push(infoNote("Please ensure all pool accessories are accessible and the water level is correct before our arrival."));
  } else if (st.includes("maintenance")) {
    if (p.maintenancePackage) rows.push(row("Maintenance Package", p.maintenancePackage));
    rows.push(infoNote("Please ensure backyard access is available and any pets are secured."));
  } else if (st.includes("liner")) {
    rows.push(infoNote("Our team will contact you shortly with preparation instructions."));
  } else if (st.includes("leak") || st.includes("pressure")) {
    rows.push(infoNote("Please ensure the equipment area is accessible and the pool is at normal water level."));
  } else if (st.includes("service call")) {
    rows.push(infoNote("Please have a description of the issue ready for our technician."));
  }

  if (p.adminNote) rows.push(row("Note from Piscines Novo", p.adminNote));

  return rows.join("");
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;color:#6B7280;font-size:13px;width:42%;vertical-align:top;">${label}</td>
    <td style="padding:6px 0;font-size:13px;font-weight:600;color:#111827;">${value}</td>
  </tr>`;
}

function infoNote(msg: string): string {
  return `</table>
  <div style="background:#EFF6FF;border-left:4px solid #3B82F6;border-radius:0 8px 8px 0;padding:12px 14px;margin:12px 0;">
    <p style="margin:0;font-size:13px;color:#1E40AF;line-height:1.5;">${msg}</p>
  </div>
  <table style="width:100%;border-collapse:collapse;">`;
}

function buildReminderHtml(p: ReminderPayload): string {
  const now = new Date().toLocaleString("en-CA", {
    timeZone: "America/Toronto", dateStyle: "full", timeStyle: "short",
  });
  const greeting = p.clientFirstName ? `Hello ${p.clientFirstName},` : `Hello ${p.clientName},`;
  const dateFormatted = formatDate(p.serviceDate);
  const cancelMailto = buildCancelMailto(p);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Service Reminder — ${p.serviceType}</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:580px;margin:24px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#1D4ED8;padding:28px 32px;">
      <h1 style="color:white;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Service Reminder</h1>
      <p style="color:#93C5FD;margin:6px 0 0;font-size:13px;">${now}</p>
    </div>

    <div style="padding:28px 32px;">

      <!-- Greeting -->
      <p style="font-size:16px;color:#111827;margin:0 0 8px;font-weight:600;">${greeting}</p>
      <p style="font-size:14px;color:#374151;margin:0 0 16px;line-height:1.7;">
        This is a friendly reminder that you have a <strong>${p.serviceType}</strong> scheduled with Piscines Novo on
        <strong style="color:#1D4ED8;">${dateFormatted}</strong>.
      </p>

      <!-- Review previous email notice -->
      <div style="background:#F0F9FF;border:1px solid #BAE6FD;border-left:4px solid #0284C7;border-radius:0 12px 12px 0;padding:14px 18px;margin-bottom:20px;">
        <p style="margin:0;font-size:14px;color:#0C4A6E;line-height:1.7;">
          <strong>Please review the service confirmation email we sent you earlier</strong> — it contains important details about your upcoming service, including preparation instructions, what to expect, and payment information.
        </p>
      </div>

      <!-- Payment -->
      <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <p style="font-size:12px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 5px;">Payment</p>
        <p style="margin:0;font-size:14px;color:#15803D;line-height:1.6;">Payment is by <strong>e-transfer only</strong> to <strong>depot@novopiscines.ca</strong></p>
      </div>

      <!-- Service Details -->
      <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:20px;margin-bottom:20px;">
        <h2 style="font-size:12px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 14px;">Service Details</h2>
        <table style="width:100%;border-collapse:collapse;">
          ${row("Service", p.serviceType)}
          ${row("Date", dateFormatted)}
          ${serviceInfoBlock(p)}
        </table>
      </div>

      <!-- Cancel / Reschedule Policy -->
      <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;padding:20px;margin-bottom:20px;">
        <h2 style="font-size:12px;font-weight:700;color:#92400E;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 10px;">Need to Cancel or Reschedule?</h2>
        <p style="margin:0 0 10px;font-size:14px;color:#78350F;line-height:1.7;">
          To cancel or reschedule your service, please reply directly to this email at
          <strong>services@novopiscines.ca</strong>.
        </p>
        <p style="margin:0 0 16px;font-size:13px;color:#92400E;line-height:1.6;background:#FEF3C7;border-radius:8px;padding:10px 14px;">
          <strong>Important:</strong> If our technician is dispatched to the property and the appointment was not
          cancelled via email beforehand, a <strong>$75 travel fee</strong> will apply.
        </p>
        <a href="${cancelMailto}"
           style="display:inline-block;background:#EA580C;color:white;font-size:13px;font-weight:700;padding:11px 22px;border-radius:9px;text-decoration:none;letter-spacing:0.01em;">
          Cancel / Reschedule
        </a>
      </div>

      <!-- Questions -->
      <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:16px 20px;">
        <p style="font-size:12px;font-weight:700;color:#1E40AF;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 6px;">Questions?</p>
        <p style="margin:0 0 12px;font-size:14px;color:#1D4ED8;line-height:1.6;">
          Reply to this email or reach us at <strong>services@novopiscines.ca</strong>
        </p>
        <a href="mailto:${CANCEL_EMAIL}"
           style="display:inline-block;background:#1D4ED8;color:white;font-size:13px;font-weight:600;padding:9px 20px;border-radius:8px;text-decoration:none;">
          Reply to this email
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:18px 32px;text-align:center;">
      <p style="color:#9CA3AF;font-size:12px;margin:0;">Piscines Novo — Pool Service</p>
      <p style="color:#D1D5DB;font-size:11px;margin:4px 0 0;">${now}</p>
    </div>

  </div>
</body>
</html>`;
}

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

    const p = await req.json() as ReminderPayload;

    if (!p.clientEmail) {
      return new Response(JSON.stringify({ error: "clientEmail is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dateFormatted = formatDate(p.serviceDate);
    const subject = `Piscines Novo — Reminder: ${p.serviceType} on ${dateFormatted}`;
    const html = buildReminderHtml(p);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [p.clientEmail],
        cc: ["services@novopiscines.ca"],
        reply_to: REPLY_TO,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend error ${res.status}: ${body}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("send-reminder-email error:", err);
    return new Response(JSON.stringify({ error: "Internal error", details: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
