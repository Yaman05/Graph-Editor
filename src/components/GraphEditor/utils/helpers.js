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

// Parse link query "A - B" (symmetrical)
export function parseLinkQuery(q) {
  if (!q) return null;
  const m = q.match(/^\s*(.+?)\s*[-–—>]\s*(.+?)\s*$/);
  if (!m) return null;
  return [m[1].trim(), m[2].trim()];
}
