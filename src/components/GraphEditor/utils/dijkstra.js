export function dijkstra(nodes, links, startId, endId) {
  const adj = new Map();
  for (const n of nodes) adj.set(n.id, []);
  for (const l of links) {
    if (l.weight === null || l.weight === undefined || Number.isNaN(Number(l.weight))) return null;
    const w = Number(l.weight);
    adj.get(l.source)?.push({ to: l.target, w });
    if (!l.directed) {
      adj.get(l.target)?.push({ to: l.source, w });
    }
  }

  const dist = {};
  const prev = {};
  for (const n of nodes) dist[n.id] = Infinity;
  dist[startId] = 0;
  const Q = new Set(nodes.map((n) => n.id));

  while (Q.size) {
    let u = null;
    let best = Infinity;
    for (const id of Q) {
      if (dist[id] < best) {
        best = dist[id];
        u = id;
      }
    }
    if (u === null) break;
    Q.delete(u);
    if (u === endId) break;
    for (const nb of adj.get(u) || []) {
      const alt = dist[u] + nb.w;
      if (alt < dist[nb.to]) {
        dist[nb.to] = alt;
        prev[nb.to] = u;
      }
    }
  }

  if (dist[endId] === Infinity) return null;
  const path = [];
  let cur = endId;
  while (cur !== undefined) {
    path.unshift(cur);
    cur = prev[cur];
  }
  return path;
}