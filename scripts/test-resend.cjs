#!/usr/bin/env node

/**
 * Test script for Resend contact form integration
 *
 * This script sends a test contact form submission to verify:
 * 1. The Netlify function is working
 * 2. Resend sends notification email to site owner
 * 3. Resend sends auto-reply email to the submitter
 *
 * Usage:
 *   node scripts/test-resend.cjs
 *
 * Or with custom test email:
 *   node scripts/test-resend.cjs your-email@example.com
 */

const https = require('https');

// Configuration
const NETLIFY_FUNCTION_URL = process.env.NETLIFY_FUNCTION_URL || 'http://localhost:8888/.netlify/functions/submit-contact';
const TEST_EMAIL = process.argv[2] || 'test@example.com';

// Test data
const testContactData = {
  name: 'Test User',
  email: TEST_EMAIL,
  message: 'This is a test message from the Resend integration test script. If you receive this, your contact form and email notifications are working correctly!',
  source: 'test_script'
};

console.log('🧪 Testing Resend Contact Form Integration\n');
console.log('Configuration:');
console.log(`  - Function URL: ${NETLIFY_FUNCTION_URL}`);
console.log(`  - Test Email: ${TEST_EMAIL}`);
console.log('\nSending test contact form submission...\n');

// Parse URL
const url = new URL(NETLIFY_FUNCTION_URL);
const isHttps = url.protocol === 'https:';
const client = isHttps ? https : require('http');

// Prepare request data
const postData = JSON.stringify(testContactData);

const options = {
  hostname: url.hostname,
  port: url.port || (isHttps ? 443 : 80),
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

// Send request
const req = client.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`Response Status: ${res.statusCode} ${res.statusMessage}\n`);

    try {
      const response = JSON.parse(data);
      console.log('Response Body:');
      console.log(JSON.stringify(response, null, 2));
      console.log('\n');

      if (res.statusCode === 200 || res.statusCode === 201) {
        console.log('✅ SUCCESS: Contact form submission worked!\n');
        console.log('Expected Results:');
        console.log('  1. ✉️  Notification email sent to site owner (check RESEND_NOTIFY_TO inbox)');
        console.log(`  2. ✉️  Auto-reply email sent to: ${TEST_EMAIL}`);
        console.log('  3. 💾 Contact saved to Supabase database');
        console.log('  4. 🔄 Contact synced to HubSpot (if configured)\n');
        console.log('⚠️  Note: Check your spam folders if emails don\'t appear in inbox\n');
      } else {
        console.log('❌ FAILED: Contact form submission failed\n');
        console.log('Debug Steps:');
        console.log('  1. Check your .env file has RESEND_API_KEY set');
        console.log('  2. Check RESEND_NOTIFY_TO and RESEND_FROM are configured');
        console.log('  3. Verify Supabase credentials are correct');
        console.log('  4. Check Netlify function logs for errors\n');
      }
    } catch (e) {
      console.log('Response (raw):');
      console.log(data);
      console.log('\n❌ Failed to parse JSON response');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ ERROR: Request failed\n');
  console.error(error.message);
  console.log('\nDebug Steps:');
  console.log('  1. Make sure Netlify Dev is running: netlify dev');
  console.log('  2. Or set NETLIFY_FUNCTION_URL environment variable to your deployed site');
  console.log('     Example: NETLIFY_FUNCTION_URL=https://yoursite.netlify.app/.netlify/functions/submit-contact node scripts/test-resend.cjs\n');
});

req.write(postData);
req.end();
