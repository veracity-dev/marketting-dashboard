const fs = require('fs');
const w = JSON.parse(fs.readFileSync('get-data-for-marketting-dashboard.json', 'utf8'));

// 1. Add a Limit node (passes only 1 item) between Merge Results and PG Log Completion
const limitNode = {
  id: "aabb1122-3344-5566-7788-99aabbccddee",
  name: "Limit to 1",
  type: "n8n-nodes-base.limit",
  typeVersion: 1,
  position: [2594, 2096],  // between Merge Results (2464) and PG Log Completion (2724)
  parameters: {
    maxItems: 1
  }
};

w.nodes.push(limitNode);

// 2. Fix PG Log Completion query — add .body to property_id path
const cl = w.nodes.find(n => n.name === 'PG Log Completion');
cl.parameters.query = [
  "={{ (() => {",
  "  const pid = String($('Webhook').first().json.body.property_id || '').replace(/'/g, \"''\");",
  "  return `INSERT INTO refresh_log (property_id, status) VALUES ('${pid}', 'done')`;",
  "})() }}"
].join(' ');

// 3. Rewire connections: Merge Results → Limit to 1 → PG Log Completion
//    Currently: Merge Results → PG Log Completion
//    Change to: Merge Results → Limit to 1, then Limit to 1 → PG Log Completion

// Update Merge Results output to point to Limit node
w.connections["Merge Results"].main[0] = [
  { node: "Limit to 1", type: "main", index: 0 }
];

// Add Limit to 1 → PG Log Completion connection
w.connections["Limit to 1"] = {
  main: [
    [{ node: "PG Log Completion", type: "main", index: 0 }]
  ]
};

fs.writeFileSync('get-data-for-marketting-dashboard.json', JSON.stringify(w, null, 2));
console.log('Added "Limit to 1" node between Merge Results and PG Log Completion');
console.log('Fixed property_id path to include .body');
console.log('Done.');
