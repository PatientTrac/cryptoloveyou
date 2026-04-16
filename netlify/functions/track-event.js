/**
 * CryptoLoveYou — Behavioral Signal Capture Layer
 * Netlify Function: /netlify/functions/track-event.js
 *
 * Audit finding (Axon Key 1): The site measures only terminal click events.
 * No pre-click behavioral journey is captured. This function provides the
 * server-side event layer that survives ad blockers and cookie restrictions.
 *
 * What this captures:
 * - Full content pathway before affiliate click (articles read, time spent)
 * - Traffic source quality signals (organic search query vs social referrer)
 * - Session depth at time of click (1st pageview vs 3rd return visit)
 * - Exchange partner attribution with behavioral context
 *
 * Data is forwarded to:
 * 1. Google Analytics 4 (Measurement Protocol) — existing GA property
 * 2. A lightweight Netlify KV store or external data warehouse (configurable)
 *
 * Usage from frontend JS:
 *   clvTrack('affiliate_click', { exchange: 'bybit', article_slug: 'best-exchanges-2026', session_depth: 3 });
 *   clvTrack('article_read', { slug: 'bitcoin-price-prediction', time_on_page: 142, scroll_depth: 0.78 });
 *   clvTrack('comparison_view', { exchange: 'kraken', position: 2, cta_visible: true });
 */

const GA4_MEASUREMENT_ID = process.env.GA4_MEASUREMENT_ID; // e.g. G-XXXXXXXXXX
const GA4_API_SECRET      = process.env.GA4_API_SECRET;     // from GA4 admin > Data Streams

exports.handler = async (event, context) => {
  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // CORS — allow only cryptoloveyou.com
  const origin = event.headers.origin || '';
  const allowedOrigins = [
    'https://www.cryptoloveyou.com',
    'https://cryptoloveyou.com',
  ];
  if (!allowedOrigins.includes(origin) && process.env.NODE_ENV !== 'development') {
    return { statusCode: 403, body: 'Forbidden' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { event_name, client_id, session_id, params = {} } = payload;

  if (!event_name || !client_id) {
    return { statusCode: 400, body: 'Missing required fields: event_name, client_id' };
  }

  // Enrich with server-side signals the client cannot fake
  const enriched_params = {
    ...params,
    server_timestamp: Date.now(),
    user_agent_raw: event.headers['user-agent'] || '',
    ip_country: event.headers['x-country'] || event.headers['cf-ipcountry'] || 'unknown',
    // Strip PII from IP — we store country only, never full IP
    referrer_domain: extractDomain(params.referrer || ''),
  };

  // Forward to GA4 Measurement Protocol
  if (GA4_MEASUREMENT_ID && GA4_API_SECRET) {
    try {
      await sendToGA4({
        measurement_id: GA4_MEASUREMENT_ID,
        api_secret: GA4_API_SECRET,
        client_id,
        session_id,
        event_name,
        params: enriched_params,
      });
    } catch (err) {
      console.error('GA4 forward failed:', err.message);
      // Non-fatal — continue to other destinations
    }
  }

  // Log structured event for data warehouse ingestion
  // In production: replace console.log with a write to Supabase, PlanetScale, or S3
  console.log(JSON.stringify({
    type: 'clv_event',
    event_name,
    client_id,
    session_id,
    params: enriched_params,
    iso_timestamp: new Date().toISOString(),
  }));

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
    },
    body: JSON.stringify({ ok: true }),
  };
};

async function sendToGA4({ measurement_id, api_secret, client_id, session_id, event_name, params }) {
  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurement_id}&api_secret=${api_secret}`;

  const body = {
    client_id,
    events: [{
      name: event_name,
      params: {
        session_id,
        engagement_time_msec: params.time_on_page ? params.time_on_page * 1000 : 100,
        ...params,
      },
    }],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`GA4 returned ${res.status}`);
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url || 'direct';
  }
}
