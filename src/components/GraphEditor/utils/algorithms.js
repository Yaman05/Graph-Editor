// src/components/GraphEditor/utils/algorithms.js
// Graph algorithms: BFS, DFS, Topological Sort, Kruskal MST,
// Cycle Detection, Failure Propagation, Connectivity Check.

function buildUndirectedAdj(nodes, links) {
  const adj = new Map();
  for (const n of nodes) adj.set(n.id, []);
  for (const l of links) {
    adj.get(l.source)?.push(l.target);
    adj.get(l.target)?.push(l.source);
  }
  return adj;
}

function buildDirectedAdj(nodes, links) {
  const adj = new Map();
  for (const n of nodes) adj.set(n.id, []);
  for (const l of links) adj.get(l.source)?.push(l.target);
  return adj;
}

/**
 * BFS from startId.
 * Returns { order: string[], visited: Set<string> }
 */
export function bfs(nodes, links, startId) {
  const adj = buildUndirectedAdj(nodes, links);
  const visited = new Set([startId]);
  const order = [];
  const queue = [startId];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const nb of adj.get(id) || []) {
      if (!visited.has(nb)) {
        visited.add(nb);
        queue.push(nb);
      }
    }
  }
  return { order, visited };
}

/**
 * DFS from startId (iterative with explicit stack to avoid stack overflow).
 * Returns { order: string[], visited: Set<string> }
 */
export function dfs(nodes, links, startId) {
  const adj = buildUndirectedAdj(nodes, links);
  const visited = new Set();
  const order = [];
  const stack = [startId];

  while (stack.length) {
    const id = stack.pop();
    if (visited.has(id)) continue;
    visited.add(id);
    order.push(id);
    // Push neighbors in reverse so the first neighbor is visited first
    const neighbors = adj.get(id) || [];
    for (let i = neighbors.length - 1; i >= 0; i--) {
      if (!visited.has(neighbors[i])) stack.push(neighbors[i]);
    }
  }
  return { order, visited };
}

/**
 * Topological sort using Kahn's algorithm (BFS-based).
 * Returns ordered node ID array, or null if the graph has cycles.
 */
export function topologicalSort(nodes, links) {
  const inDeg = new Map(nodes.map((n) => [n.id, 0]));
  const adj = new Map(nodes.map((n) => [n.id, []]));

  for (const l of links) {
    adj.get(l.source)?.push(l.target);
    inDeg.set(l.target, (inDeg.get(l.target) ?? 0) + 1);
  }

  const queue = nodes.map((n) => n.id).filter((id) => inDeg.get(id) === 0);
  const order = [];

  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const nb of adj.get(id) || []) {
      const d = (inDeg.get(nb) ?? 1) - 1;
      inDeg.set(nb, d);
      if (d === 0) queue.push(nb);
    }
  }

  return order.length === nodes.length ? order : null;
}

/**
 * Kruskal's Minimum Spanning Tree algorithm.
 * Returns the subset of links that form the MST.
 * Links without weights are ignored.
 */
export function kruskalMST(nodes, links) {
  const weighted = links
    .filter((l) => l.weight != null)
    .sort((a, b) => Number(a.weight) - Number(b.weight));

  const parent = new Map(nodes.map((n) => [n.id, n.id]));
  const rank = new Map(nodes.map((n) => [n.id, 0]));

  function find(x) {
    if (parent.get(x) !== x) parent.set(x, find(parent.get(x)));
    return parent.get(x);
  }

  function union(x, y) {
    const px = find(x);
    const py = find(y);
    if (px === py) return false;
    if ((rank.get(px) ?? 0) < (rank.get(py) ?? 0)) parent.set(px, py);
    else if ((rank.get(px) ?? 0) > (rank.get(py) ?? 0)) parent.set(py, px);
    else {
      parent.set(py, px);
      rank.set(px, (rank.get(px) ?? 0) + 1);
    }
    return true;
  }

  return weighted.filter((l) => union(l.source, l.target));
}

/**
 * Detects cycles in a directed graph using DFS coloring.
 * Returns true if at least one cycle exists.
 */
export function detectCycles(nodes, links) {
  const adj = buildDirectedAdj(nodes, links);
  // white = unvisited, gray = in current stack, black = fully processed
  const color = new Map(nodes.map((n) => [n.id, "white"]));

  function dfsColor(id) {
    color.set(id, "gray");
    for (const nb of adj.get(id) || []) {
      if (color.get(nb) === "gray") return true;
      if (color.get(nb) === "white" && dfsColor(nb)) return true;
    }
    color.set(id, "black");
    return false;
  }

  for (const n of nodes) {
    if (color.get(n.id) === "white" && dfsColor(n.id)) return true;
  }
  return false;
}

/**
 * Computes which nodes are affected by a set of failed nodes.
 * BFS downstream following directed edges (or both directions for undirected links).
 * Returns a Set of affected node IDs (does not include the failed nodes themselves).
 */
export function computeFailurePropagation(nodes, links, failedNodeIds) {
  // Build adj: follow direction for directed links, both ways for undirected
  const adj = new Map();
  for (const n of nodes) adj.set(n.id, []);
  for (const l of links) {
    adj.get(l.source)?.push(l.target);
    if (!l.directed) adj.get(l.target)?.push(l.source);
  }

  const affected = new Set();
  const queue = [...failedNodeIds];

  while (queue.length) {
    const id = queue.shift();
    for (const nb of adj.get(id) || []) {
      if (!failedNodeIds.has(nb) && !affected.has(nb)) {
        affected.add(nb);
        queue.push(nb);
      }
    }
  }

  return affected;
}

/**
 * Returns true if the graph is connected (treating all edges as undirected).
 */
export function isConnected(nodes, links) {
  if (nodes.length <= 1) return true;
  const adj = buildUndirectedAdj(nodes, links);
  const visited = new Set([nodes[0].id]);
  const queue = [nodes[0].id];

  while (queue.length) {
    const id = queue.shift();
    for (const nb of adj.get(id) || []) {
      if (!visited.has(nb)) {
        visited.add(nb);
        queue.push(nb);
      }
    }
  }

  return visited.size === nodes.length;
}
