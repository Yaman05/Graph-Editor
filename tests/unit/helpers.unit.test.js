import { describe, expect, it } from "vitest";
import {
  makeUniqueId,
  parseLinkQuery,
  validateGraphData,
} from "@/components/GraphEditor/utils/helpers";

describe("helpers unit tests", () => {
  describe("makeUniqueId", () => {
    it("returns the base value when id is unused", () => {
      const id = makeUniqueId("service", [{ id: "api" }, { id: "db" }]);
      expect(id).toBe("service");
    });

    it("adds an incrementing suffix when collisions exist", () => {
      const nodes = [{ id: "api" }, { id: "api_1" }, { id: "api_2" }];
      const id = makeUniqueId("api", nodes);
      expect(id).toBe("api_3");
    });
  });

  describe("validateGraphData", () => {
    it("returns no errors for a valid graph payload", () => {
      const payload = {
        nodes: [{ id: "a" }, { id: "b" }],
        links: [{ source: "a", target: "b" }],
      };

      expect(validateGraphData(payload)).toEqual([]);
    });

    it("reports duplicate ids and bad link references", () => {
      const payload = {
        nodes: [{ id: "a" }, { id: "a" }],
        links: [{ source: "a" }, { source: "x", target: "a" }],
      };

      const errors = validateGraphData(payload);
      expect(errors.some((err) => err.includes("Duplicate node ID"))).toBe(true);
      expect(errors.some((err) => err.includes("Link target"))).toBe(true);
      expect(errors.some((err) => err.includes("Link source"))).toBe(true);
    });
  });

  describe("parseLinkQuery", () => {
    it("parses supported separators and trims whitespace", () => {
      expect(parseLinkQuery("api - db")).toEqual(["api", "db"]);
      expect(parseLinkQuery("api > db")).toEqual(["api", "db"]);
      expect(parseLinkQuery("  edge — cache  ")).toEqual(["edge", "cache"]);
    });

    it("returns null for invalid input", () => {
      expect(parseLinkQuery("")).toBeNull();
      expect(parseLinkQuery("single token")).toBeNull();
      expect(parseLinkQuery(null)).toBeNull();
    });
  });
});
