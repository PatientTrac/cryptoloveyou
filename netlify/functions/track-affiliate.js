import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export const handler = async (event) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Parse request body
    const data = JSON.parse(event.body);
    const { affiliate_name, affiliate_url, category, page_source } = data;

    // Validate required fields
    if (!affiliate_name || !affiliate_url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields: affiliate_name and affiliate_url are required'
        }),
      };
    }

    // Get client IP address
    const ip_address = event.headers['x-nf-client-connection-ip'] ||
                       event.headers['client-ip'] ||
                       event.headers['x-forwarded-for']?.split(',')[0] ||
                       'unknown';

    // Insert click data into affiliate_clicks table
    const { data: insertedData, error } = await supabase
      .from('affiliate_clicks')
      .insert([
        {
          affiliate_name: affiliate_name.trim(),
          affiliate_url: affiliate_url.trim(),
          category: category || 'general',
          page_source: page_source || 'unknown',
          ip_address
        }
      ])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to track affiliate click',
          details: error.message
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Affiliate click tracked successfully',
        data: insertedData
      }),
    };

  } catch (error) {
    console.error('Error processing request:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      }),
    };
  }
};
