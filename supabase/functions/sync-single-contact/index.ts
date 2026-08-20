import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PROPERTIES = [
  "firstname", "lastname", "email", "phone", "address", "city", "zip",
  "pool_type", "pool_cover", "pool_opening", "pool_closing", "pool_maintenance",
  "backyard_access_approval", "pool_opening_confirmed", "pool_closing_confirmed",
  "pool_opening_add_on", "pool_closing_add_ons",
].join(",");

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

    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Search HubSpot for the contact by email
    const searchRes = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUBSPOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              { propertyName: "email", operator: "EQ", value: email.toLowerCase().trim() },
            ],
          },
        ],
        properties: PROPERTIES.split(","),
        limit: 1,
      }),
    });

    if (!searchRes.ok) {
      const err = await searchRes.text();
      return new Response(JSON.stringify({ error: "HubSpot search failed", details: err }), {
        status: searchRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchData = await searchRes.json();
    const results = searchData.results || [];

    if (results.length === 0) {
      return new Response(JSON.stringify({ error: "No HubSpot contact found with that email" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const props = results[0].properties as Record<string, string>;

    const row = {
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
    };

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { error } = await supabase
      .from("clients")
      .upsert(row, { onConflict: "email" });

    if (error) {
      return new Response(JSON.stringify({ error: "DB upsert failed", details: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        contact: {
          email: row.email,
          name: `${row.first_name} ${row.last_name}`.trim(),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
