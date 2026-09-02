import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwgSmI6CH2S9x3_GAviL9F_zm-PBF7JxXBcvKUIoAcVVFJ3abt0ctMOAn2F6cgJqiLxxg/exec';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const booking = await req.json();
    console.log('create-booking - Received payload:', booking);

    // Forward the request to Google Apps Script
    console.log('create-booking - Sending to Google Apps Script:', GOOGLE_SCRIPT_URL);
    
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(booking),
    });

    console.log('create-booking - Google Apps Script status:', response.status);

    if (!response.ok) {
      throw new Error(`Google Apps Script returned ${response.status}`);
    }

    const result = await response.text();
    console.log('create-booking - Google Apps Script response:', result);

    return new Response(
      JSON.stringify({ message: result || 'Booking created successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('create-booking - Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create booking',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});