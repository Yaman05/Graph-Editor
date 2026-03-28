// Helper functions

// Generate unique internal id (keeps label separate)
export function makeUniqueId(base, nodes) {
  let i = 1;
  let id = base;
  while (nodes.find((n) => n.id === id)) {
    id = `${base}_${i++}`;
  }
  return id;
}

// Validate imported graph data. Returns array of error strings (empty = valid).
export function validateGraphData(parsed) {
  const errors = [];
  if (!Array.isArray(parsed.nodes)) { errors.push("'nodes' must be an array."); return errors; }
  if (!Array.isArray(parsed.links)) { errors.push("'links' must be an array."); return errors; }

  const ids = new Set();
  for (const n of parsed.nodes) {
    if (!n.id || typeof n.id !== "string") { errors.push(`Node missing valid 'id': ${JSON.stringify(n)}`); continue; }
    if (ids.has(n.id)) errors.push(`Duplicate node ID: "${n.id}"`);
    ids.add(n.id);
  }

  for (const l of parsed.links) {
    if (!l.source || !ids.has(l.source)) errors.push(`Link source "${l.source}" not found in nodes.`);
    if (!l.target || !ids.has(l.target)) errors.push(`Link target "${l.target}" not found in nodes.`);
  }

  return errors;
}

// Parse link query "A - B" (symmetrical)
export function parseLinkQuery(q) {
  if (!q) return null;
  const m = q.match(/^\s*(.+?)\s*[-–—>]\s*(.+?)\s*$/);
  if (!m) return null;
  return [m[1].trim(), m[2].trim()];
}
