import { describe, expect, it } from "vitest";
import {
  computeCircularPositions,
  computeHierarchyPositions,
} from "@/components/GraphEditor/utils/layout";

describe("layout unit tests", () => {
  it("places nodes in increasing depth for top-to-bottom hierarchy", () => {
    const nodes = [{ id: "root" }, { id: "mid" }, { id: "leaf" }];
    const links = [
      { source: "root", target: "mid" },
      { source: "mid", target: "leaf" },
    ];

    const positions = computeHierarchyPositions(nodes, links, "TB", 800, 600);

    expect(positions.get("root").y).toBeLessThan(positions.get("mid").y);
    expect(positions.get("mid").y).toBeLessThan(positions.get("leaf").y);
  });

  it("places nodes in increasing depth for left-to-right hierarchy", () => {
    const nodes = [{ id: "root" }, { id: "mid" }, { id: "leaf" }];
    const links = [
      { source: "root", target: "mid" },
      { source: "mid", target: "leaf" },
    ];

    const positions = computeHierarchyPositions(nodes, links, "LR", 800, 600);

    expect(positions.get("root").x).toBeLessThan(positions.get("mid").x);
    expect(positions.get("mid").x).toBeLessThan(positions.get("leaf").x);
  });

  it("returns deterministic circular positions for every node", () => {
    const nodes = [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }];
    const positions = computeCircularPositions(nodes, 900, 700);

    expect(positions.size).toBe(nodes.length);
    for (const node of nodes) {
      const pos = positions.get(node.id);
      expect(Number.isFinite(pos.x)).toBe(true);
      expect(Number.isFinite(pos.y)).toBe(true);
    }
  });
});
