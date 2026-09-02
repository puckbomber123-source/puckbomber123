import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create form data to match the Google Apps Script's expected format
    const formData = new FormData();
    formData.append('email', email);

    const response = await fetch(
      'https://script.google.com/macros/s/AKfycbxEXmGdm9IzQ5Xf29yWPObFYqduzMxLvDwPwRxn9BtqF5VMzOvb63A9QIobyivaBWH5/exec',
      {
        method: 'POST',
        body: formData
      }
    );

    if (!response.ok) {
      throw new Error(`Google Apps Script returned ${response.status}`);
    }

    const text = await response.text();
    console.log('Raw response:', text);

    if (!text || text.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'No data returned from Google Apps Script' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    try {
      const data = JSON.parse(text);
      
      if (!data) {
        return new Response(
          JSON.stringify({ error: 'Client not found' }),
          { 
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Return the successful response
      return new Response(
        JSON.stringify(data),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Response Text:', text);
      
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON response from Google Apps Script',
          details: text.substring(0, 200),
          parseError: parseError.message
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error('Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch client data',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});