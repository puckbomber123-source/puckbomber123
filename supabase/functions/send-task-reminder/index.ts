import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FROM_ADDRESS = "Piscines Novo <services@novopiscines.ca>";
const REPLY_TO = "services@novopiscines.ca";

interface TaskReminderPayload {
  toEmail: string;
  recipientName: string;
  taskTitle: string;
  taskNotes?: string;
  dueDate?: string;
  priority: string;
  recurrence: string;
  assignedByName: string;
}

function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-CA", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function priorityLabel(p: string): string {
  if (p === "high") return "High Priority";
  if (p === "low") return "Low Priority";
  return "Normal";
}

function recurrenceLabel(r: string): string {
  const map: Record<string, string> = {
    none: "One-time",
    daily: "Repeats daily",
    weekly: "Repeats weekly",
    monthly: "Repeats monthly",
    yearly: "Repeats yearly",
  };
  return map[r] || "One-time";
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;color:#6B7280;font-size:13px;width:42%;vertical-align:top;">${label}</td>
    <td style="padding:6px 0;font-size:13px;font-weight:600;color:#111827;">${value}</td>
  </tr>`;
}

function buildHtml(p: TaskReminderPayload): string {
  const now = new Date().toLocaleString("en-CA", {
    timeZone: "America/Toronto", dateStyle: "full", timeStyle: "short",
  });

  const dueBlock = p.dueDate
    ? row("Due Date", formatDate(p.dueDate))
    : "";

  const notesBlock = p.taskNotes
    ? `<div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
         <p style="font-size:12px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 8px;">Notes</p>
         <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${p.taskNotes}</p>
       </div>`
    : "";

  const priorityColor = p.priority === "high" ? "#DC2626" : p.priority === "low" ? "#6B7280" : "#2563EB";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Task Reminder — ${p.taskTitle}</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:580px;margin:24px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <div style="background:#0F766E;padding:28px 32px;">
      <h1 style="color:white;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Task Reminder</h1>
      <p style="color:#99F6E4;margin:6px 0 0;font-size:13px;">${now}</p>
    </div>

    <div style="padding:28px 32px;">

      <p style="font-size:16px;color:#111827;margin:0 0 8px;font-weight:600;">Hello ${p.recipientName},</p>
      <p style="font-size:14px;color:#374151;margin:0 0 20px;line-height:1.7;">
        This is a reminder from Piscines Novo's task manager. You have a task
        <strong>${p.taskTitle}</strong>${p.assignedByName !== p.recipientName ? ` assigned by ${p.assignedByName}` : ""} that needs attention.
      </p>

      <div style="background:#F0FDFA;border:1px solid #99F6E4;border-left:4px solid #0F766E;border-radius:0 12px 12px 0;padding:14px 18px;margin-bottom:20px;">
        <p style="margin:0;font-size:14px;color:#134E4A;line-height:1.7;">
          <strong>Task:</strong> ${p.taskTitle}
        </p>
      </div>

      <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:20px;margin-bottom:20px;">
        <h2 style="font-size:12px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 14px;">Task Details</h2>
        <table style="width:100%;border-collapse:collapse;">
          ${row("Priority", `<span style="color:${priorityColor};font-weight:700;">${priorityLabel(p.priority)}</span>`)}
          ${row("Recurrence", recurrenceLabel(p.recurrence))}
          ${dueBlock}
          ${row("Assigned by", p.assignedByName)}
        </table>
      </div>

      ${notesBlock}

      <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:16px 20px;">
        <p style="font-size:12px;font-weight:700;color:#1E40AF;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 6px;">Next Steps</p>
        <p style="margin:0;font-size:14px;color:#1D4ED8;line-height:1.6;">
          Log in to the Piscines Novo portal to view and complete this task.
        </p>
      </div>

    </div>

    <div style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:18px 32px;text-align:center;">
      <p style="color:#9CA3AF;font-size:12px;margin:0;">Piscines Novo — Task Management</p>
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

    const p = await req.json() as TaskReminderPayload;

    if (!p.toEmail) {
      return new Response(JSON.stringify({ error: "toEmail is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subject = `Piscines Novo — Task Reminder: ${p.taskTitle}`;
    const html = buildHtml(p);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [p.toEmail],
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
    console.error("send-task-reminder error:", err);
    return new Response(JSON.stringify({ error: "Internal error", details: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});