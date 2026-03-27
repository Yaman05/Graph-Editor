// src/components/GraphEditor/GraphEditor.jsx
// Network Topology Editor — visualize, analyze, and simulate failure propagation
// in distributed system architectures.

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";

import { useHistoryState } from "./utils/history";
import { makeUniqueId, parseLinkQuery } from "./utils/helpers";
import { dijkstra } from "./utils/dijkstra";
import {
  bfs,
  dfs,
  topologicalSort,
  kruskalMST,
  detectCycles,
  computeFailurePropagation,
  isConnected,
} from "./utils/algorithms";
import { computeHierarchyPositions, computeCircularPositions } from "./utils/layout";
import { NODE_TYPE_COLORS, NODE_TYPES, FAILURE_COLORS } from "./styles";

import Modal from "./Modal";
import Sidebar from "./Sidebar";
import DrilldownPanel from "./DrilldownPanel";

// Default topology: a realistic web-service architecture
const DEFAULT_DATA = {
  nodes: [
    {
      id: "browser",
      label: "Browser",
      nodeType: "client",
      subGraph: { nodes: [], links: [] },
    },
    {
      id: "cdn",
      label: "CDN",
      nodeType: "server",
      subGraph: { nodes: [], links: [] },
    },
    {
      id: "lb",
      label: "Load Balancer",
      nodeType: "loadbalancer",
      subGraph: {
        nodes: [
          { id: "health", label: "Health Check", nodeType: "microservice" },
          { id: "router", label: "Request Router", nodeType: "microservice" },
        ],
        links: [{ source: "health", target: "router", directed: true }],
      },
    },
    {
      id: "api1",
      label: "API Server 1",
      nodeType: "api",
      subGraph: {
        nodes: [
          { id: "auth", label: "Auth", nodeType: "microservice" },
          { id: "handler", label: "Handler", nodeType: "microservice" },
          { id: "validator", label: "Validator", nodeType: "microservice" },
        ],
        links: [
          { source: "auth", target: "handler", directed: true },
          { source: "handler", target: "validator", directed: true },
        ],
      },
    },
    {
      id: "api2",
      label: "API Server 2",
      nodeType: "api",
      subGraph: { nodes: [], links: [] },
    },
    {
      id: "postgres",
      label: "PostgreSQL",
      nodeType: "database",
      subGraph: {
        nodes: [
          { id: "primary", label: "Primary", nodeType: "database" },
          { id: "replica", label: "Replica", nodeType: "database" },
        ],
        links: [{ source: "primary", target: "replica", directed: true }],
      },
    },
    {
      id: "redis",
      label: "Redis Cache",
      nodeType: "cache",
      subGraph: { nodes: [], links: [] },
    },
    {
      id: "queue",
      label: "Message Queue",
      nodeType: "queue",
      subGraph: { nodes: [], links: [] },
    },
    {
      id: "worker",
      label: "Worker Service",
      nodeType: "microservice",
      subGraph: { nodes: [], links: [] },
    },
    {
      id: "firewall",
      label: "Firewall",
      nodeType: "firewall",
      subGraph: { nodes: [], links: [] },
    },
  ],
  links: [
    { source: "browser",  target: "firewall", directed: true,  weight: 1  },
    { source: "firewall", target: "cdn",       directed: true,  weight: 2  },
    { source: "firewall", target: "lb",        directed: true,  weight: 2  },
    { source: "lb",       target: "api1",      directed: true,  weight: 3  },
    { source: "lb",       target: "api2",      directed: true,  weight: 3  },
    { source: "api1",     target: "postgres",  directed: true,  weight: 8  },
    { source: "api2",     target: "postgres",  directed: true,  weight: 8  },
    { source: "api1",     target: "redis",     directed: true,  weight: 2  },
    { source: "api2",     target: "redis",     directed: true,  weight: 2  },
    { source: "api1",     target: "queue",     directed: true,  weight: 4  },
    { source: "queue",    target: "worker",    directed: true,  weight: 5  },
  ],
};

export default function GraphEditor() {
  const svgRef = useRef(null);
  const fileInputRef = useRef(null);
  const simRef = useRef(null);

  // Core graph state
  const [data, updateData, historyCtrl] = useHistoryState(DEFAULT_DATA);

  // UI state
  const [selected, setSelected] = useState({ type: null, id: null });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [modalConfig, setModalConfig] = useState(null);
  const [layoutType, setLayoutType] = useState("NORMAL");
  const [hierDirection, setHierDirection] = useState("TB");

  // Analysis (degree / pagerank)
  const [analysis, setAnalysis] = useState(null);

  // Algorithm results (BFS / DFS / topological / MST)
  const [algorithmResult, setAlgorithmResult] = useState(null);

  // Shortest path
  const [shortestPath, setShortestPath] = useState([]);

  // Failure simulation
  const [failureMode, setFailureMode] = useState(false);
  const [failedNodes, setFailedNodes] = useState(new Set());
  const [affectedNodes, setAffectedNodes] = useState(new Set());

  // Drill-down panel
  const [drilldownNodeId, setDrilldownNodeId] = useState(null);

  // Versions (localStorage)
  const [versions, setVersions] = useState(() => {
    try {
      const raw = localStorage.getItem("graph_versions");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Derived graph statistics
  const graphStats = useMemo(() => {
    const n = data.nodes.length;
    const e = data.links.length;
    const maxEdges = n > 1 ? n * (n - 1) : 1;
    return {
      nodes: n,
      links: e,
      density: maxEdges > 0 ? (e / maxEdges).toFixed(3) : "0",
      connected: isConnected(data.nodes, data.links),
      hasCycles: detectCycles(data.nodes, data.links),
    };
  }, [data]);

  function saveVersions(v) {
    setVersions(v);
    try {
      localStorage.setItem("graph_versions", JSON.stringify(v));
    } catch (e) {
      console.warn("Failed to save versions to localStorage", e);
    }
  }

  function applyChange(mutator) {
    updateData(mutator(data));
    setSelected({ type: null, id: null });
    setShortestPath([]);
    setAlgorithmResult(null);
  }

  function clearAllHighlights() {
    setShortestPath([]);
    setAlgorithmResult(null);
    setAnalysis(null);
    setFailedNodes(new Set());
    setAffectedNodes(new Set());
  }

  /* -------------------------
     D3 Rendering
     ------------------------- */
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svg = d3.select(svgEl);
    const rect = svgEl.getBoundingClientRect();
    const width = rect.width || window.innerWidth;
    const height = rect.height || window.innerHeight;

    svg.selectAll("*").remove();
    const container = svg.append("g").attr("class", "container");
    svg.call(
      d3.zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", (e) => container.attr("transform", e.transform))
    );

    // Arrowhead marker
    const defs = svg.append("defs");
    defs
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 22)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#6c63ff");

    // Failure mode arrowhead (red)
    defs
      .append("marker")
      .attr("id", "arrowhead-fail")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 22)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", FAILURE_COLORS.failed);

    const filterIds = filter
      ? filter.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const visibleNodes = filterIds.length
      ? data.nodes.filter((n) => filterIds.includes(n.id))
      : data.nodes;
    const visibleLinks = filterIds.length
      ? data.links.filter(
          (l) => filterIds.includes(l.source) && filterIds.includes(l.target)
        )
      : data.links;

    const nodesCopy = visibleNodes.map((n) => ({ ...n }));
    const linksCopy = visibleLinks.map((l) => ({ ...l }));

    let usingSimulation = true;

    if (layoutType === "HIERARCHICAL") {
      const positions = computeHierarchyPositions(
        nodesCopy,
        linksCopy,
        hierDirection,
        width,
        height
      );
      nodesCopy.forEach((n) => {
        const pos = positions.get(n.id);
        n.x = pos?.x ?? width / 2;
        n.y = pos?.y ?? height / 2;
        n.fx = n.x;
        n.fy = n.y;
      });
      usingSimulation = false;
      simRef.current?.stop();
    } else if (layoutType === "CIRCULAR") {
      const positions = computeCircularPositions(nodesCopy, width, height);
      nodesCopy.forEach((n) => {
        const pos = positions.get(n.id);
        n.x = pos?.x ?? width / 2;
        n.y = pos?.y ?? height / 2;
        n.fx = n.x;
        n.fy = n.y;
      });
      usingSimulation = false;
      simRef.current?.stop();
    } else {
      const simulation = d3
        .forceSimulation(nodesCopy)
        .force(
          "link",
          d3.forceLink(linksCopy).id((d) => d.id).distance(100)
        )
        .force("charge", d3.forceManyBody().strength(-280))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .on("tick", ticked);
      simRef.current = simulation;
      usingSimulation = true;
    }

    const linkGroup = container.append("g").attr("class", "links");
    const nodeGroup = container.append("g").attr("class", "nodes");

    const linkQuery = parseLinkQuery(search);
    const nodeSearch = search && !linkQuery ? search.toLowerCase() : null;

    // --- Links ---
    const linkSel = linkGroup
      .selectAll("line")
      .data(linksCopy)
      .join("line")
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.7)
      .style("cursor", "pointer")
      .on("click", (e, d) => {
        e.stopPropagation();
        if (failureMode) return;
        const src = typeof d.source === "object" ? d.source.id : d.source;
        const tgt = typeof d.target === "object" ? d.target.id : d.target;
        setSelected({ type: "link", id: { source: src, target: tgt } });
      });

    function getLinkColor(d) {
      const src = typeof d.source === "object" ? d.source.id : d.source;
      const tgt = typeof d.target === "object" ? d.target.id : d.target;

      // MST mode: dim non-MST edges
      if (algorithmResult?.type === "mst") {
        const isMst = algorithmResult.edges.some((e) => {
          const es = typeof e.source === "object" ? e.source.id : e.source;
          const et = typeof e.target === "object" ? e.target.id : e.target;
          return (es === src && et === tgt) || (es === tgt && et === src);
        });
        return isMst ? "#ffd166" : "#1e1e2e";
      }

      // Failure propagation coloring
      const srcFailed = failedNodes.has(src);
      const tgtFailed = failedNodes.has(tgt);
      const srcAffected = affectedNodes.has(src);
      const tgtAffected = affectedNodes.has(tgt);
      if (srcFailed || tgtFailed) return FAILURE_COLORS.failed;
      if (srcAffected || tgtAffected) return FAILURE_COLORS.affected;

      const isSel =
        selected.type === "link" &&
        selected.id?.source === src &&
        selected.id?.target === tgt;
      const isSearched =
        linkQuery &&
        ((linkQuery[0] === src && linkQuery[1] === tgt) ||
          (linkQuery[0] === tgt && linkQuery[1] === src));
      let inPath = false;
      for (let i = 0; i < shortestPath.length - 1; i++) {
        const a = shortestPath[i],
          b = shortestPath[i + 1];
        if ((a === src && b === tgt) || (a === tgt && b === src)) {
          inPath = true;
          break;
        }
      }
      if (inPath) return "#ffd166";
      if (isSel) return "#ff7b00";
      if (isSearched) return "#00eaff";
      return "#6c63ff";
    }

    linkSel
      .attr("stroke", getLinkColor)
      .attr("marker-end", (d) => {
        const src = typeof d.source === "object" ? d.source.id : d.source;
        const showArrow =
          layoutType === "HIERARCHICAL" ||
          (layoutType === "NORMAL" && d.directed);
        if (!showArrow) return null;
        if (failedNodes.has(src)) return "url(#arrowhead-fail)";
        return "url(#arrowhead)";
      });

    // Weight labels
    const weightLabels = linkGroup
      .selectAll("text")
      .data(linksCopy)
      .join("text")
      .attr("fill", "#cfcfe0")
      .attr("font-size", 10)
      .attr("text-anchor", "middle")
      .text((d) => (d.weight == null ? "" : d.weight));

    // --- Nodes ---
    let colorScale = null;
    if (analysis?.values) {
      const values = Object.values(analysis.values);
      const min = Math.min(...values);
      const max = Math.max(...values);
      colorScale = d3
        .scaleLinear()
        .domain([min, max])
        .range(["#6c63ff", "#ffd166"]);
    }

    function getNodeFill(d) {
      // Priority 1: failure simulation
      if (failedNodes.has(d.id)) return FAILURE_COLORS.failed;
      if (affectedNodes.has(d.id)) return FAILURE_COLORS.affected;

      // Priority 2: algorithm traversal (BFS/DFS)
      if (
        algorithmResult?.type === "bfs" ||
        algorithmResult?.type === "dfs"
      ) {
        if (algorithmResult.visited.has(d.id)) {
          const idx = algorithmResult.order.indexOf(d.id);
          const t = idx / Math.max(1, algorithmResult.order.length - 1);
          return d3.interpolate("#00eaff", "#6c63ff")(t);
        }
      }
      // Topological sort: color by order index
      if (algorithmResult?.type === "topological") {
        const idx = algorithmResult.order.indexOf(d.id);
        if (idx !== -1) {
          const t = idx / Math.max(1, algorithmResult.order.length - 1);
          return d3.interpolate("#6c63ff", "#ffd166")(t);
        }
      }

      // Priority 3: existing analysis (degree/pagerank)
      if (analysis?.values && colorScale) {
        return colorScale(analysis.values[d.id] ?? 0);
      }

      // Priority 4: shortest path
      if (shortestPath.includes(d.id)) return "#ffd166";

      // Priority 5: selected / search
      if (selected.type === "node" && selected.id === d.id) return "#ff7b00";
      if (nodeSearch && d.label.toLowerCase().includes(nodeSearch))
        return "#00eaff";

      // Priority 6: node type color
      return NODE_TYPE_COLORS[d.nodeType] || "#2f2f37";
    }

    const node = nodeGroup
      .selectAll("g")
      .data(nodesCopy, (d) => d.id)
      .join((enter) => {
        const g = enter.append("g");
        g.append("circle").attr("r", (d) =>
          Math.max(18, 14 + (d.label?.length || 0) * 1.5)
        );
        g.append("text")
          .attr("y", 5)
          .attr("text-anchor", "middle")
          .attr("fill", "#f5f5f7")
          .style("pointer-events", "none")
          .style("font-size", 11)
          .style("font-weight", "600");
        return g;
      });

    node
      .select("circle")
      .attr("fill", getNodeFill)
      .attr("stroke", (d) => {
        if (failedNodes.has(d.id)) return "#ff0000";
        if (affectedNodes.has(d.id)) return "#f97316";
        if (d.subGraph?.nodes?.length > 0) return "#00eaff"; // has sub-graph indicator
        return "#6c63ff";
      })
      .attr("stroke-width", (d) => {
        if (failedNodes.has(d.id) || affectedNodes.has(d.id)) return 3;
        if (d.subGraph?.nodes?.length > 0) return 2.5;
        return 1.5;
      })
      .attr("stroke-dasharray", (d) =>
        d.subGraph?.nodes?.length > 0 && !failedNodes.has(d.id) ? "5,3" : null
      )
      .style("cursor", failureMode ? "crosshair" : "pointer")
      .on("click", (e, d) => {
        e.stopPropagation();
        if (failureMode) {
          // Toggle failed state
          const newFailed = new Set(failedNodes);
          if (newFailed.has(d.id)) {
            newFailed.delete(d.id);
          } else {
            newFailed.add(d.id);
          }
          setFailedNodes(newFailed);
          setAffectedNodes(
            computeFailurePropagation(data.nodes, data.links, newFailed)
          );
          return;
        }
        setSelected({ type: "node", id: d.id });
      })
      .call(
        d3
          .drag()
          .on("start", (e, d) => {
            if (usingSimulation && simRef.current && !e.active)
              simRef.current.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (e, d) => {
            d.fx = e.x;
            d.fy = e.y;
            if (!usingSimulation) ticked();
          })
          .on("end", (e, d) => {
            if (usingSimulation && simRef.current && !e.active)
              simRef.current.alphaTarget(0);
            if (
              layoutType === "HIERARCHICAL" ||
              layoutType === "CIRCULAR"
            ) {
              // keep fixed in non-force layouts
            } else {
              d.fx = null;
              d.fy = null;
            }
          })
      );

    node.select("text").text((d) => d.label || d.id);

    // Analysis value labels
    if (analysis?.values) {
      node
        .append("text")
        .attr("y", -24)
        .attr("text-anchor", "middle")
        .attr("fill", "#cfcfe0")
        .style("font-size", 10)
        .style("pointer-events", "none")
        .text((d) => {
          const v = analysis.values[d.id];
          return v != null ? Number(v).toFixed(2) : "";
        });
    }

    // Algorithm order labels (topological / BFS / DFS)
    if (algorithmResult?.order) {
      node
        .append("text")
        .attr("y", -24)
        .attr("text-anchor", "middle")
        .attr("fill", "#ffd166")
        .style("font-size", 10)
        .style("pointer-events", "none")
        .text((d) => {
          const idx = algorithmResult.order.indexOf(d.id);
          return idx !== -1 ? `#${idx + 1}` : "";
        });
    }

    // Failure mode: show "FAILED" / "AFFECTED" label
    if (failureMode) {
      node
        .filter((d) => failedNodes.has(d.id))
        .append("text")
        .attr("y", -26)
        .attr("text-anchor", "middle")
        .attr("fill", FAILURE_COLORS.failed)
        .style("font-size", 9)
        .style("font-weight", "700")
        .style("pointer-events", "none")
        .text("FAILED");

      node
        .filter((d) => affectedNodes.has(d.id))
        .append("text")
        .attr("y", -26)
        .attr("text-anchor", "middle")
        .attr("fill", FAILURE_COLORS.affected)
        .style("font-size", 9)
        .style("font-weight", "700")
        .style("pointer-events", "none")
        .text("AFFECTED");
    }

    function ticked() {
      linkSel
        .attr("x1", (d) =>
          typeof d.source === "object"
            ? d.source.x
            : nodesCopy.find((n) => n.id === d.source)?.x
        )
        .attr("y1", (d) =>
          typeof d.source === "object"
            ? d.source.y
            : nodesCopy.find((n) => n.id === d.source)?.y
        )
        .attr("x2", (d) =>
          typeof d.target === "object"
            ? d.target.x
            : nodesCopy.find((n) => n.id === d.target)?.x
        )
        .attr("y2", (d) =>
          typeof d.target === "object"
            ? d.target.y
            : nodesCopy.find((n) => n.id === d.target)?.y
        );

      weightLabels
        .attr("x", (d) => {
          const sx =
            typeof d.source === "object"
              ? d.source.x
              : nodesCopy.find((n) => n.id === d.source)?.x ?? 0;
          const tx =
            typeof d.target === "object"
              ? d.target.x
              : nodesCopy.find((n) => n.id === d.target)?.x ?? 0;
          return (sx + tx) / 2;
        })
        .attr("y", (d) => {
          const sy =
            typeof d.source === "object"
              ? d.source.y
              : nodesCopy.find((n) => n.id === d.source)?.y ?? 0;
          const ty =
            typeof d.target === "object"
              ? d.target.y
              : nodesCopy.find((n) => n.id === d.target)?.y ?? 0;
          return (sy + ty) / 2 - 8;
        });

      node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    }

    if (!usingSimulation) ticked();

    svg.on("click", () => {
      if (!failureMode) {
        setSelected({ type: null, id: null });
        setShortestPath([]);
      }
    });

    return () => {
      try {
        simRef.current?.stop();
        simRef.current = null;
      } catch {}
    };
  }, [
    data,
    search,
    filter,
    selected,
    shortestPath,
    layoutType,
    hierDirection,
    analysis,
    algorithmResult,
    failureMode,
    failedNodes,
    affectedNodes,
  ]);

  /* -------------------------
     Modal helpers
     ------------------------- */
  function openAddNodeModal() {
    setModalConfig({
      title: "Add Node",
      fields: [
        {
          name: "label",
          label: "Label",
          defaultValue: "",
          placeholder: "e.g., API Gateway",
          autoFocus: true,
        },
        {
          name: "nodeType",
          label: "Node Type",
          defaultValue: "server",
          options: NODE_TYPES,
        },
      ],
      onSubmit: ({ label, nodeType }) => {
        if (!label.trim()) return setModalConfig(null);

        // Validate: warn on duplicate label
        const duplicate = data.nodes.some(
          (n) => n.label.trim().toLowerCase() === label.trim().toLowerCase()
        );
        if (duplicate) {
          const proceed = window.confirm(
            `A node named "${label}" already exists. Add anyway?`
          );
          if (!proceed) return setModalConfig(null);
        }

        applyChange((d) => {
          const idBase = label.replace(/\s+/g, "_").toLowerCase() || "node";
          const id = makeUniqueId(idBase, d.nodes);
          return {
            nodes: [
              ...d.nodes,
              {
                id,
                label: label.trim(),
                nodeType: nodeType || "server",
                subGraph: { nodes: [], links: [] },
              },
            ],
            links: d.links,
          };
        });
        setModalConfig(null);
      },
    });
  }

  function openAddLinkModal() {
    if (selected.type !== "node") return alert("Select a source node first.");
    const selectedNode = selected.id;
    const hierarchical = layoutType === "HIERARCHICAL";
    const isNormal = layoutType === "NORMAL";

    setModalConfig({
      title: hierarchical
        ? `Add Link (selected = ${selectedNode}, relation Parent/Child)`
        : `Add Link from "${selectedNode}"`,
      fields: [
        hierarchical
          ? {
              name: "relation",
              label: "Relation",
              defaultValue: "parent→child",
              options: ["parent→child", "child→parent"],
            }
          : {
              name: "direction",
              label: "Direction",
              defaultValue: "outgoing",
              options: ["outgoing", "incoming"],
            },
        {
          name: "other",
          label: "Other node id",
          defaultValue: "",
          placeholder: "Existing node id",
        },
        {
          name: "weight",
          label: "Weight (optional)",
          defaultValue: "",
          placeholder: "Number or leave blank",
        },
        ...(isNormal
          ? [
              {
                name: "directed",
                label: "Directed?",
                defaultValue: "yes",
                options: ["yes", "no"],
              },
            ]
          : []),
      ],
      onSubmit: ({ relation, direction, other, weight, directed }) => {
        if (!other.trim()) return setModalConfig(null);
        const otherNode = data.nodes.find((n) => n.id === other.trim());
        if (!otherNode) {
          alert(`Node "${other}" not found.`);
          return setModalConfig(null);
        }

        let source, target;
        if (hierarchical) {
          [source, target] =
            relation === "child→parent"
              ? [other, selectedNode]
              : [selectedNode, other];
        } else {
          [source, target] =
            direction === "outgoing"
              ? [selectedNode, other]
              : [other, selectedNode];
        }

        if (data.links.some((l) => l.source === source && l.target === target)) {
          alert("Link already exists in that direction.");
          return setModalConfig(null);
        }

        const w =
          weight === ""
            ? null
            : isNaN(Number(weight))
            ? null
            : Number(weight);
        const isDirected = !isNormal || directed === "yes";

        applyChange((d) => ({
          nodes: d.nodes,
          links: [
            ...d.links,
            { source, target, weight: w, directed: isDirected },
          ],
        }));
        setModalConfig(null);
      },
    });
  }

  function openEditNodeModal() {
    if (selected.type !== "node") return alert("Select a node first.");
    const node = data.nodes.find((n) => n.id === selected.id);
    if (!node) return;

    setModalConfig({
      title: `Edit Node "${node.id}"`,
      fields: [
        {
          name: "label",
          label: "Label",
          defaultValue: node.label,
          placeholder: "New label",
          autoFocus: true,
        },
        {
          name: "nodeType",
          label: "Node Type",
          defaultValue: node.nodeType || "server",
          options: NODE_TYPES,
        },
      ],
      onSubmit: ({ label, nodeType }) => {
        if (!label.trim()) return setModalConfig(null);
        applyChange((d) => ({
          nodes: d.nodes.map((n) =>
            n.id === node.id
              ? { ...n, label: label.trim(), nodeType: nodeType || n.nodeType }
              : n
          ),
          links: d.links,
        }));
        setModalConfig(null);
      },
    });
  }

  function openEditLinkModal() {
    if (selected.type !== "link") return alert("Select a link first.");
    const { source, target } = selected.id;
    const link = data.links.find(
      (l) =>
        (l.source === source && l.target === target) ||
        (l.source === target && l.target === source)
    );
    if (!link) return;

    const hierarchical = layoutType === "HIERARCHICAL";
    const isNormal = layoutType === "NORMAL";

    setModalConfig({
      title: `Edit Link (${link.source} → ${link.target})`,
      fields: [
        { name: "source", label: "Source (id)", defaultValue: link.source },
        { name: "target", label: "Target (id)", defaultValue: link.target },
        {
          name: "weight",
          label: "Weight (blank = none)",
          defaultValue: link.weight == null ? "" : String(link.weight),
        },
        ...(hierarchical
          ? [
              {
                name: "relation",
                label: "Relation",
                defaultValue: "parent→child",
                options: ["parent→child", "child→parent"],
              },
            ]
          : []),
        ...(isNormal
          ? [
              {
                name: "directed",
                label: "Directed?",
                defaultValue: link.directed ? "yes" : "no",
                options: ["yes", "no"],
              },
            ]
          : []),
      ],
      onSubmit: ({ source: ns, target: nt, weight, relation, directed }) => {
        if (!ns.trim() || !nt.trim()) return setModalConfig(null);
        if (
          !data.nodes.find((n) => n.id === ns) ||
          !data.nodes.find((n) => n.id === nt)
        ) {
          alert("Source or target node not found.");
          return setModalConfig(null);
        }

        let fs = ns, ft = nt;
        if (hierarchical && relation === "child→parent") {
          [fs, ft] = [nt, ns];
        }

        const conflict = data.links.some((l) => {
          const sameOld =
            (l.source === link.source && l.target === link.target) ||
            (l.source === link.target && l.target === link.source);
          const wouldBe =
            (l.source === fs && l.target === ft) ||
            (l.source === ft && l.target === fs);
          return !sameOld && wouldBe;
        });
        if (conflict) {
          alert("Another link between those nodes already exists.");
          return setModalConfig(null);
        }

        const w =
          weight === ""
            ? null
            : isNaN(Number(weight))
            ? null
            : Number(weight);
        const isDirected = !isNormal || directed === "yes";

        applyChange((d) => ({
          nodes: d.nodes,
          links: d.links.map((l) =>
            (l.source === link.source && l.target === link.target) ||
            (l.source === link.target && l.target === link.source)
              ? { source: fs, target: ft, weight: w, directed: isDirected }
              : l
          ),
        }));
        setModalConfig(null);
      },
    });
  }

  function openDeleteSelectedModal() {
    if (!selected.type) return alert("No selection.");
    const label =
      selected.type === "node"
        ? selected.id
        : `${selected.id.source} → ${selected.id.target}`;

    setModalConfig({
      title: `Delete ${selected.type}`,
      fields: [
        {
          name: "confirm",
          label: `Type DELETE to confirm deletion of "${label}"`,
          defaultValue: "",
        },
      ],
      onSubmit: ({ confirm }) => {
        if (confirm !== "DELETE") return setModalConfig(null);
        if (selected.type === "node") {
          const id = selected.id;
          applyChange((d) => ({
            nodes: d.nodes.filter((n) => n.id !== id),
            links: d.links.filter(
              (l) => l.source !== id && l.target !== id
            ),
          }));
        } else if (selected.type === "link") {
          const { source, target } = selected.id;
          applyChange((d) => ({
            nodes: d.nodes,
            links: d.links.filter(
              (l) =>
                !(
                  (l.source === source && l.target === target) ||
                  (l.source === target && l.target === source)
                )
            ),
          }));
        }
        setModalConfig(null);
      },
    });
  }

  function openShortestPathModal() {
    if (shortestPath.length > 0) {
      setShortestPath([]);
      return;
    }
    if (layoutType !== "NORMAL") {
      return alert("Shortest path is only available in Force-directed layout.");
    }
    const missing = data.links.some(
      (l) => l.weight == null || isNaN(Number(l.weight))
    );
    if (missing) {
      return alert(
        "All links must have numeric weights to run shortest path."
      );
    }

    setModalConfig({
      title: "Find Shortest Path (Dijkstra)",
      fields: [
        { name: "start", label: "Start node id", defaultValue: "", autoFocus: true },
        { name: "end", label: "End node id", defaultValue: "" },
      ],
      onSubmit: ({ start, end }) => {
        if (!start || !end) return setModalConfig(null);
        if (
          !data.nodes.find((n) => n.id === start) ||
          !data.nodes.find((n) => n.id === end)
        ) {
          alert("Start or end node not found.");
          return setModalConfig(null);
        }
        const path = dijkstra(data.nodes, data.links, start, end);
        if (!path) alert("No path found between those nodes.");
        else setShortestPath(path);
        setModalConfig(null);
      },
    });
  }

  /* -------------------------
     Algorithm runners
     ------------------------- */
  function runBFS() {
    if (selected.type !== "node") return alert("Select a start node first.");
    const result = bfs(data.nodes, data.links, selected.id);
    setAlgorithmResult({ type: "bfs", ...result });
    setAnalysis(null);
    setShortestPath([]);
  }

  function runDFS() {
    if (selected.type !== "node") return alert("Select a start node first.");
    const result = dfs(data.nodes, data.links, selected.id);
    setAlgorithmResult({ type: "dfs", ...result });
    setAnalysis(null);
    setShortestPath([]);
  }

  function runTopologicalSort() {
    const order = topologicalSort(data.nodes, data.links);
    if (!order) {
      alert(
        "Topological sort failed: graph contains cycles.\nUse 'Detect Cycles' to verify."
      );
      return;
    }
    setAlgorithmResult({ type: "topological", order });
    setAnalysis(null);
    setShortestPath([]);
  }

  function runMST() {
    const hasWeights = data.links.some((l) => l.weight != null);
    if (!hasWeights) {
      return alert("Assign weights to links first (Edit Link).");
    }
    const edges = kruskalMST(data.nodes, data.links);
    setAlgorithmResult({ type: "mst", edges });
    setAnalysis(null);
    setShortestPath([]);
  }

  function runCycleDetection() {
    const has = detectCycles(data.nodes, data.links);
    alert(
      has
        ? "⚠ Cycles detected — graph is NOT a DAG."
        : "✓ No cycles — graph is a valid DAG."
    );
  }

  /* -------------------------
     Analysis functions
     ------------------------- */
  function runDegreeCentrality() {
    const values = {};
    data.nodes.forEach((n) => {
      values[n.id] = data.links.filter(
        (l) => l.source === n.id || l.target === n.id
      ).length;
    });
    setAnalysis({ type: "degree", values });
    setAlgorithmResult(null);
  }

  function runPageRank() {
    if (layoutType !== "HIERARCHICAL") {
      alert("PageRank is only available in Hierarchical layout.");
      return;
    }
    const indegree = {};
    data.nodes.forEach((n) => (indegree[n.id] = 0));
    data.links.forEach((l) => {
      indegree[l.target] = (indegree[l.target] || 0) + 1;
    });
    const roots = data.nodes
      .filter((n) => indegree[n.id] === 0)
      .map((n) => n.id);

    const queue = [...roots];
    const rank = {};
    roots.forEach((r) => (rank[r] = 1));

    while (queue.length) {
      const parent = queue.shift();
      data.links
        .filter((l) => l.source === parent)
        .forEach((l) => {
          rank[l.target] = Math.max(
            rank[l.target] || 0,
            (rank[parent] || 1) * 0.85
          );
          queue.push(l.target);
        });
    }

    const maxVal = Math.max(1, ...Object.values(rank));
    const values = {};
    data.nodes.forEach((n) => {
      values[n.id] = (rank[n.id] || 0) / maxVal;
    });
    setAnalysis({ type: "pagerank", values });
    setAlgorithmResult(null);
  }

  /* -------------------------
     Failure simulation
     ------------------------- */
  function toggleFailureMode() {
    const next = !failureMode;
    setFailureMode(next);
    if (!next) {
      setFailedNodes(new Set());
      setAffectedNodes(new Set());
    }
  }

  function resetFailure() {
    setFailedNodes(new Set());
    setAffectedNodes(new Set());
  }

  /* -------------------------
     Drill-down
     ------------------------- */
  function openDrilldown() {
    if (selected.type !== "node") return alert("Select a node first.");
    setDrilldownNodeId(selected.id);
  }

  function handleSubGraphUpdate(newSubGraph) {
    const id = drilldownNodeId;
    applyChange((d) => ({
      nodes: d.nodes.map((n) =>
        n.id === id ? { ...n, subGraph: newSubGraph } : n
      ),
      links: d.links,
    }));
  }

  /* -------------------------
     Export / Import
     ------------------------- */
  function handleExport() {
    if (!data?.nodes?.length) {
      alert("Nothing to export.");
      return;
    }

    const choice = window.prompt(
      "Export type:\n  'json' — topology JSON\n  'png'  — image",
      "json"
    );
    if (!choice) return;

    if (choice.toLowerCase() === "json") {
      const blob = new Blob(
        [
          JSON.stringify(
            {
              nodes: data.nodes.map((n) => ({
                id: n.id,
                label: n.label,
                nodeType: n.nodeType ?? "server",
                subGraph: n.subGraph ?? { nodes: [], links: [] },
              })),
              links: data.links.map((l) => ({
                source: l.source,
                target: l.target,
                weight: l.weight ?? null,
                directed: l.directed ?? true,
              })),
            },
            null,
            2
          ),
        ],
        { type: "application/json" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "topology.json";
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    // PNG export
    const svgElement = svgRef.current;
    if (!svgElement) return;
    const clone = svgElement.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const svgBlob = new Blob([new XMLSerializer().serializeToString(clone)], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = svgElement.clientWidth || window.innerWidth;
      canvas.height = svgElement.clientHeight || window.innerHeight;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#070708";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "topology.png";
        a.click();
      });
    };
    img.onerror = () => {
      alert("PNG export failed.");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed.nodes || !parsed.links)
          return alert("Invalid file: must contain 'nodes' and 'links'.");
        const nodes = parsed.nodes.map((n) => ({
          id: n.id,
          label: n.label ?? n.id,
          nodeType: n.nodeType ?? "server",
          subGraph: n.subGraph ?? { nodes: [], links: [] },
        }));
        const links = parsed.links.map((l) => ({
          source: l.source,
          target: l.target,
          weight: l.weight ?? null,
          directed: l.directed ?? true,
        }));
        updateData({ nodes, links });
        clearAllHighlights();
      } catch {
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  /* -------------------------
     Version management
     ------------------------- */
  function openSaveVersionModal() {
    setModalConfig({
      title: "Save Version",
      fields: [
        {
          name: "name",
          label: "Version name",
          defaultValue: "",
          placeholder: "e.g., v1-with-cdn",
          autoFocus: true,
        },
      ],
      onSubmit: ({ name }) => {
        if (!name.trim()) return setModalConfig(null);
        const newVersions = {
          ...versions,
          [name.trim()]: {
            nodes: data.nodes,
            links: data.links,
            savedAt: new Date().toISOString(),
          },
        };
        saveVersions(newVersions);
        setModalConfig(null);
      },
    });
  }

  function openLoadVersionModal() {
    const keys = Object.keys(versions);
    if (!keys.length) return alert("No saved versions.");
    setModalConfig({
      title: "Load Version",
      fields: [
        {
          name: "version",
          label: "Choose version",
          defaultValue: keys[0],
          options: keys,
        },
      ],
      onSubmit: ({ version }) => {
        const v = versions[version];
        if (!v) return setModalConfig(null);
        updateData({ nodes: v.nodes, links: v.links });
        clearAllHighlights();
        setModalConfig(null);
      },
    });
  }

  function openDeleteVersionModal() {
    const keys = Object.keys(versions);
    if (!keys.length) return alert("No saved versions.");
    setModalConfig({
      title: "Delete Version",
      fields: [
        {
          name: "version",
          label: "Choose version",
          defaultValue: keys[0],
          options: keys,
        },
        { name: "confirm", label: "Type DELETE to confirm", defaultValue: "" },
      ],
      onSubmit: ({ version, confirm }) => {
        if (confirm !== "DELETE") return setModalConfig(null);
        const newVersions = { ...versions };
        delete newVersions[version];
        saveVersions(newVersions);
        setModalConfig(null);
      },
    });
  }

  /* -------------------------
     Render
     ------------------------- */
  const drilldownNode = drilldownNodeId
    ? data.nodes.find((n) => n.id === drilldownNodeId)
    : null;

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "#0e0e12",
        color: "#eaeaf2",
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      {/* Sidebar */}
      <Sidebar
        search={search}
        setSearch={setSearch}
        filter={filter}
        setFilter={setFilter}
        layoutType={layoutType}
        setLayoutType={setLayoutType}
        hierDirection={hierDirection}
        setHierDirection={setHierDirection}
        historyCtrl={historyCtrl}
        openAddNodeModal={openAddNodeModal}
        openAddLinkModal={openAddLinkModal}
        openEditNodeModal={openEditNodeModal}
        openEditLinkModal={openEditLinkModal}
        openDeleteSelectedModal={openDeleteSelectedModal}
        openShortestPathModal={openShortestPathModal}
        handleExport={handleExport}
        handleImport={handleImport}
        fileInputRef={fileInputRef}
        versions={versions}
        saveVersions={saveVersions}
        updateData={updateData}
        openSaveVersionModal={openSaveVersionModal}
        openLoadVersionModal={openLoadVersionModal}
        openDeleteVersionModal={openDeleteVersionModal}
        data={data}
        selected={selected}
        // Analysis
        runDegreeCentrality={runDegreeCentrality}
        runPageRank={runPageRank}
        clearAnalysis={() => setAnalysis(null)}
        layoutIsHierarchical={layoutType === "HIERARCHICAL"}
        analysisActive={!!analysis}
        // Algorithms
        runBFS={runBFS}
        runDFS={runDFS}
        runTopologicalSort={runTopologicalSort}
        runMST={runMST}
        runCycleDetection={runCycleDetection}
        algorithmResult={algorithmResult}
        clearAlgorithmResult={() => setAlgorithmResult(null)}
        // Failure simulation
        failureMode={failureMode}
        toggleFailureMode={toggleFailureMode}
        failedCount={failedNodes.size}
        affectedCount={affectedNodes.size}
        resetFailure={resetFailure}
        // Drill-down
        openDrilldown={openDrilldown}
        selectedNodeHasSubGraph={
          selected.type === "node" &&
          (data.nodes.find((n) => n.id === selected.id)?.subGraph?.nodes
            ?.length ?? 0) > 0
        }
        // Graph stats
        graphStats={graphStats}
      />

      {/* Canvas */}
      <div style={{ flex: 1, position: "relative" }}>
        {failureMode && (
          <div
            style={{
              position: "absolute",
              top: 16,
              left: "50%",
              transform: "translateX(-50%)",
              background: "#ef444422",
              border: "1px solid #ef4444",
              borderRadius: 8,
              padding: "6px 16px",
              color: "#ef4444",
              fontSize: 13,
              fontWeight: 600,
              zIndex: 100,
              pointerEvents: "none",
            }}
          >
            FAILURE MODE — click nodes to mark as failed
          </div>
        )}
        <svg
          ref={svgRef}
          style={{ width: "100%", height: "100%", background: "#070708" }}
        />
      </div>

      {/* Drill-down panel */}
      {drilldownNode && (
        <DrilldownPanel
          node={drilldownNode}
          onUpdate={handleSubGraphUpdate}
          onClose={() => setDrilldownNodeId(null)}
        />
      )}

      {/* Modal */}
      {modalConfig && (
        <Modal
          title={modalConfig.title}
          fields={modalConfig.fields}
          onSubmit={modalConfig.onSubmit}
          onClose={() => setModalConfig(null)}
        />
      )}
    </div>
  );
}
