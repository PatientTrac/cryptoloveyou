#!/usr/bin/env node
/**
 * Enable Grok chat widget on all static pages.
 * - Inserts <script src="/js/grok-chat-widget.js" defer></script> before </body>
 * - Skips files that already include it
 * - Skips SEO_Files/ by default (set INCLUDE_SEO_FILES=1 to include)
 *
 * Run: node scripts/enable-chatbot-everywhere.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INCLUDE_SEO = process.env.INCLUDE_SEO_FILES === '1';

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.cursor',
]);

const WIDGET_SNIPPET =
  '\n<!-- Grok AI Chatbot Widget -->\n' +
  '<script src="/js/grok-chat-widget.js" defer></script>\n';

function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    if (!INCLUDE_SEO && e.isDirectory() && e.name === 'SEO_Files') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.isFile() && e.name.endsWith('.html')) out.push(full);
  }
}

function enableInFile(file) {
  let html;
  try {
    html = fs.readFileSync(file, 'utf8');
  } catch {
    return false;
  }

  if (html.includes('/js/grok-chat-widget.js')) return false;

  const idx = html.toLowerCase().lastIndexOf('</body>');
  if (idx === -1) return false;

  const next = html.slice(0, idx) + WIDGET_SNIPPET + html.slice(idx);
  if (next === html) return false;

  fs.writeFileSync(file, next, 'utf8');
  return true;
}

function main() {
  const files = [];
  walk(ROOT, files);

  let updated = 0;
  let skipped = 0;
  for (const f of files) {
    const ok = enableInFile(f);
    ok ? updated++ : skipped++;
  }

  console.log('Done. Updated:', updated, 'Skipped:', skipped);
  if (!INCLUDE_SEO) {
    console.log('Note: SEO_Files/ was skipped (set INCLUDE_SEO_FILES=1 to include).');
  }
}

main();

