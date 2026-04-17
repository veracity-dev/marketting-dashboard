const fs = require('fs');
const w = JSON.parse(fs.readFileSync('get-data-for-marketting-dashboard.json', 'utf8'));

const cl = w.nodes.find(n => n.name === 'PG Log Completion');

// Simple INSERT — no triggered_at, no upsert. Just append one new row.
// property_id comes from the original Webhook input.
// completed_at defaults to NOW() in PostgreSQL.
const query = [
  "={{ (() => {",
  "  const pid = String($('Webhook').first().json.property_id || '').replace(/'/g, \"''\");",
  "  return `INSERT INTO refresh_log (property_id, status) VALUES ('${pid}', 'done')`;",
  "})() }}"
].join(' ');

cl.parameters.query = query;

fs.writeFileSync('get-data-for-marketting-dashboard.json', JSON.stringify(w, null, 2));
console.log('Query:', cl.parameters.query);
console.log('Done.');
