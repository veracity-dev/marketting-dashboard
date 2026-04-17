const fs = require('fs');
const w = JSON.parse(fs.readFileSync('get-data-for-marketting-dashboard.json', 'utf8'));

// Fix the PG Log Completion node's query — bash mangled the template literals
const cl = w.nodes.find(n => n.name === 'PG Log Completion');

// The IIFE reads property_id and triggered_at from the original Webhook input
// and inserts a completion record into refresh_log.
const query = [
  "={{ (() => {",
  "  const wh = $('Webhook').first().json;",
  "  const pid = String(wh.property_id || '').replace(/'/g, \"''\");",
  "  const ta = String(wh.triggered_at || '').replace(/'/g, \"''\");",
  "  return `INSERT INTO refresh_log (property_id, triggered_at, status)",
  "    VALUES ('${pid}', '${ta}'::timestamptz, 'done')",
  "    ON CONFLICT (property_id, triggered_at)",
  "    DO UPDATE SET status = 'done', completed_at = NOW()`;",
  "})() }}"
].join(' ');

cl.parameters.query = query;

fs.writeFileSync('get-data-for-marketting-dashboard.json', JSON.stringify(w, null, 2));

// Verify
const w2 = JSON.parse(fs.readFileSync('get-data-for-marketting-dashboard.json', 'utf8'));
const cl2 = w2.nodes.find(n => n.name === 'PG Log Completion');
console.log('Query:', cl2.parameters.query);
console.log('Done.');
