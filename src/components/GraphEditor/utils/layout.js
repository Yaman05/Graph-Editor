// src/components/GraphEditor/utils/layout.js
// Layout-helper: Hierarchical (parent→child) + Circular

// Hierarchical layout helper
// Relationships: source = parent, target = child.
export function computeHierarchyPositions(nodes, links, direction, width, height) {
  const idToNode = new Map(nodes.map((n) => [n.id, { ...n }]));
  const indegree = new Map(nodes.map((n) => [n.id, 0]));
  const adj = new Map(nodes.map((n) => [n.id, []]));

  for (const l of links) {
    if (!idToNode.has(l.source) || !idToNode.has(l.target)) continue;
    // source -> target means parent -> child
    adj.get(l.source).push(l.target);
    indegree.set(l.target, (indegree.get(l.target) || 0) + 1);
  }

  const roots = nodes.filter((n) => (indegree.get(n.id) || 0) === 0).map((n) => n.id);
  const visited = new Set();
  const layers = [];
  const queue = [...roots];
  if (queue.length === 0 && nodes.length) queue.push(nodes[0].id);

  const depthMap = new Map();

  while (queue.length) {
    const id = queue.shift();
    if (visited.has(id)) continue;
    // depth = max(parentDepth) + 1. Roots have 0.
    let d = 0;
    for (const l of links) {
      if (l.target === id) {
        const p = depthMap.get(l.source);
        if (p !== undefined) d = Math.max(d, p + 1);
      }
    }
    depthMap.set(id, d);
    visited.add(id);
    for (const nb of adj.get(id) || []) {
      if (!visited.has(nb)) queue.push(nb);
    }
  }

  nodes.forEach((n) => {
    if (!depthMap.has(n.id)) depthMap.set(n.id, 0);
  });

  const maxDepth = Math.max(...Array.from(depthMap.values()));
  for (let i = 0; i <= maxDepth; i++) layers.push([]);
  for (const [id, d] of depthMap.entries()) layers[d].push(id);

  const padding = 40;
  const usableW = Math.max(200, width - padding * 2);
  const usableH = Math.max(200, height - padding * 2);
  const depthCount = Math.max(1, layers.length);

  const positions = new Map();
  for (let d = 0; d < layers.length; d++) {
    const row = layers[d];
    const count = Math.max(1, row.length);
    for (let i = 0; i < row.length; i++) {
      const id = row[i];
      if (direction === "TB") {
        const x = padding + (i + 0.5) * (usableW / count);
        const y = padding + (d + 0.5) * (usableH / depthCount);
        positions.set(id, { x, y });
      } else {
        const x = padding + (d + 0.5) * (usableW / depthCount);
        const y = padding + (i + 0.5) * (usableH / count);
        positions.set(id, { x, y });
      }
    }
  }
  return positions;
}

// Circular layout helper
export function computeCircularPositions(nodes, width, height) {
  const padding = 60;
  const cx = Math.max(width / 2, 200);
  const cy = Math.max(height / 2, 200);
  const radius = Math.max(
    100,
    Math.min(width, height) / 2 - padding
  );

  const positions = new Map();
  const N = Math.max(1, nodes.length);
  for (let i = 0; i < nodes.length; i++) {
    const theta = (2 * Math.PI * i) / N - Math.PI / 2; 
    const x = cx + radius * Math.cos(theta);
    const y = cy + radius * Math.sin(theta);
    positions.set(nodes[i].id, { x, y });
  }
  return positions;
}
