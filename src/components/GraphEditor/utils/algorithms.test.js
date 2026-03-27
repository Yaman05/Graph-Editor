import { describe, it, expect } from "vitest";
import {
  bfs,
  dfs,
  topologicalSort,
  kruskalMST,
  detectCycles,
  computeFailurePropagation,
  isConnected,
} from "./algorithms";

// ─── Test fixtures ───────────────────────────────────────────────────────────

const nodes = (ids) => ids.map((id) => ({ id }));

const links = (pairs, opts = {}) =>
  pairs.map(([source, target]) => ({
    source,
    target,
    directed: opts.directed ?? true,
    weight: opts.weight ?? null,
  }));

const weightedLinks = (triples) =>
  triples.map(([source, target, weight]) => ({
    source,
    target,
    weight,
    directed: false,
  }));

// ─── BFS ─────────────────────────────────────────────────────────────────────

describe("bfs", () => {
  it("visits all reachable nodes in breadth-first order", () => {
    const n = nodes(["A", "B", "C", "D"]);
    const l = links([["A", "B"], ["A", "C"], ["B", "D"]]);
    const { order, visited } = bfs(n, l, "A");
    expect(order[0]).toBe("A");
    expect(visited.size).toBe(4);
    // B and C must appear before D
    expect(order.indexOf("B")).toBeLessThan(order.indexOf("D"));
    expect(order.indexOf("C")).toBeLessThan(order.indexOf("D"));
  });

  it("only visits connected nodes", () => {
    const n = nodes(["A", "B", "C"]);
    const l = links([["A", "B"]]); // C is isolated
    const { order } = bfs(n, l, "A");
    expect(order).not.toContain("C");
  });

  it("handles a single node with no links", () => {
    const { order } = bfs(nodes(["X"]), [], "X");
    expect(order).toEqual(["X"]);
  });
});

// ─── DFS ─────────────────────────────────────────────────────────────────────

describe("dfs", () => {
  it("visits all reachable nodes", () => {
    const n = nodes(["A", "B", "C"]);
    const l = links([["A", "B"], ["B", "C"]]);
    const { order } = dfs(n, l, "A");
    expect(order).toEqual(["A", "B", "C"]);
  });

  it("starts at the given node", () => {
    const n = nodes(["A", "B", "C"]);
    const l = links([["A", "B"], ["A", "C"]]);
    const { order } = dfs(n, l, "A");
    expect(order[0]).toBe("A");
  });

  it("does not revisit nodes in a cycle (undirected)", () => {
    const n = nodes(["A", "B", "C"]);
    const l = links([["A", "B"], ["B", "C"], ["C", "A"]]);
    const { visited } = dfs(n, l, "A");
    expect(visited.size).toBe(3);
  });
});

// ─── Topological Sort ────────────────────────────────────────────────────────

describe("topologicalSort", () => {
  it("returns a valid topological order for a DAG", () => {
    const n = nodes(["A", "B", "C", "D"]);
    // A→B, A→C, B→D, C→D
    const l = links([["A", "B"], ["A", "C"], ["B", "D"], ["C", "D"]]);
    const order = topologicalSort(n, l);
    expect(order).not.toBeNull();
    expect(order[0]).toBe("A");
    expect(order[order.length - 1]).toBe("D");
  });

  it("returns null when the graph has a cycle", () => {
    const n = nodes(["A", "B", "C"]);
    const l = links([["A", "B"], ["B", "C"], ["C", "A"]]);
    expect(topologicalSort(n, l)).toBeNull();
  });

  it("handles a single node", () => {
    expect(topologicalSort(nodes(["X"]), [])).toEqual(["X"]);
  });

  it("returns all nodes in the result", () => {
    const n = nodes(["A", "B", "C", "D", "E"]);
    const l = links([["A", "B"], ["B", "C"], ["C", "D"], ["D", "E"]]);
    const order = topologicalSort(n, l);
    expect(order?.length).toBe(5);
  });
});

// ─── Kruskal MST ─────────────────────────────────────────────────────────────

describe("kruskalMST", () => {
  it("selects n-1 edges for a fully connected graph", () => {
    const n = nodes(["A", "B", "C", "D"]);
    const l = weightedLinks([
      ["A", "B", 1],
      ["A", "C", 4],
      ["B", "C", 2],
      ["B", "D", 5],
      ["C", "D", 3],
    ]);
    const mst = kruskalMST(n, l);
    expect(mst.length).toBe(3); // n-1 = 3 edges
  });

  it("picks the lowest-weight edges", () => {
    const n = nodes(["A", "B", "C"]);
    const l = weightedLinks([
      ["A", "B", 1],
      ["A", "C", 10],
      ["B", "C", 2],
    ]);
    const mst = kruskalMST(n, l);
    const totalWeight = mst.reduce((s, e) => s + e.weight, 0);
    expect(totalWeight).toBe(3); // edges: A-B(1) + B-C(2)
  });

  it("returns empty array when no links have weights", () => {
    const n = nodes(["A", "B"]);
    const l = links([["A", "B"]]); // no weight
    expect(kruskalMST(n, l)).toEqual([]);
  });
});

// ─── Cycle Detection ─────────────────────────────────────────────────────────

describe("detectCycles", () => {
  it("detects a simple cycle A→B→C→A", () => {
    const n = nodes(["A", "B", "C"]);
    const l = links([["A", "B"], ["B", "C"], ["C", "A"]]);
    expect(detectCycles(n, l)).toBe(true);
  });

  it("returns false for a linear chain (DAG)", () => {
    const n = nodes(["A", "B", "C"]);
    const l = links([["A", "B"], ["B", "C"]]);
    expect(detectCycles(n, l)).toBe(false);
  });

  it("returns false for an empty graph", () => {
    expect(detectCycles(nodes(["A", "B"]), [])).toBe(false);
  });

  it("detects self-loops", () => {
    const n = nodes(["A"]);
    const l = links([["A", "A"]]);
    expect(detectCycles(n, l)).toBe(true);
  });
});

// ─── Failure Propagation ─────────────────────────────────────────────────────

describe("computeFailurePropagation", () => {
  it("marks downstream nodes as affected", () => {
    const n = nodes(["LB", "API1", "API2", "DB"]);
    const l = links([["LB", "API1"], ["LB", "API2"], ["API1", "DB"], ["API2", "DB"]]);
    const failed = new Set(["LB"]);
    const affected = computeFailurePropagation(n, l, failed);
    expect(affected.has("API1")).toBe(true);
    expect(affected.has("API2")).toBe(true);
    expect(affected.has("DB")).toBe(true);
  });

  it("does not include the failed node itself in affected", () => {
    const n = nodes(["A", "B"]);
    const l = links([["A", "B"]]);
    const failed = new Set(["A"]);
    const affected = computeFailurePropagation(n, l, failed);
    expect(affected.has("A")).toBe(false);
    expect(affected.has("B")).toBe(true);
  });

  it("returns empty set when no downstream nodes exist", () => {
    const n = nodes(["A", "B"]);
    const l = links([["A", "B"]]);
    const failed = new Set(["B"]); // B is a leaf
    const affected = computeFailurePropagation(n, l, failed);
    expect(affected.size).toBe(0);
  });

  it("handles multiple failed nodes", () => {
    const n = nodes(["A", "B", "C", "D"]);
    const l = links([["A", "C"], ["B", "D"]]);
    const failed = new Set(["A", "B"]);
    const affected = computeFailurePropagation(n, l, failed);
    expect(affected.has("C")).toBe(true);
    expect(affected.has("D")).toBe(true);
  });
});

// ─── Connectivity ─────────────────────────────────────────────────────────────

describe("isConnected", () => {
  it("returns true for a connected graph", () => {
    const n = nodes(["A", "B", "C"]);
    const l = links([["A", "B"], ["B", "C"]]);
    expect(isConnected(n, l)).toBe(true);
  });

  it("returns false when a node is isolated", () => {
    const n = nodes(["A", "B", "C"]);
    const l = links([["A", "B"]]); // C is isolated
    expect(isConnected(n, l)).toBe(false);
  });

  it("returns true for a single node", () => {
    expect(isConnected(nodes(["A"]), [])).toBe(true);
  });

  it("returns true for an empty graph", () => {
    expect(isConnected([], [])).toBe(true);
  });
});
