import { describe, expect, it } from "vitest";
import { dijkstra } from "@/components/GraphEditor/utils/dijkstra";

describe("dijkstra unit tests", () => {
  const nodes = [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }];

  it("finds the cheapest path in a weighted directed graph", () => {
    const links = [
      { source: "A", target: "B", weight: 1, directed: true },
      { source: "A", target: "C", weight: 5, directed: true },
      { source: "B", target: "C", weight: 1, directed: true },
      { source: "C", target: "D", weight: 2, directed: true },
      { source: "B", target: "D", weight: 10, directed: true },
    ];

    expect(dijkstra(nodes, links, "A", "D")).toEqual(["A", "B", "C", "D"]);
  });

  it("supports undirected edges", () => {
    const links = [{ source: "A", target: "B", weight: 3, directed: false }];
    expect(dijkstra(nodes, links, "B", "A")).toEqual(["B", "A"]);
  });

  it("returns null when any link has invalid weight", () => {
    const links = [{ source: "A", target: "B", weight: undefined, directed: true }];
    expect(dijkstra(nodes, links, "A", "B")).toBeNull();
  });

  it("returns null when destination is unreachable", () => {
    const links = [{ source: "A", target: "B", weight: 1, directed: true }];
    expect(dijkstra(nodes, links, "A", "D")).toBeNull();
  });
});
