import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const HUBSPOT_TOKEN = Deno.env.get("VITE_HUBSPOT_TOKEN") || Deno.env.get("HUBSPOT_TOKEN");
    if (!HUBSPOT_TOKEN) {
      return new Response(JSON.stringify({ error: "HubSpot token not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Search HubSpot contacts by email
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
              { propertyName: "email", operator: "EQ", value: email },
            ],
          },
        ],
        properties: [
          "firstname", "lastname", "email", "phone", "address", "city", "zip",
          "pool_type", "pool_cover", "pool_opening", "pool_closing", "pool_maintenance",
          "backyard_access_approval", "pool_opening_confirmed", "pool_closing_confirmed",
          "pool_opening_add_on", "pool_closing_add_ons",
        ],
        limit: 1,
      }),
    });

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      return new Response(JSON.stringify({ error: "HubSpot search failed", details: errText }), {
        status: searchRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchData = await searchRes.json();

    if (!searchData.results || searchData.results.length === 0) {
      return new Response(JSON.stringify({ error: "Contact not found in HubSpot" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contact = searchData.results[0];
    const props = contact.properties;

    const client = {
      first_name: props.firstname || "",
      last_name: props.lastname || "",
      email: props.email || email,
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

    return new Response(JSON.stringify({ client }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
