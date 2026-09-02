import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FROM_ADDRESS = "Piscines Novo <services@novopiscines.ca>";
const REPLY_TO = "services@novopiscines.ca";
const CC_ADDRESS = "services@novopiscines.ca";

interface OnMyWayPayload {
  clientEmail: string;
  clientFirstName?: string;
  clientName: string;
  serviceType: string;
  serviceDate: string;   // YYYY-MM-DD
  address?: string;
  adminNote?: string;
}

function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-CA", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function buildOnMyWayHtml(p: OnMyWayPayload): string {
  const now = new Date().toLocaleString("en-CA", {
    timeZone: "America/Toronto", dateStyle: "full", timeStyle: "short",
  });
  const greeting = p.clientFirstName ? `Hello ${p.clientFirstName},` : `Hello ${p.clientName},`;
  const dateFormatted = formatDate(p.serviceDate);

  const adminNoteBlock = p.adminNote
    ? `<div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <p style="font-size:12px;font-weight:700;color:#92400E;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 6px;">Note</p>
        <p style="margin:0;font-size:14px;color:#78350F;line-height:1.6;">${p.adminNote}</p>
       </div>`
    : "";

  const addressBlock = p.address
    ? `<p style="font-size:14px;color:#374151;margin:0 0 6px;line-height:1.6;">
         <strong>Address:</strong> ${p.address}
       </p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Your Piscines Novo Team is On Their Way</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:580px;margin:24px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0EA5E9 0%,#0284C7 100%);padding:32px 32px 28px;">
      <p style="color:#BAE6FD;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px;">Piscines Novo</p>
      <h1 style="color:white;margin:0;font-size:24px;font-weight:800;letter-spacing:-0.5px;line-height:1.2;">
        Your team is on their way!
      </h1>
      <p style="color:#BAE6FD;margin:8px 0 0;font-size:13px;">${now}</p>
    </div>

    <div style="padding:28px 32px;">

      <!-- Greeting -->
      <p style="font-size:16px;color:#111827;margin:0 0 16px;font-weight:600;">${greeting}</p>
      <p style="font-size:15px;color:#374151;margin:0 0 24px;line-height:1.7;">
        Great news — our Piscines Novo team is currently on their way to your property for your
        <strong>${p.serviceType}</strong> today, <strong style="color:#0284C7;">${dateFormatted}</strong>.
      </p>

      <!-- Details card -->
      <div style="background:#F0F9FF;border:1px solid #BAE6FD;border-radius:12px;padding:20px;margin-bottom:20px;">
        <h2 style="font-size:12px;font-weight:700;color:#0369A1;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 12px;">Service Details</h2>
        <p style="font-size:14px;color:#0C4A6E;margin:0 0 6px;line-height:1.6;">
          <strong>Service:</strong> ${p.serviceType}
        </p>
        <p style="font-size:14px;color:#0C4A6E;margin:0 0 6px;line-height:1.6;">
          <strong>Date:</strong> ${dateFormatted}
        </p>
        ${addressBlock}
      </div>

      ${adminNoteBlock}

      <!-- Preparation reminder -->
      <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <p style="font-size:12px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 8px;">Quick Reminders</p>
        <ul style="margin:0;padding:0 0 0 18px;font-size:14px;color:#15803D;line-height:1.9;">
          <li>Please ensure your backyard gate is unlocked and accessible</li>
          <li>Secure any pets before our team arrives</li>
          <li>Review the service confirmation email we sent you for full details</li>
        </ul>
      </div>

      <!-- Payment -->
      <div style="background:#FAFAFA;border:1px solid #E5E7EB;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <p style="font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 6px;">Payment</p>
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">
          Payment is by <strong>e-transfer only</strong> to <strong>depot@novopiscines.ca</strong>
        </p>
      </div>

      <!-- Questions -->
      <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:16px 20px;">
        <p style="font-size:12px;font-weight:700;color:#1E40AF;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 6px;">Questions?</p>
        <p style="margin:0 0 12px;font-size:14px;color:#1D4ED8;line-height:1.6;">
          Reply to this email or reach us at <strong>services@novopiscines.ca</strong>
        </p>
        <a href="mailto:${REPLY_TO}"
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

    const p = await req.json() as OnMyWayPayload;

    if (!p.clientEmail) {
      return new Response(JSON.stringify({ error: "clientEmail is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dateFormatted = formatDate(p.serviceDate);
    const subject = `Piscines Novo — Your team is on their way! (${p.serviceType} — ${dateFormatted})`;
    const html = buildOnMyWayHtml(p);

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
    console.error("send-onmyway-email error:", err);
    return new Response(JSON.stringify({ error: "Internal error", details: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
