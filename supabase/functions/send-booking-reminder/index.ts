import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FROM_ADDRESS = "Piscines Novo <services@novopiscines.ca>";
const REPLY_TO = "services@novopiscines.ca";
const CC_ADDRESS = "services@novopiscines.ca";

interface ReminderPayload {
  clientEmail: string;
  clientName: string;
  clientFirstName?: string;
  serviceType: string;
  serviceDate: string;
  address?: string;
  poolType?: string;
  adminNote?: string;
  balanceDue?: number | null;
}

function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-CA", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function buildPlainText(p: ReminderPayload): string {
  const greeting = p.clientFirstName ? `Hello ${p.clientFirstName},` : `Hello ${p.clientName},`;
  const dateFormatted = formatDate(p.serviceDate);
  const lines: string[] = [
    greeting,
    "",
    `This is a reminder from Piscines Novo to confirm your ${p.serviceType.toLowerCase()} scheduled for ${dateFormatted}.`,
    "",
    "We previously sent you a booking request email with all the details. If you haven't seen it, please check your junk or spam folder — try searching your email for \"pool closing\".",
    "",
    "To confirm your appointment, simply reply to this email.",
    "If you have any questions or need to reschedule, you can also reach us at services@novopiscines.ca.",
    "",
    "Your appointment details:",
    "",
    `Service: ${p.serviceType}`,
    `Date: ${dateFormatted}`,
  ];
  if (p.address) lines.push(`Address: ${p.address}`);
  if (p.poolType) lines.push(`Pool Type: ${p.poolType}`);
  if (p.balanceDue != null && p.balanceDue > 0) lines.push(`Balance Due: ${Number(p.balanceDue).toFixed(2)}`);
  if (p.adminNote) lines.push(`Note: ${p.adminNote}`);
  lines.push(
    "",
    "Payment is by e-transfer only to depot@novopiscines.ca.",
    "",
    "Important: If our technician is dispatched and the appointment was not cancelled by email beforehand, a $75 travel fee will apply.",
    "",
    "Thank you for choosing Piscines Novo!",
    "",
    "Piscines Novo Pool Services",
    "services@novopiscines.ca",
  );
  return lines.join("\n");
}

function buildHtml(p: ReminderPayload): string {
  const greeting = p.clientFirstName ? `Hello ${p.clientFirstName},` : `Hello ${p.clientName},`;
  const dateFormatted = formatDate(p.serviceDate);

  const detailRows = [
    `<tr><td style="padding:4px 0;color:#555;font-size:14px;">Service</td><td style="padding:4px 0;font-size:14px;font-weight:600;color:#111;">${p.serviceType}</td></tr>`,
    `<tr><td style="padding:4px 0;color:#555;font-size:14px;">Date</td><td style="padding:4px 0;font-size:14px;font-weight:600;color:#111;">${dateFormatted}</td></tr>`,
    p.address ? `<tr><td style="padding:4px 0;color:#555;font-size:14px;">Address</td><td style="padding:4px 0;font-size:14px;font-weight:600;color:#111;">${p.address}</td></tr>` : "",
    p.poolType ? `<tr><td style="padding:4px 0;color:#555;font-size:14px;">Pool Type</td><td style="padding:4px 0;font-size:14px;font-weight:600;color:#111;">${p.poolType}</td></tr>` : "",
    p.balanceDue != null && p.balanceDue > 0 ? `<tr><td style="padding:4px 0;color:#555;font-size:14px;">Balance Due</td><td style="padding:4px 0;font-size:14px;font-weight:600;color:#111;">$${Number(p.balanceDue).toFixed(2)}</td></tr>` : "",
    p.adminNote ? `<tr><td style="padding:4px 0;color:#555;font-size:14px;">Note</td><td style="padding:4px 0;font-size:14px;font-weight:600;color:#111;">${p.adminNote}</td></tr>` : "",
  ].filter(Boolean).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#111;background:#fff;">
  <p style="margin:0 0 12px;">${greeting}</p>
  <p style="margin:0 0 12px;">This is a reminder from Piscines Novo to <strong>confirm your ${p.serviceType.toLowerCase()}</strong> scheduled for <strong>${dateFormatted}</strong>.</p>
  <p style="margin:0 0 12px;">We previously sent you a booking request email with all the details. If you haven't seen it, please check your junk or spam folder — try searching your email for &quot;pool closing&quot;.</p>
  <p style="margin:0 0 12px;padding:10px;background:#F0FDFA;border-left:3px solid #0F766E;font-size:14px;"><strong>To confirm your appointment, simply reply to this email.</strong><br>If you have any questions or need to reschedule, you can also reach us at <strong>services@novopiscines.ca</strong>.</p>
  <p style="margin:0 0 8px;font-weight:600;">Your appointment details:</p>
  <table style="border-collapse:collapse;margin-bottom:12px;">${detailRows}</table>
  <p style="margin:0 0 8px;">Payment is by e-transfer only to <strong>depot@novopiscines.ca</strong>.</p>
  <p style="margin:0 0 16px;padding:10px;background:#FFF7ED;border-left:3px solid #EA580C;font-size:13px;">Important: If our technician is dispatched and the appointment was not cancelled by email beforehand, a $75 travel fee will apply.</p>
  <p style="margin:0 0 4px;">Thank you for choosing Piscines Novo!</p>
  <p style="margin:4px 0;color:#666;font-size:13px;">Piscines Novo Pool Services<br>services@novopiscines.ca</p>
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
    const subject = `Confirm your ${p.serviceType} — ${dateFormatted}`;
    const textBody = buildPlainText(p);
    const htmlBody = buildHtml(p);

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
        text: textBody,
        html: htmlBody,
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
    console.error("send-booking-reminder error:", err);
    return new Response(JSON.stringify({ error: "Internal error", details: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
