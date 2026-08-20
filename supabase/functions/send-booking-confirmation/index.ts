import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FROM_ADDRESS = "Piscines Novo <services@novopiscines.ca>";
const REPLY_TO = "services@novopiscines.ca";
const CC_ADDRESS = "services@novopiscines.ca";

interface ConfirmationPayload {
  clientEmail: string;
  clientName: string;
  clientFirstName?: string;
  serviceType: string;
  serviceDate: string;        // YYYY-MM-DD
  address?: string;
  poolType?: string;
  adminNote?: string;
  balanceDue?: number | null;
  approvedBy?: string;
}

function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-CA", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;color:#6B7280;font-size:13px;width:42%;vertical-align:top;">${label}</td>
    <td style="padding:6px 0;font-size:13px;font-weight:600;color:#111827;">${value}</td>
  </tr>`;
}

function buildHtml(p: ConfirmationPayload): string {
  const now = new Date().toLocaleString("en-CA", {
    timeZone: "America/Toronto", dateStyle: "full", timeStyle: "short",
  });
  const greeting = p.clientFirstName ? `Hello ${p.clientFirstName},` : `Hello ${p.clientName},`;
  const dateFormatted = formatDate(p.serviceDate);
  const cancelMailto = `mailto:${REPLY_TO}?subject=${encodeURIComponent("Cancel or Reschedule Request")}&body=${encodeURIComponent(`Hello Piscines Novo,\n\nI would like to cancel or reschedule my upcoming service.\n\nClient Name: ${p.clientName}\nService Date: ${dateFormatted}\nService Type: ${p.serviceType}\nProperty Address: ${p.address || "—"}\n\nPlease confirm once the change has been made.\n\nThank you.`)}`;

  const detailRows = [
    row("Service", p.serviceType),
    row("Date", dateFormatted),
    p.address ? row("Address", p.address) : "",
    p.poolType ? row("Pool Type", p.poolType) : "",
    p.balanceDue != null && p.balanceDue > 0 ? row("Balance Due", `$${Number(p.balanceDue).toFixed(2)}`) : "",
    p.adminNote ? row("Note", p.adminNote) : "",
  ].filter(Boolean).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Appointment Confirmed — ${p.serviceType}</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:580px;margin:24px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:#0F766E;padding:28px 32px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
        <div style="width:40px;height:40px;background:rgba(255,255,255,0.15);border-radius:10px;display:flex;align-items:center;justify-content:center;">
          <span style="font-size:20px;">&#10003;</span>
        </div>
        <div>
          <h1 style="color:white;margin:0;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Appointment Confirmed</h1>
          <p style="color:#99F6E4;margin:2px 0 0;font-size:13px;">Piscines Novo Pool Services</p>
        </div>
      </div>
    </div>

    <div style="padding:28px 32px;">

      <!-- Greeting -->
      <p style="font-size:16px;color:#111827;margin:0 0 6px;font-weight:600;">${greeting}</p>
      <p style="font-size:14px;color:#374151;margin:0 0 20px;line-height:1.7;">
        Great news — your appointment has been <strong style="color:#0F766E;">confirmed</strong>! Here are the details for your upcoming service with Piscines Novo.
      </p>

      <!-- Appointment Details -->
      <div style="background:#F0FDFA;border:1px solid #99F6E4;border-radius:12px;padding:20px;margin-bottom:20px;">
        <h2 style="font-size:12px;font-weight:700;color:#0F766E;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 14px;">Appointment Details</h2>
        <table style="width:100%;border-collapse:collapse;">
          ${detailRows}
        </table>
      </div>

      ${p.balanceDue != null && p.balanceDue > 0 ? `
      <!-- Balance Due -->
      <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <p style="font-size:12px;font-weight:700;color:#92400E;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 6px;">Balance Due</p>
        <p style="margin:0;font-size:22px;font-weight:800;color:#92400E;">$${Number(p.balanceDue).toFixed(2)}</p>
        <p style="margin:6px 0 0;font-size:13px;color:#78350F;line-height:1.6;">Payment is by <strong>e-transfer only</strong> to <strong>depot@novopiscines.ca</strong>. Please ensure payment is sent before your service date.</p>
      </div>
      ` : `
      <!-- Payment -->
      <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <p style="font-size:12px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 5px;">Payment</p>
        <p style="margin:0;font-size:14px;color:#15803D;line-height:1.6;">Payment is by <strong>e-transfer only</strong> to <strong>depot@novopiscines.ca</strong></p>
      </div>
      `}

      <!-- What to expect -->
      <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <p style="font-size:12px;font-weight:700;color:#1E40AF;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 8px;">What to Expect</p>
        <ul style="margin:0;padding-left:18px;font-size:14px;color:#1E3A5F;line-height:1.8;">
          <li>Our team will arrive on the confirmed date.</li>
          <li>Please ensure backyard access is available and any pets are secured.</li>
          <li>You will receive a reminder email closer to your service date.</li>
        </ul>
      </div>

      <!-- Cancel Policy -->
      <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;padding:20px;margin-bottom:20px;">
        <h2 style="font-size:12px;font-weight:700;color:#92400E;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 10px;">Need to Cancel or Reschedule?</h2>
        <p style="margin:0 0 10px;font-size:14px;color:#78350F;line-height:1.7;">
          Please reply to this email or contact us at <strong>services@novopiscines.ca</strong> as soon as possible.
        </p>
        <p style="margin:0 0 16px;font-size:13px;color:#92400E;line-height:1.6;background:#FEF3C7;border-radius:8px;padding:10px 14px;">
          <strong>Important:</strong> If our technician is dispatched and the appointment was not cancelled by email beforehand, a <strong>$75 travel fee</strong> will apply.
        </p>
        <a href="${cancelMailto}"
           style="display:inline-block;background:#EA580C;color:white;font-size:13px;font-weight:700;padding:11px 22px;border-radius:9px;text-decoration:none;">
          Cancel / Reschedule
        </a>
      </div>

      <!-- Questions -->
      <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:16px 20px;">
        <p style="font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 6px;">Questions?</p>
        <p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.6;">
          Reach us anytime at <strong>services@novopiscines.ca</strong>
        </p>
        <a href="mailto:${REPLY_TO}"
           style="display:inline-block;background:#0F766E;color:white;font-size:13px;font-weight:600;padding:9px 20px;border-radius:8px;text-decoration:none;">
          Contact Us
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

    const p = await req.json() as ConfirmationPayload;

    if (!p.clientEmail) {
      return new Response(JSON.stringify({ error: "clientEmail is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dateFormatted = formatDate(p.serviceDate);
    const subject = `Appointment Confirmed — ${p.serviceType} on ${dateFormatted}`;
    const html = buildHtml(p);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [p.clientEmail],
        cc: [CC_ADDRESS],
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
    console.error("send-booking-confirmation error:", err);
    return new Response(JSON.stringify({ error: "Internal error", details: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
