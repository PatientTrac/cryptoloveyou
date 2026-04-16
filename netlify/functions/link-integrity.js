/**
 * CryptoLoveYou — Affiliate Link Integrity Monitor
 * Netlify Function: /netlify/functions/link-integrity.js
 *
 * Audit finding (Backend Security): A compromised WordPress installation can
 * silently replace affiliate link parameters. This monitor runs on a schedule
 * and compares live outbound link parameters against a trusted reference set.
 *
 * How it works:
 * 1. A trusted reference map of affiliate URLs is stored in environment variables
 *    (not in the repo — never commit affiliate IDs to source control)
 * 2. This function is called by a Netlify scheduled function (cron) every 6 hours
 * 3. It fetches key pages and extracts outbound affiliate link hrefs
 * 4. It compares extracted parameters against the trusted reference
 * 5. On mismatch, it sends an alert via email (Resend) and logs the discrepancy
 *
 * To configure:
 * Set these environment variables in Netlify dashboard > Site Settings > Env vars:
 *   AFFILIATE_LINKS_JSON  — JSON string of trusted link map (see format below)
 *   RESEND_API_KEY        — for alert emails
 *   ALERT_EMAIL           — where to send integrity alerts
 *   SITE_URL              — https://www.cryptoloveyou.com
 *
 * AFFILIATE_LINKS_JSON format:
 * {
 *   "bybit":   { "url": "https://www.bybit.com/register", "params": { "affiliate_id": "YOUR_ID" }},
 *   "kraken":  { "url": "https://www.kraken.com/sign-up",  "params": { "referral": "YOUR_CODE" }},
 *   "binance": { "url": "https://www.binance.com/register","params": { "ref": "YOUR_CODE" }}
 * }
 */

const PAGES_TO_CHECK = [
  '/',
  '/best-crypto-exchanges',
  '/kraken-review',
  '/ledger-wallet-review',
  '/free-crypto-ai-guide',
];

exports.handler = async (event) => {
  const SITE_URL    = process.env.SITE_URL || 'https://www.cryptoloveyou.com';
  const ALERT_EMAIL = process.env.ALERT_EMAIL;
  const RESEND_KEY  = process.env.RESEND_API_KEY;

  let trustedLinks;
  try {
    trustedLinks = JSON.parse(process.env.AFFILIATE_LINKS_JSON || '{}');
  } catch {
    return { statusCode: 500, body: 'AFFILIATE_LINKS_JSON is not valid JSON' };
  }

  if (Object.keys(trustedLinks).length === 0) {
    return { statusCode: 200, body: 'No affiliate links configured for monitoring' };
  }

  const violations = [];

  for (const pagePath of PAGES_TO_CHECK) {
    let html;
    try {
      const res = await fetch(`${SITE_URL}${pagePath}`, {
        headers: { 'User-Agent': 'CLV-IntegrityMonitor/1.0' },
        signal: AbortSignal.timeout(10000),
      });
      html = await res.text();
    } catch (err) {
      violations.push({
        type: 'fetch_error',
        page: pagePath,
        error: err.message,
      });
      continue;
    }

    // Extract all outbound href attributes
    const linkMatches = [...html.matchAll(/href="(https?:\/\/[^"]+)"/g)];

    for (const [, href] of linkMatches) {
      let url;
      try { url = new URL(href); } catch { continue; }

      // Match against trusted link map
      for (const [partner, trusted] of Object.entries(trustedLinks)) {
        const trustedUrl = new URL(trusted.url);

        // Domain match check
        if (url.hostname !== trustedUrl.hostname) continue;
        if (!url.pathname.startsWith(trustedUrl.pathname.replace(/\/$/, ''))) continue;

        // Parameter integrity check
        for (const [key, expectedValue] of Object.entries(trusted.params)) {
          const actualValue = url.searchParams.get(key);

          if (actualValue === null) {
            violations.push({
              type: 'missing_param',
              partner,
              page: pagePath,
              param: key,
              expected: expectedValue,
              actual: null,
              full_url: href,
            });
          } else if (actualValue !== expectedValue) {
            violations.push({
              type: 'param_mismatch',
              partner,
              page: pagePath,
              param: key,
              expected: expectedValue,
              actual: actualValue,
              full_url: href,
              severity: 'CRITICAL — possible affiliate hijacking',
            });
          }
        }
      }
    }
  }

  const timestamp = new Date().toISOString();

  if (violations.length > 0) {
    console.error(JSON.stringify({
      type: 'affiliate_integrity_alert',
      timestamp,
      violation_count: violations.length,
      violations,
    }));

    // Send email alert if configured
    if (RESEND_KEY && ALERT_EMAIL) {
      await sendAlert({ violations, timestamp, RESEND_KEY, ALERT_EMAIL, SITE_URL });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'VIOLATIONS_FOUND', count: violations.length, violations }),
    };
  }

  console.log(JSON.stringify({
    type: 'affiliate_integrity_ok',
    timestamp,
    pages_checked: PAGES_TO_CHECK.length,
    partners_checked: Object.keys(trustedLinks).length,
  }));

  return {
    statusCode: 200,
    body: JSON.stringify({ status: 'OK', pages_checked: PAGES_TO_CHECK.length }),
  };
};

async function sendAlert({ violations, timestamp, RESEND_KEY, ALERT_EMAIL, SITE_URL }) {
  const criticalCount = violations.filter(v => v.type === 'param_mismatch').length;
  const subject = criticalCount > 0
    ? `🚨 CRITICAL: Affiliate link hijacking detected on CryptoLoveYou (${criticalCount} params changed)`
    : `⚠️ Affiliate link integrity warning on CryptoLoveYou`;

  const rows = violations.map(v => `
    <tr style="background:${v.type === 'param_mismatch' ? '#fee2e2' : '#fef9c3'}">
      <td style="padding:8px;border:1px solid #e5e7eb">${v.severity || v.type}</td>
      <td style="padding:8px;border:1px solid #e5e7eb">${v.partner}</td>
      <td style="padding:8px;border:1px solid #e5e7eb">${v.page}</td>
      <td style="padding:8px;border:1px solid #e5e7eb">${v.param}: expected <strong>${v.expected}</strong>, got <strong>${v.actual ?? 'MISSING'}</strong></td>
    </tr>`).join('');

  const html = `
    <h2 style="color:#dc2626">Affiliate Link Integrity Alert</h2>
    <p>Detected at: ${timestamp}</p>
    <p>Site: <a href="${SITE_URL}">${SITE_URL}</a></p>
    <table style="border-collapse:collapse;width:100%;font-size:14px">
      <thead><tr>
        <th style="padding:8px;border:1px solid #e5e7eb;background:#f3f4f6">Severity</th>
        <th style="padding:8px;border:1px solid #e5e7eb;background:#f3f4f6">Partner</th>
        <th style="padding:8px;border:1px solid #e5e7eb;background:#f3f4f6">Page</th>
        <th style="padding:8px;border:1px solid #e5e7eb;background:#f3f4f6">Detail</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="color:#dc2626"><strong>Action required: Log into GitHub and verify affiliate link parameters immediately.</strong></p>`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'alerts@cryptoloveyou.com',
      to: [ALERT_EMAIL],
      subject,
      html,
    }),
  });
}
