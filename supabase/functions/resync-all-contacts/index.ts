import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const HUBSPOT_TOKEN = Deno.env.get("VITE_HUBSPOT_TOKEN") || Deno.env.get("HUBSPOT_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!HUBSPOT_TOKEN) {
      return new Response(JSON.stringify({ error: "HubSpot token not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    let allContacts: Record<string, string>[] = [];
    let after: string | undefined = undefined;
    let page = 0;

    // Paginate through all HubSpot contacts
    while (true) {
      const url = new URL("https://api.hubapi.com/crm/v3/objects/contacts");
      url.searchParams.set("limit", "100");
      url.searchParams.set("properties", [
        "firstname", "lastname", "email", "phone", "address", "city", "zip",
        "pool_type", "pool_cover", "pool_opening", "pool_closing", "pool_maintenance",
        "backyard_access_approval", "pool_opening_confirmed", "pool_closing_confirmed",
        "pool_opening_add_on", "pool_closing_add_ons",
      ].join(","));
      if (after) url.searchParams.set("after", after);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${HUBSPOT_TOKEN}` },
      });

      if (!res.ok) {
        const err = await res.text();
        return new Response(JSON.stringify({ error: "HubSpot fetch failed", details: err }), {
          status: res.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await res.json();
      const contacts = (data.results || []).map((c: { properties: Record<string, string> }) => c.properties);
      allContacts = allContacts.concat(contacts);

      page++;
      if (data.paging?.next?.after) {
        after = data.paging.next.after;
      } else {
        break;
      }

      // Safety cap at 50 pages (5000 contacts)
      if (page >= 50) break;
    }

    // Filter contacts with email
    const withEmail = allContacts.filter(c => c.email);

    // Upsert all into clients table
    const rows = withEmail.map(props => ({
      email: props.email,
      first_name: props.firstname || "",
      last_name: props.lastname || "",
      phone: props.phone || "",
      address: props.address || "",
      city: props.city || "",
      zip: props.zip || "",
      pool_type: props.pool_type || "",
      pool_cover: props.pool_cover || "",
      pool_opening: props.pool_opening || "",
      pool_closing: props.pool_closing || "",
      pool_maintenance: props.pool_maintenance || "",
      backyard_access_approval: props.backyard_access_approval || "",
      pool_opening_confirmed: props.pool_opening_confirmed || "",
      pool_closing_confirmed: props.pool_closing_confirmed || "",
      pool_opening_add_on: props.pool_opening_add_on || "",
      pool_closing_add_ons: props.pool_closing_add_ons || "",
    }));

    // Upsert in batches of 200
    let upserted = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const batch = rows.slice(i, i + 200);
      const { error } = await supabase
        .from("clients")
        .upsert(batch, { onConflict: "email" });
      if (error) {
        console.error("Upsert error:", error);
      } else {
        upserted += batch.length;
      }
    }

    return new Response(
      JSON.stringify({ success: true, total: allContacts.length, synced: upserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
