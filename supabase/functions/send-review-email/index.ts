import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FROM_ADDRESS = "Piscines Novo <services@novopiscines.ca>";
const REPLY_TO = "services@novopiscines.ca";
const REVIEW_LINK = "https://g.page/r/CdFTMUDvEQ1EEAE/review";

interface ReviewPayload {
  reportId?: string;
  bookingId?: string;
  language: 'en' | 'fr';
}

interface ReportRow {
  id: string;
  client_email: string;
  lead_technician: string;
  service_date: string;
  service_type: string;
}

interface ClientRow {
  first_name: string;
  last_name: string;
  email: string;
}

function firstName(fullName: string): string {
  if (!fullName) return '';
  return fullName.trim().split(/\s+/)[0];
}

function buildEnHtml(clientFirst: string, techFirst: string, serviceType: string, serviceDate: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>How did I do? — Piscines Novo</title></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:24px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:#1D4ED8;padding:28px 32px;">
      <h1 style="color:white;margin:0;font-size:20px;font-weight:700;">How did I do?</h1>
    </div>
    <div style="padding:28px 32px;">
      <p style="font-size:16px;color:#374151;line-height:1.7;margin:0 0 20px;">
        Hi ${clientFirst},<br/><br/>
        ${techFirst} here — I was the technician who took care of your ${serviceType.toLowerCase()} on ${serviceDate}. I wanted to personally reach out and ask: how did I do?
      </p>
      <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 20px;">
        Your feedback really matters to me. Our technicians can earn a performance bonus of up to $300 per service based on client reviews, so taking a minute to share your experience makes a real difference for me.
      </p>
      <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">
        If you're happy with the work, it would mean the world if you could leave a 5-star review on Google — and if you can add a photo, that's even better!
      </p>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${REVIEW_LINK}" style="display:inline-block;background:#1D4ED8;color:white;font-size:15px;font-weight:600;padding:14px 32px;border-radius:10px;text-decoration:none;">
          Leave a Google Review &rarr;
        </a>
      </div>
      <div style="background:#F0FDFA;border:1px solid #99F6E4;border-radius:12px;padding:18px 20px;">
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">
          If you have any suggestions on how I could improve, I'd genuinely love to hear that too — just reply to this email separately and it'll come straight to us.
        </p>
      </div>
      <p style="font-size:14px;color:#6B7280;line-height:1.6;margin:24px 0 0;">
        Thanks so much for trusting Piscines Novo with your pool.<br/>
        — ${techFirst}
      </p>
    </div>
    <div style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:20px 32px;text-align:center;">
      <p style="color:#9CA3AF;font-size:12px;margin:0;">Piscines Novo — Pool Service</p>
    </div>
  </div>
</body>
</html>`;
}

function buildFrHtml(clientFirst: string, techFirst: string, serviceType: string, serviceDate: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Comment ai-je fait ? — Piscines Novo</title></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:24px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:#1D4ED8;padding:28px 32px;">
      <h1 style="color:white;margin:0;font-size:20px;font-weight:700;">Comment ai-je fait ?</h1>
    </div>
    <div style="padding:28px 32px;">
      <p style="font-size:16px;color:#374151;line-height:1.7;margin:0 0 20px;">
        Bonjour ${clientFirst},<br/><br/>
        C'est ${techFirst} — j'étais le technicien qui s'est occupé de votre ${serviceType.toLowerCase()} le ${serviceDate}. Je voulais vous contacter personnellement pour vous demander : comment ai-je fait ?
      </p>
      <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 20px;">
        Vos commentaires comptent vraiment beaucoup pour moi. Nos techniciens peuvent gagner un boni de performance allant jusqu'à 300 $ par service selon les avis des clients, alors prendre une minute pour partager votre expérience fait une vraie différence pour moi.
      </p>
      <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">
        Si vous êtes satisfait du travail, ça me ferait vraiment plaisir si vous pouviez laisser un avis 5 étoiles sur Google — et si vous pouvez ajouter une photo, c'est encore mieux !
      </p>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${REVIEW_LINK}" style="display:inline-block;background:#1D4ED8;color:white;font-size:15px;font-weight:600;padding:14px 32px;border-radius:10px;text-decoration:none;">
          Laisser un avis Google &rarr;
        </a>
      </div>
      <div style="background:#F0FDFA;border:1px solid #99F6E4;border-radius:12px;padding:18px 20px;">
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">
          Si vous avez des suggestions sur comment je pourrais m'améliorer, j'aimerais vraiment les entendre aussi — répondez simplement à ce courriel séparément et ça nous parviendra directement.
        </p>
      </div>
      <p style="font-size:14px;color:#6B7280;line-height:1.6;margin:24px 0 0;">
        Merci beaucoup de faire confiance à Piscines Novo pour votre piscine.<br/>
        — ${techFirst}
      </p>
    </div>
    <div style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:20px 32px;text-align:center;">
      <p style="color:#9CA3AF;font-size:12px;margin:0;">Piscines Novo — Service de piscine</p>
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

    const payload = await req.json() as ReviewPayload;
    const lang = payload.language === 'fr' ? 'fr' : 'en';

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Server config error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers = {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    };

    let report: ReportRow | null = null;

    if (payload.reportId) {
      const res = await fetch(`${supabaseUrl}/rest/v1/service_reports?id=eq.${payload.reportId}&select=id,client_email,lead_technician,service_date,service_type`, {
        headers,
      });
      const rows = await res.json() as ReportRow[];
      if (rows.length > 0) report = rows[0];
    } else if (payload.bookingId) {
      const bkRes = await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${payload.bookingId}&select=id,email,service_type,event_date,assignment_id`, {
        headers,
      });
      const bkRows = await bkRes.json() as any[];
      if (bkRows.length === 0) {
        return new Response(JSON.stringify({ error: "Booking not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const bk = bkRows[0];
      let techName = '';
      let reportDate = bk.event_date;
      if (bk.assignment_id) {
        const assignRes = await fetch(`${supabaseUrl}/rest/v1/team_daily_assignments?id=eq.${bk.assignment_id}&select=id,linked_report_id,assignment_date`, {
          headers,
        });
        const assignRows = await assignRes.json() as any[];
        if (assignRows.length > 0) {
          const a = assignRows[0];
          if (a.assignment_date) reportDate = a.assignment_date;
          if (a.linked_report_id) {
            const rptRes = await fetch(`${supabaseUrl}/rest/v1/service_reports?id=eq.${a.linked_report_id}&select=id,client_email,lead_technician,service_date,service_type`, {
              headers,
            });
            const rptRows = await rptRes.json() as ReportRow[];
            if (rptRows.length > 0) report = rptRows[0];
          }
        }
      }
      if (!report) {
        report = {
          id: '',
          client_email: bk.email,
          lead_technician: techName || '',
          service_date: reportDate,
          service_type: bk.service_type || '',
        };
      }
    }

    if (!report) {
      return new Response(JSON.stringify({ error: "Report not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientEmail = report.client_email;
    if (!clientEmail) {
      return new Response(JSON.stringify({ error: "No client email on report" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let clientFirst = '';
    let clientName = 'Client';
    const clRes = await fetch(`${supabaseUrl}/rest/v1/clients?email=eq.${encodeURIComponent(clientEmail.toLowerCase())}&select=first_name,last_name,email`, {
      headers,
    });
    const clRows = await clRes.json() as ClientRow[];
    if (clRows.length > 0) {
      clientFirst = clRows[0].first_name || '';
      clientName = `${clRows[0].first_name || ''} ${clRows[0].last_name || ''}`.trim() || 'Client';
    }

    const techFirst = firstName(report.lead_technician) || 'your technician';
    const serviceType = report.service_type || 'pool service';
    const serviceDate = report.service_date || '';

    const subject = lang === 'fr'
      ? `Comment ai-je fait ? — Piscines Novo — ${clientName}`
      : `How did I do? — Piscines Novo — ${clientName}`;

    const html = lang === 'fr'
      ? buildFrHtml(clientFirst || 'there', techFirst, serviceType, serviceDate)
      : buildEnHtml(clientFirst || 'there', techFirst, serviceType, serviceDate);

    await sendEmail(RESEND_KEY, { to: [clientEmail], subject, html, cc: ["services@novopiscines.ca"] });

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
