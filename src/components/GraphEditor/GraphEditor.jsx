// src/components/GraphEditor/GraphEditor.jsx
// Network Topology Editor — Mission Control aesthetic

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";

import { useHistoryState } from "./utils/history";
import { makeUniqueId, parseLinkQuery, validateGraphData } from "./utils/helpers";
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
import { NODE_TYPE_COLORS, NODE_TYPES, NODE_TYPE_LABELS, FAILURE_COLORS, DS } from "./styles";

import Modal from "./Modal";
import Sidebar from "./Sidebar";
import DrilldownPanel from "./DrilldownPanel";
import ToastContainer from "./Toast";
import { GraphEditorContext } from "./GraphEditorContext";

// ── Default topology ──────────────────────────────────────────────────────────
const DEFAULT_DATA = {
  nodes: [
    { id: "browser",  label: "Browser",       nodeType: "client",       subGraph: { nodes: [], links: [] } },
    { id: "firewall", label: "Firewall",       nodeType: "firewall",     subGraph: { nodes: [], links: [] } },
    { id: "lb",       label: "Load Balancer",  nodeType: "loadbalancer", subGraph: {
        nodes: [
          { id: "health", label: "Health Check",    nodeType: "microservice" },
          { id: "router", label: "Request Router",  nodeType: "microservice" },
        ],
        links: [{ source: "health", target: "router", directed: true }],
      },
    },
    { id: "api1",     label: "API Server 1",   nodeType: "api", subGraph: {
        nodes: [
          { id: "auth",      label: "Auth",      nodeType: "microservice" },
          { id: "handler",   label: "Handler",   nodeType: "microservice" },
          { id: "validator", label: "Validator", nodeType: "microservice" },
        ],
        links: [
          { source: "auth",    target: "handler",   directed: true },
          { source: "handler", target: "validator", directed: true },
        ],
      },
    },
    { id: "api2",     label: "API Server 2",   nodeType: "api",          subGraph: { nodes: [], links: [] } },
    { id: "postgres", label: "PostgreSQL",      nodeType: "database",     subGraph: {
        nodes: [
          { id: "primary", label: "Primary", nodeType: "database" },
          { id: "replica", label: "Replica", nodeType: "database" },
        ],
        links: [{ source: "primary", target: "replica", directed: true }],
      },
    },
    { id: "redis",    label: "Redis Cache",     nodeType: "cache",        subGraph: { nodes: [], links: [] } },
    { id: "queue",    label: "Message Queue",   nodeType: "queue",        subGraph: { nodes: [], links: [] } },
    { id: "worker",   label: "Worker Service",  nodeType: "microservice", subGraph: { nodes: [], links: [] } },
  ],
  links: [
    { source: "browser",  target: "firewall", directed: true, weight: 1  },
    { source: "firewall", target: "lb",       directed: true, weight: 2  },
    { source: "lb",       target: "api1",     directed: true, weight: 10 },
    { source: "lb",       target: "api2",     directed: true, weight: 10 },
    { source: "api1",     target: "postgres", directed: true, weight: 25 },
    { source: "api2",     target: "postgres", directed: true, weight: 25 },
    { source: "api1",     target: "redis",    directed: true, weight: 5  },
    { source: "api2",     target: "redis",    directed: true, weight: 5  },
    { source: "api1",     target: "queue",    directed: true, weight: 8  },
    { source: "queue",    target: "worker",   directed: true, weight: 50 },
  ],
};

function getInitialData() {
  try {
    const saved = localStorage.getItem("graph_autosave");
    if (saved) { const parsed = JSON.parse(saved); if (parsed.nodes && parsed.links) return parsed; }
  } catch { /* ignore */ }
  return DEFAULT_DATA;
}

export default function GraphEditor() {
  const svgRef       = useRef(null);
  const fileInputRef = useRef(null);
  const simRef       = useRef(null);
  const searchRef    = useRef(null);
  const tooltipRef   = useRef(null);

  // Core graph state (with undo history, auto-restored from localStorage)
  const [data, updateData, historyCtrl] = useHistoryState(getInitialData());

  // Lock body scroll while editor is mounted
  useEffect(() => {
    document.body.classList.add("editor-mode");
    return () => document.body.classList.remove("editor-mode");
  }, []);

  // Auto-save to localStorage on data changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      try { localStorage.setItem("graph_autosave", JSON.stringify(data)); } catch { /* ignore */ }
    }, 1500);
    return () => clearTimeout(timer);
  }, [data]);

  // UI state
  const [selected,      setSelected]      = useState({ type: null, id: null });
  const [search,        setSearch]        = useState("");
  const [filter,        setFilter]        = useState("");
  const [modalConfig,   setModalConfig]   = useState(null);
  const [layoutType,    setLayoutType]    = useState("NORMAL");
  const [hierDirection, setHierDirection] = useState("TB");

  // Analysis
  const [analysis,        setAnalysis]        = useState(null);
  const [algorithmResult, setAlgorithmResult] = useState(null);
  const [shortestPath,    setShortestPath]    = useState([]);

  // Failure simulation
  const [failureMode,   setFailureMode]   = useState(false);
  const [failedNodes,   setFailedNodes]   = useState(new Set());
  const [affectedNodes, setAffectedNodes] = useState(new Set());

  // Drill-down
  const [drilldownNodeId, setDrilldownNodeId] = useState(null);

  // Right-click context menu
  const [ctxMenu, setCtxMenu] = useState(null); // { x, y, nodeId } or null

  // Pin Layout mode — nodes stay exactly where dragged (draw.io-style)
  const [pinMode, setPinMode] = useState(false);
  const pinModeRef = useRef(false);
  useEffect(() => { pinModeRef.current = pinMode; }, [pinMode]);

  // Toast notifications
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);
  const addToast = useCallback((message, type = "info") => {
    const id = ++toastIdRef.current;
    setToasts((t) => [...t, { id, message, type }]);
  }, []);
  const removeToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  // Versions (localStorage)
  const [versions, setVersions] = useState(() => {
    try { return JSON.parse(localStorage.getItem("graph_versions") || "{}"); }
    catch { return {}; }
  });

  // Graph statistics
  const graphStats = useMemo(() => {
    const n = data.nodes.length;
    const e = data.links.length;
    const maxEdges = n > 1 ? n * (n - 1) : 1;
    return {
      nodes:     n,
      links:     e,
      density:   maxEdges > 0 ? (e / maxEdges).toFixed(3) : "0",
      connected: isConnected(data.nodes, data.links),
      hasCycles: detectCycles(data.nodes, data.links),
    };
  }, [data]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e) {
      // Don't intercept when typing in inputs/textareas
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === "z" && !e.shiftKey) { e.preventDefault(); historyCtrl.undo(); return; }
      if (mod && e.key === "z" && e.shiftKey)  { e.preventDefault(); historyCtrl.redo(); return; }
      if (e.key === "Escape") { setSelected({ type: null, id: null }); setShortestPath([]); setCtxMenu(null); return; }
      if ((e.key === "Delete" || e.key === "Backspace") && selected.type) { e.preventDefault(); openDeleteSelectedModal(); return; }
      if (e.key === "/" && !mod) { e.preventDefault(); searchRef.current?.focus(); return; }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [historyCtrl, selected]);

  function saveVersions(v) {
    setVersions(v);
    try { localStorage.setItem("graph_versions", JSON.stringify(v)); }
    catch (err) { console.warn("localStorage write failed", err); }
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

  // ── D3 canvas rendering ──────────────────────────────────────────────────
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg    = d3.select(svgEl);
    const rect   = svgEl.getBoundingClientRect();
    const width  = rect.width  || window.innerWidth  - 300;
    const height = rect.height || window.innerHeight;

    svg.selectAll("*").remove();

    // Dot-grid background
    const defs = svg.append("defs");

    defs.append("pattern")
      .attr("id", "dot-grid")
      .attr("width", 24).attr("height", 24)
      .attr("patternUnits", "userSpaceOnUse")
      .append("circle")
        .attr("cx", 12).attr("cy", 12).attr("r", 0.5)
        .attr("fill", "rgba(255,255,255,0.05)");

    svg.append("rect")
      .attr("width", "100%").attr("height", "100%")
      .attr("fill", "url(#dot-grid)");

    // Arrowheads (smaller, refined)
    function makeArrow(id, color) {
      defs.append("marker")
        .attr("id", id)
        .attr("viewBox", "0 -4 8 8")
        .attr("refX", 8).attr("refY", 0)
        .attr("markerWidth", 5).attr("markerHeight", 5)
        .attr("orient", "auto")
        .append("path").attr("d", "M0,-3.5L8,0L0,3.5").attr("fill", color);
    }
    makeArrow("arrowhead", DS.accent);
    makeArrow("arrowhead-fail", FAILURE_COLORS.failed);
    makeArrow("arrowhead-warn", DS.gold);

    const container = svg.append("g").attr("class", "container");
    svg.call(
      d3.zoom().scaleExtent([0.1, 4])
        .on("zoom", (e) => container.attr("transform", e.transform))
    );

    // Filter
    const filterIds    = filter ? filter.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const visibleNodes = filterIds.length ? data.nodes.filter((n) => filterIds.includes(n.id)) : data.nodes;
    const visibleLinks = filterIds.length
      ? data.links.filter((l) => filterIds.includes(l.source) && filterIds.includes(l.target))
      : data.links;

    const nodesCopy = visibleNodes.map((n) => ({ ...n }));
    const linksCopy = visibleLinks.map((l) => ({ ...l }));

    let usingSimulation = false;

    if (layoutType === "HIERARCHICAL") {
      const pos = computeHierarchyPositions(nodesCopy, linksCopy, hierDirection, width, height);
      nodesCopy.forEach((n) => { const p = pos.get(n.id); n.x = p?.x ?? width/2; n.y = p?.y ?? height/2; n.fx = n.x; n.fy = n.y; });
      simRef.current?.stop();
    } else if (layoutType === "CIRCULAR") {
      const pos = computeCircularPositions(nodesCopy, width, height);
      nodesCopy.forEach((n) => { const p = pos.get(n.id); n.x = p?.x ?? width/2; n.y = p?.y ?? height/2; n.fx = n.x; n.fy = n.y; });
      simRef.current?.stop();
    } else {
      usingSimulation = true;
      const sim = d3.forceSimulation(nodesCopy)
        .force("link",   d3.forceLink(linksCopy).id((d) => d.id).distance(200))
        .force("charge", d3.forceManyBody().strength(-600))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide().radius(80))
        .on("tick", ticked);
      simRef.current = sim;
    }

    const linkGroup = container.append("g").attr("class", "links");
    const nodeGroup = container.append("g").attr("class", "nodes");

    const linkQuery  = parseLinkQuery(search);
    const nodeSearch = search && !linkQuery ? search.toLowerCase() : null;

    // ─ Card node dimensions ──────────────────────────────────────────────
    const NODE_H = 44;
    const NODE_R = 12;
    function getNodeW(d) { return Math.max(120, 30 + ((d.label?.length || 0) * 7)); }

    // ─ Links ─────────────────────────────────────────────────────────────
    function getLinkArrow(d) {
      const src = typeof d.source === "object" ? d.source.id : d.source;
      const showArrow = layoutType === "HIERARCHICAL" || (layoutType === "NORMAL" && d.directed);
      if (!showArrow) return null;
      if (failedNodes.has(src)) return "url(#arrowhead-fail)";
      const tgt = typeof d.target === "object" ? d.target.id : d.target;
      const inPath = shortestPath.some((_, i) =>
        i < shortestPath.length - 1 && shortestPath[i] === src && shortestPath[i+1] === tgt
      );
      if (inPath) return "url(#arrowhead-warn)";
      return "url(#arrowhead)";
    }

    function getLinkColor(d) {
      const src = typeof d.source === "object" ? d.source.id : d.source;
      const tgt = typeof d.target === "object" ? d.target.id : d.target;

      if (algorithmResult?.type === "mst") {
        const isMst = algorithmResult.edges.some((e) => {
          const es = typeof e.source === "object" ? e.source.id : e.source;
          const et = typeof e.target === "object" ? e.target.id : e.target;
          return (es === src && et === tgt) || (es === tgt && et === src);
        });
        return isMst ? DS.accent : "rgba(255,255,255,0.04)";
      }

      if (failedNodes.has(src) || failedNodes.has(tgt)) return FAILURE_COLORS.failed;
      if (affectedNodes.has(src) || affectedNodes.has(tgt)) return FAILURE_COLORS.affected;

      const isSel = selected.type === "link" && selected.id?.source === src && selected.id?.target === tgt;
      const isSearched = linkQuery && ((linkQuery[0]===src && linkQuery[1]===tgt)||(linkQuery[0]===tgt && linkQuery[1]===src));

      let inPath = false;
      for (let i = 0; i < shortestPath.length - 1; i++) {
        const a = shortestPath[i], b = shortestPath[i+1];
        if ((a===src && b===tgt)||(a===tgt && b===src)) { inPath = true; break; }
      }

      if (inPath)      return DS.gold;
      if (isSel)       return DS.accent;
      if (isSearched)  return DS.gold;
      return "rgba(255,255,255,0.12)";
    }

    // ─ Bezier path generator ─────────────────────────────────────────────
    function nodeX(d, field) {
      return typeof d[field] === "object" ? d[field].x : nodesCopy.find((n) => n.id === d[field])?.x ?? 0;
    }
    function nodeY(d, field) {
      return typeof d[field] === "object" ? d[field].y : nodesCopy.find((n) => n.id === d[field])?.y ?? 0;
    }

    function makeLinkPath(d) {
      const sx = nodeX(d, "source"), sy = nodeY(d, "source");
      const tx = nodeX(d, "target"), ty = nodeY(d, "target");
      const dx = tx - sx, dy = ty - sy;
      const midX = (sx + tx) / 2, midY = (sy + ty) / 2;
      if (Math.abs(dx) >= Math.abs(dy)) {
        return `M ${sx},${sy} C ${midX},${sy} ${midX},${ty} ${tx},${ty}`;
      }
      return `M ${sx},${sy} C ${sx},${midY} ${tx},${midY} ${tx},${ty}`;
    }

    const linkSel = linkGroup.selectAll("path").data(linksCopy).join("path")
      .attr("fill", "none")
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.65)
      .style("cursor", "pointer")
      .attr("stroke", getLinkColor)
      .attr("marker-end", getLinkArrow)
      .on("click", (e, d) => {
        e.stopPropagation();
        if (failureMode) return;
        const src = typeof d.source === "object" ? d.source.id : d.source;
        const tgt = typeof d.target === "object" ? d.target.id : d.target;
        setSelected({ type: "link", id: { source: src, target: tgt } });
      });

    // Weight labels
    const weightLabels = linkGroup.selectAll("text").data(linksCopy).join("text")
      .attr("fill", DS.textMuted)
      .attr("font-size", 9)
      .attr("font-family", "'JetBrains Mono', monospace")
      .attr("text-anchor", "middle")
      .style("pointer-events", "none")
      .text((d) => d.weight == null ? "" : d.weight);

    // ─ Node helpers ──────────────────────────────────────────────────────
    let colorScale = null;
    if (analysis?.values) {
      const vals = Object.values(analysis.values);
      colorScale = d3.scaleLinear()
        .domain([Math.min(...vals), Math.max(...vals)])
        .range([DS.bgCard, DS.accent]);
    }

    function getCardFill(d) {
      if (failedNodes.has(d.id))   return `${FAILURE_COLORS.failed}18`;
      if (affectedNodes.has(d.id)) return `${FAILURE_COLORS.affected}15`;
      if (algorithmResult?.type === "bfs" || algorithmResult?.type === "dfs") {
        if (algorithmResult.visited.has(d.id)) return `${DS.accent}12`;
      }
      if (algorithmResult?.type === "topological" && algorithmResult.order.includes(d.id)) return `${DS.gold}10`;
      if (analysis?.values && colorScale) {
        const c = colorScale(analysis.values[d.id] ?? 0);
        return c + "20";
      }
      if (shortestPath.includes(d.id)) return `${DS.gold}15`;
      if (selected.type === "node" && selected.id === d.id) return `${DS.accent}12`;
      return DS.bgCard;
    }

    function getNodeStroke(d) {
      if (failedNodes.has(d.id))   return FAILURE_COLORS.failed;
      if (affectedNodes.has(d.id)) return FAILURE_COLORS.affected;
      if (algorithmResult?.type === "bfs" || algorithmResult?.type === "dfs") {
        if (algorithmResult.visited.has(d.id)) {
          const idx = algorithmResult.order.indexOf(d.id);
          const t = idx / Math.max(1, algorithmResult.order.length - 1);
          return d3.interpolate(NODE_TYPE_COLORS[d.nodeType] || DS.bgCard, DS.accent)(t);
        }
      }
      if (algorithmResult?.type === "topological" && algorithmResult.order.includes(d.id)) return DS.gold;
      if (shortestPath.includes(d.id)) return DS.gold;
      if (selected.type === "node" && selected.id === d.id) return DS.accent;
      if (nodeSearch && d.label.toLowerCase().includes(nodeSearch)) return DS.gold;
      if (d.subGraph?.nodes?.length > 0) return `${DS.accent}88`;
      return `${NODE_TYPE_COLORS[d.nodeType] || "rgba(255,255,255,0.15)"}44`;
    }

    function getNodeFilter(d) {
      if (failedNodes.has(d.id))   return `drop-shadow(0 0 12px ${FAILURE_COLORS.failed}88)`;
      if (affectedNodes.has(d.id)) return `drop-shadow(0 0 10px ${FAILURE_COLORS.affected}66)`;
      if (selected.type === "node" && selected.id === d.id) return `drop-shadow(0 0 14px ${DS.accent}44)`;
      if (shortestPath.includes(d.id)) return `drop-shadow(0 0 10px ${DS.gold}55)`;
      const c = NODE_TYPE_COLORS[d.nodeType];
      return c ? `drop-shadow(0 0 6px ${c}22)` : "none";
    }

    // ─ Nodes (card style) ────────────────────────────────────────────────
    const node = nodeGroup.selectAll("g").data(nodesCopy, (d) => d.id)
      .join((enter) => {
        const g = enter.append("g").style("cursor", "pointer");
        g.append("rect").attr("class", "card").attr("height", NODE_H).attr("rx", NODE_R).attr("ry", NODE_R);
        g.append("circle").attr("class", "dot").attr("r", 5);
        g.append("text").attr("class", "label")
          .style("font-size", "11px")
          .style("font-family", "'Outfit', sans-serif")
          .style("font-weight", "500")
          .style("pointer-events", "none");
        g.append("text").attr("class", "type-label")
          .style("font-size", "8px")
          .style("font-family", "'JetBrains Mono', monospace")
          .style("letter-spacing", "0.06em")
          .style("text-transform", "uppercase")
          .style("pointer-events", "none");
        return g;
      });

    // Card background
    node.select("rect.card")
      .attr("width", (d) => getNodeW(d))
      .attr("x", (d) => -getNodeW(d) / 2)
      .attr("y", -NODE_H / 2)
      .attr("fill", getCardFill)
      .attr("stroke", getNodeStroke)
      .attr("stroke-width", (d) => {
        if (failedNodes.has(d.id) || affectedNodes.has(d.id)) return 1.5;
        if (selected.type === "node" && selected.id === d.id) return 1.5;
        return 1;
      })
      .attr("stroke-dasharray", (d) =>
        d.subGraph?.nodes?.length > 0 && !failedNodes.has(d.id) ? "5,3" : null
      )
      .style("filter", getNodeFilter)
      .style("cursor", failureMode ? "crosshair" : "pointer")
      .style("animation", (d) =>
        affectedNodes.has(d.id) ? "pulse-fail 2s ease-in-out infinite" : null
      )
      .on("click", (e, d) => {
        e.stopPropagation();
        if (failureMode) {
          const next = new Set(failedNodes);
          next.has(d.id) ? next.delete(d.id) : next.add(d.id);
          setFailedNodes(next);
          setAffectedNodes(computeFailurePropagation(data.nodes, data.links, next));
          return;
        }
        setSelected({ type: "node", id: d.id });
      })
      .on("contextmenu", function(e, d) {
        e.preventDefault();
        e.stopPropagation();
        if (failureMode) return;
        setSelected({ type: "node", id: d.id });
        const svgRect = svgRef.current.getBoundingClientRect();
        setCtxMenu({ x: e.clientX - svgRect.left, y: e.clientY - svgRect.top, nodeId: d.id });
        const tip = tooltipRef.current;
        if (tip) tip.style.opacity = "0";
      })
      .on("mouseover", function(e, d) {
        if (selected.id === d.id) return;
        const typeColor = NODE_TYPE_COLORS[d.nodeType] || DS.accent;
        d3.select(this).transition().duration(150)
          .style("filter", `drop-shadow(0 0 16px ${typeColor}44)`);
        const tip = tooltipRef.current;
        if (tip) {
          const degree = data.links.filter((l) => l.source === d.id || l.target === d.id).length;
          const subCount = d.subGraph?.nodes?.length || 0;
          tip.innerHTML = `<strong style="color:${typeColor}">${d.label}</strong><br/><span style="opacity:0.6">ID: ${d.id}</span><br/><span style="opacity:0.6">Type: ${d.nodeType}</span><br/><span style="opacity:0.6">Links: ${degree}</span>${subCount ? `<br/><span style="opacity:0.6">Sub: ${subCount}</span>` : ""}`;
          tip.style.opacity = "1";
          const svgRect = svgRef.current.getBoundingClientRect();
          tip.style.left = `${e.clientX - svgRect.left + 16}px`;
          tip.style.top = `${e.clientY - svgRect.top - 12}px`;
        }
      })
      .on("mousemove", function(e) {
        const tip = tooltipRef.current;
        if (tip) {
          const svgRect = svgRef.current.getBoundingClientRect();
          tip.style.left = `${e.clientX - svgRect.left + 16}px`;
          tip.style.top = `${e.clientY - svgRect.top - 12}px`;
        }
      })
      .on("mouseout", function(_, d) {
        if (selected.id === d.id) return;
        d3.select(this).transition().duration(150)
          .style("filter", getNodeFilter(d));
        const tip = tooltipRef.current;
        if (tip) tip.style.opacity = "0";
      })
      .call(
        d3.drag()
          .on("start", (e, d) => {
            if (usingSimulation && simRef.current && !e.active) simRef.current.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on("drag", (e, d) => {
            d.fx = e.x; d.fy = e.y;
            ticked();
          })
          .on("end", (e, d) => {
            if (usingSimulation && simRef.current && !e.active) simRef.current.alphaTarget(0);
            if (layoutType === "NORMAL" && !pinModeRef.current) { d.fx = null; d.fy = null; }
          })
      );

    // Type indicator dot
    node.select("circle.dot")
      .attr("cx", (d) => -getNodeW(d) / 2 + 18)
      .attr("cy", -4)
      .attr("fill", (d) => NODE_TYPE_COLORS[d.nodeType] || DS.accent)
      .style("filter", (d) => `drop-shadow(0 0 4px ${NODE_TYPE_COLORS[d.nodeType] || DS.accent}88)`);

    // Label
    node.select("text.label")
      .attr("x", (d) => -getNodeW(d) / 2 + 30)
      .attr("y", -2)
      .attr("text-anchor", "start")
      .attr("fill", DS.textPrimary)
      .text((d) => d.label || d.id);

    // Type sublabel
    node.select("text.type-label")
      .attr("x", (d) => -getNodeW(d) / 2 + 30)
      .attr("y", 13)
      .attr("text-anchor", "start")
      .attr("fill", DS.textMuted)
      .text((d) => NODE_TYPE_LABELS[d.nodeType] || d.nodeType);

    // Analysis value labels
    if (analysis?.values) {
      node.append("text")
        .each(function(d) { d3.select(this).attr("y", -(NODE_H / 2 + 8)); })
        .attr("text-anchor", "middle")
        .attr("fill", DS.textSecond)
        .style("font-size", "9px")
        .style("font-family", "'JetBrains Mono', monospace")
        .style("pointer-events", "none")
        .text((d) => { const v = analysis.values[d.id]; return v != null ? Number(v).toFixed(2) : ""; });
    }

    // Algorithm order labels
    if (algorithmResult?.order) {
      node.append("text")
        .each(function(d) { d3.select(this).attr("y", -(NODE_H / 2 + 8)); })
        .attr("text-anchor", "middle")
        .attr("fill", DS.gold)
        .style("font-size", "9px")
        .style("font-family", "'JetBrains Mono', monospace")
        .style("font-weight", "700")
        .style("pointer-events", "none")
        .text((d) => { const idx = algorithmResult.order.indexOf(d.id); return idx !== -1 ? `#${idx+1}` : ""; });
    }

    // Failure labels
    if (failureMode) {
      node.filter((d) => failedNodes.has(d.id))
        .append("text")
        .each(function(d) { d3.select(this).attr("y", -(NODE_H / 2 + 8)); })
        .attr("text-anchor", "middle")
        .attr("fill", FAILURE_COLORS.failed)
        .style("font-size", "8px").style("font-weight", "700")
        .style("font-family", "'JetBrains Mono', monospace")
        .style("pointer-events", "none")
        .text("FAILED");

      node.filter((d) => affectedNodes.has(d.id))
        .append("text")
        .each(function(d) { d3.select(this).attr("y", -(NODE_H / 2 + 8)); })
        .attr("text-anchor", "middle")
        .attr("fill", FAILURE_COLORS.affected)
        .style("font-size", "8px").style("font-weight", "700")
        .style("font-family", "'JetBrains Mono', monospace")
        .style("pointer-events", "none")
        .text("AFFECTED");
    }

    // ─ Ticked ────────────────────────────────────────────────────────────
    function ticked() {
      linkSel.attr("d", makeLinkPath);

      weightLabels
        .attr("x", (d) => (nodeX(d, "source") + nodeX(d, "target")) / 2)
        .attr("y", (d) => (nodeY(d, "source") + nodeY(d, "target")) / 2 - 10);

      node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    }

    if (!usingSimulation) ticked();

    svg.on("click", () => {
      setCtxMenu(null);
      if (!failureMode) {
        setSelected({ type: null, id: null });
        setShortestPath([]);
      }
    });

    return () => {
      try { simRef.current?.stop(); simRef.current = null; } catch { /* ok */ }
    };
  }, [
    data, search, filter, selected, shortestPath,
    layoutType, hierDirection, analysis, algorithmResult,
    failureMode, failedNodes, affectedNodes,
  ]);

  // ── Modal helpers ─────────────────────────────────────────────────────────
  function openAddNodeModal() {
    setModalConfig({
      title: "Add Node",
      fields: [
        { name: "label",    label: "Label",     defaultValue: "", placeholder: "e.g., API Gateway", autoFocus: true },
        { name: "nodeType", label: "Node Type", defaultValue: "server", options: NODE_TYPES },
      ],
      onSubmit: ({ label, nodeType }) => {
        if (!label.trim()) return setModalConfig(null);
        const dup = data.nodes.some((n) => n.label.toLowerCase() === label.trim().toLowerCase());
        if (dup && !window.confirm(`A node named "${label}" already exists. Add anyway?`)) return setModalConfig(null);
        applyChange((d) => {
          const id = makeUniqueId(label.replace(/\s+/g, "_").toLowerCase() || "node", d.nodes);
          return { nodes: [...d.nodes, { id, label: label.trim(), nodeType: nodeType || "server", subGraph: { nodes: [], links: [] } }], links: d.links };
        });
        setModalConfig(null);
      },
    });
  }

  function openAddLinkModal() {
    if (selected.type !== "node") return addToast("Select a source node first.", "warning");
    const src   = selected.id;
    const isHier = layoutType === "HIERARCHICAL";
    const isNorm = layoutType === "NORMAL";
    setModalConfig({
      title: isHier ? `Add Link (hierarchical) from "${src}"` : `Add Link from "${src}"`,
      fields: [
        isHier
          ? { name: "relation",  label: "Relation",   defaultValue: "parent→child", options: ["parent→child", "child→parent"] }
          : { name: "direction", label: "Direction",  defaultValue: "outgoing",     options: ["outgoing", "incoming"] },
        { name: "other",  label: "Other node",   defaultValue: data.nodes.filter((n) => n.id !== src)[0]?.id || "", options: data.nodes.filter((n) => n.id !== src).map((n) => n.id) },
        { name: "weight", label: "Weight (optional)",defaultValue: "", placeholder: "number or blank" },
        ...(isNorm ? [{ name: "directed", label: "Directed?", defaultValue: "yes", options: ["yes", "no"] }] : []),
      ],
      onSubmit: ({ relation, direction, other, weight, directed }) => {
        if (!other.trim()) return setModalConfig(null);
        const target = data.nodes.find((n) => n.id === other.trim());
        if (!target) { addToast(`Node "${other}" not found.`, "error"); return setModalConfig(null); }
        let source, tgt;
        if (isHier) [source, tgt] = relation === "child→parent" ? [other.trim(), src] : [src, other.trim()];
        else        [source, tgt] = direction === "outgoing"    ? [src, other.trim()] : [other.trim(), src];
        if (data.links.some((l) => l.source === source && l.target === tgt)) { addToast("Link already exists.", "warning"); return setModalConfig(null); }
        const w = weight === "" || isNaN(Number(weight)) ? null : Number(weight);
        const dir = !isNorm || directed === "yes";
        applyChange((d) => ({ nodes: d.nodes, links: [...d.links, { source, target: tgt, weight: w, directed: dir }] }));
        setModalConfig(null);
      },
    });
  }

  function openEditNodeModal() {
    if (selected.type !== "node") return addToast("Select a node first.", "warning");
    const n = data.nodes.find((x) => x.id === selected.id);
    if (!n) return;
    setModalConfig({
      title: `Edit Node "${n.id}"`,
      fields: [
        { name: "label",    label: "Label",     defaultValue: n.label,            autoFocus: true },
        { name: "nodeType", label: "Node Type", defaultValue: n.nodeType || "server", options: NODE_TYPES },
      ],
      onSubmit: ({ label, nodeType }) => {
        if (!label.trim()) return setModalConfig(null);
        applyChange((d) => ({
          nodes: d.nodes.map((x) => x.id === n.id ? { ...x, label: label.trim(), nodeType: nodeType || x.nodeType } : x),
          links: d.links,
        }));
        setModalConfig(null);
      },
    });
  }

  function openEditLinkModal() {
    if (selected.type !== "link") return addToast("Select a link first.", "warning");
    const { source, target } = selected.id;
    const lnk = data.links.find((l) =>
      (l.source === source && l.target === target) || (l.source === target && l.target === source)
    );
    if (!lnk) return;
    const isHier = layoutType === "HIERARCHICAL";
    const isNorm = layoutType === "NORMAL";
    setModalConfig({
      title: `Edit Link (${lnk.source} → ${lnk.target})`,
      fields: [
        { name: "source", label: "Source ID", defaultValue: lnk.source },
        { name: "target", label: "Target ID", defaultValue: lnk.target },
        { name: "weight", label: "Weight (blank = none)", defaultValue: lnk.weight == null ? "" : String(lnk.weight) },
        ...(isHier ? [{ name: "relation",  label: "Relation",   defaultValue: "parent→child", options: ["parent→child", "child→parent"] }] : []),
        ...(isNorm ? [{ name: "directed",  label: "Directed?",  defaultValue: lnk.directed ? "yes" : "no", options: ["yes", "no"] }] : []),
      ],
      onSubmit: ({ source: ns, target: nt, weight, relation, directed }) => {
        if (!ns.trim() || !nt.trim()) return setModalConfig(null);
        if (!data.nodes.find((x) => x.id === ns) || !data.nodes.find((x) => x.id === nt)) {
          addToast("Node not found.", "error"); return setModalConfig(null);
        }
        let fs = ns.trim(), ft = nt.trim();
        if (isHier && relation === "child→parent") [fs, ft] = [ft, fs];
        const conflict = data.links.some((l) => {
          const sameOld = (l.source === lnk.source && l.target === lnk.target) || (l.source === lnk.target && l.target === lnk.source);
          const wouldBe = (l.source === fs && l.target === ft) || (l.source === ft && l.target === fs);
          return !sameOld && wouldBe;
        });
        if (conflict) { addToast("Another link between those nodes already exists.", "warning"); return setModalConfig(null); }
        const w   = weight === "" || isNaN(Number(weight)) ? null : Number(weight);
        const dir = !isNorm || directed === "yes";
        applyChange((d) => ({
          nodes: d.nodes,
          links: d.links.map((l) =>
            (l.source === lnk.source && l.target === lnk.target) || (l.source === lnk.target && l.target === lnk.source)
              ? { source: fs, target: ft, weight: w, directed: dir }
              : l
          ),
        }));
        setModalConfig(null);
      },
    });
  }

  function openDeleteSelectedModal() {
    if (!selected.type) return addToast("Nothing selected.", "warning");
    const label = selected.type === "node" ? selected.id : `${selected.id.source} → ${selected.id.target}`;
    setModalConfig({
      title: `Delete ${selected.type}`,
      fields: [{ name: "_msg", label: "", type: "message", text: `Are you sure you want to delete "${label}"? You can undo this action.` }],
      onSubmit: () => {
        if (selected.type === "node") {
          const id = selected.id;
          applyChange((d) => ({ nodes: d.nodes.filter((n) => n.id !== id), links: d.links.filter((l) => l.source !== id && l.target !== id) }));
        } else {
          const { source, target } = selected.id;
          applyChange((d) => ({
            nodes: d.nodes,
            links: d.links.filter((l) => !((l.source === source && l.target === target) || (l.source === target && l.target === source))),
          }));
        }
        setModalConfig(null);
      },
    });
  }

  function openShortestPathModal() {
    if (shortestPath.length > 0) { setShortestPath([]); return; }
    if (data.links.some((l) => l.weight == null || isNaN(Number(l.weight)))) return addToast("All links must have numeric weights.", "warning");
    setModalConfig({
      title: "Shortest Path (Dijkstra)",
      fields: [
        { name: "start", label: "Start node ID", defaultValue: "", autoFocus: true },
        { name: "end",   label: "End node ID",   defaultValue: "" },
      ],
      onSubmit: ({ start, end }) => {
        if (!start || !end) return setModalConfig(null);
        if (!data.nodes.find((n) => n.id === start) || !data.nodes.find((n) => n.id === end)) { addToast("Node not found.", "error"); return setModalConfig(null); }
        const path = dijkstra(data.nodes, data.links, start.trim(), end.trim());
        if (!path) addToast("No path found between those nodes.", "warning");
        else setShortestPath(path);
        setModalConfig(null);
      },
    });
  }

  // ── Algorithms ────────────────────────────────────────────────────────────
  function runBFS() {
    if (selected.type !== "node") return addToast("Select a start node first.", "warning");
    const result = bfs(data.nodes, data.links, selected.id);
    const unreachable = data.nodes.length - result.visited.size;
    setAlgorithmResult({ type: "bfs", ...result, startId: selected.id, unreachable });
    setAnalysis(null); setShortestPath([]);
  }

  function runDFS() {
    if (selected.type !== "node") return addToast("Select a start node first.", "warning");
    const result = dfs(data.nodes, data.links, selected.id);
    const unreachable = data.nodes.length - result.visited.size;
    setAlgorithmResult({ type: "dfs", ...result, startId: selected.id, unreachable });
    setAnalysis(null); setShortestPath([]);
  }

  function runTopologicalSort() {
    const order = topologicalSort(data.nodes, data.links);
    if (!order) { addToast("Topological sort failed: graph has cycles.", "error"); return; }
    setAlgorithmResult({ type: "topological", order });
    setAnalysis(null); setShortestPath([]);
  }

  function runMST() {
    if (!data.links.some((l) => l.weight != null)) return addToast("Assign weights to links first.", "warning");
    const edges = kruskalMST(data.nodes, data.links);
    const totalWeight = edges.reduce((s, e) => s + (Number(e.weight) || 0), 0);
    setAlgorithmResult({ type: "mst", edges, totalWeight });
    setAnalysis(null); setShortestPath([]);
  }

  function runCycleDetection() {
    const has = detectCycles(data.nodes, data.links);
    setAlgorithmResult({
      type: "cycles",
      order: null,
      hasCycles: has,
      label: has ? "⚠ CYCLES DETECTED — not a DAG" : "✓ NO CYCLES — valid DAG",
    });
    setAnalysis(null); setShortestPath([]);
  }

  // ── Analysis ─────────────────────────────────────────────────────────────
  function runDegreeCentrality() {
    const values = {};
    data.nodes.forEach((n) => {
      values[n.id] = data.links.filter((l) => l.source === n.id || l.target === n.id).length;
    });
    setAnalysis({ type: "degree", values });
    setAlgorithmResult(null);
  }

  function runPageRank() {
    const indegree = {};
    data.nodes.forEach((n) => (indegree[n.id] = 0));
    data.links.forEach((l) => { indegree[l.target] = (indegree[l.target] || 0) + 1; });
    const roots = data.nodes.filter((n) => indegree[n.id] === 0).map((n) => n.id);
    const queue = [...roots];
    const rank  = {};
    roots.forEach((r) => (rank[r] = 1));
    while (queue.length) {
      const p = queue.shift();
      data.links.filter((l) => l.source === p).forEach((l) => {
        rank[l.target] = Math.max(rank[l.target] || 0, (rank[p] || 1) * 0.85);
        queue.push(l.target);
      });
    }
    const maxVal = Math.max(1, ...Object.values(rank));
    const values = {};
    data.nodes.forEach((n) => (values[n.id] = (rank[n.id] || 0) / maxVal));
    setAnalysis({ type: "pagerank", values });
    setAlgorithmResult(null);
  }

  // ── Failure simulation ────────────────────────────────────────────────────
  function toggleFailureMode() {
    const next = !failureMode;
    setFailureMode(next);
    if (!next) { setFailedNodes(new Set()); setAffectedNodes(new Set()); }
  }

  function resetFailure() { setFailedNodes(new Set()); setAffectedNodes(new Set()); }

  function togglePinMode() {
    const next = !pinMode;
    setPinMode(next);
    const svg = svgRef.current;
    if (!svg) return;
    if (next) {
      // Pin all nodes at their current positions
      d3.select(svg).select("g.nodes").selectAll("g").each(function(d) {
        if (d) { d.fx = d.x; d.fy = d.y; }
      });
      simRef.current?.stop();
    } else {
      // Release all nodes back to the simulation
      d3.select(svg).select("g.nodes").selectAll("g").each(function(d) {
        if (d) { d.fx = null; d.fy = null; }
      });
      simRef.current?.alpha(0.2).restart();
    }
  }

  // ── Drill-down ────────────────────────────────────────────────────────────
  function openDrilldown() {
    if (selected.type !== "node") return addToast("Select a node first.", "warning");
    setDrilldownNodeId(selected.id);
  }

  function handleSubGraphUpdate(newSubGraph) {
    const id = drilldownNodeId;
    applyChange((d) => ({
      nodes: d.nodes.map((n) => n.id === id ? { ...n, subGraph: newSubGraph } : n),
      links: d.links,
    }));
  }

  // ── Export / Import ──────────────────────────────────────────────────────
  function doExport(format) {
    if (format === "json") {
      const blob = new Blob([JSON.stringify({
        nodes: data.nodes.map((n) => ({ id: n.id, label: n.label, nodeType: n.nodeType ?? "server", subGraph: n.subGraph ?? { nodes: [], links: [] } })),
        links: data.links.map((l) => ({ source: l.source, target: l.target, weight: l.weight ?? null, directed: l.directed ?? true })),
      }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "topology.json"; a.click();
      URL.revokeObjectURL(url);
      return;
    }

    // PNG
    const svgElement = svgRef.current;
    if (!svgElement) return;
    const clone = svgElement.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const svgBlob = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width  = svgElement.clientWidth  || window.innerWidth;
      canvas.height = svgElement.clientHeight || window.innerHeight;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = DS.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => {
        const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "topology.png"; a.click();
      });
    };
    img.onerror = () => { addToast("PNG export failed.", "error"); URL.revokeObjectURL(url); };
    img.src = url;
  }

  function handleExport() {
    if (!data?.nodes?.length) return addToast("Nothing to export.", "warning");
    setModalConfig({
      title: "Export Graph",
      fields: [{ name: "format", label: "Export format", defaultValue: "json", options: ["json", "png"] }],
      onSubmit: ({ format }) => {
        setModalConfig(null);
        doExport(format);
      },
    });
  }

  function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed.nodes || !parsed.links) return addToast("Invalid file: must contain 'nodes' and 'links'.", "error");
        const errors = validateGraphData(parsed);
        if (errors.length) { addToast(errors[0], "error"); return; }
        const nodes = parsed.nodes.map((n) => ({ id: n.id, label: n.label ?? n.id, nodeType: n.nodeType ?? "server", subGraph: n.subGraph ?? { nodes: [], links: [] } }));
        const links = parsed.links.map((l) => ({ source: l.source, target: l.target, weight: l.weight ?? null, directed: l.directed ?? true }));
        updateData({ nodes, links });
        clearAllHighlights();
        addToast("Graph imported successfully.", "success");
      } catch { addToast("Failed to parse JSON.", "error"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // ── Versions ──────────────────────────────────────────────────────────────
  function openSaveVersionModal() {
    setModalConfig({
      title: "Save Version",
      fields: [{ name: "name", label: "Version name", defaultValue: "", placeholder: "e.g., v1-with-cdn", autoFocus: true }],
      onSubmit: ({ name }) => {
        if (!name.trim()) return setModalConfig(null);
        saveVersions({ ...versions, [name.trim()]: { nodes: data.nodes, links: data.links, savedAt: new Date().toISOString() } });
        setModalConfig(null);
      },
    });
  }

  function openLoadVersionModal() {
    const keys = Object.keys(versions);
    if (!keys.length) return addToast("No saved versions.", "warning");
    setModalConfig({
      title: "Load Version",
      fields: [{ name: "version", label: "Choose version", defaultValue: keys[0], options: keys }],
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
    if (!keys.length) return addToast("No saved versions.", "warning");
    setModalConfig({
      title: "Delete Version",
      fields: [
        { name: "version", label: "Choose version", defaultValue: keys[0], options: keys },
      ],
      onSubmit: ({ version }) => {
        const next = { ...versions }; delete next[version]; saveVersions(next);
        setModalConfig(null);
      },
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const drilldownNode = drilldownNodeId ? data.nodes.find((n) => n.id === drilldownNodeId) : null;

  const ctxValue = {
    // Search / Filter / Layout
    search, setSearch, searchRef,
    filter, setFilter,
    layoutType, setLayoutType,
    hierDirection, setHierDirection,
    // History
    historyCtrl,
    // Graph data
    graphStats, data, selected,
    // CRUD
    openAddNodeModal, openAddLinkModal,
    openEditNodeModal, openEditLinkModal,
    openDeleteSelectedModal,
    openDrilldown,
    selectedNodeHasSubGraph:
      selected.type === "node" &&
      (data.nodes.find((n) => n.id === selected.id)?.subGraph?.nodes?.length ?? 0) > 0,
    // Algorithms
    runBFS, runDFS, runTopologicalSort, runMST, runCycleDetection,
    openShortestPathModal,
    algorithmResult, clearAlgorithmResult: () => setAlgorithmResult(null),
    // Analysis
    runDegreeCentrality, runPageRank,
    clearAnalysis: () => setAnalysis(null), analysisActive: !!analysis,
    // Failure simulation
    failureMode, toggleFailureMode,
    pinMode, togglePinMode,
    failedCount: failedNodes.size, affectedCount: affectedNodes.size, resetFailure,
    // Versions
    versions, saveVersions,
    openSaveVersionModal, openLoadVersionModal, openDeleteVersionModal,
    updateData,
    // Export / Import
    handleExport, handleImport, fileInputRef,
    // Toast
    addToast,
  };

  return (
    <GraphEditorContext.Provider value={ctxValue}>
    <div style={{
      display: "flex",
      width: "100%",
      height: "100%",
      background: DS.bg,
      color: DS.textPrimary,
      fontFamily: "'JetBrains Mono', monospace",
      overflow: "hidden",
    }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Canvas */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {/* Failure mode banner */}
        {failureMode && (
          <div style={{
            position: "absolute",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid #ef4444",
            borderRadius: 2,
            padding: "5px 18px",
            color: "#ef4444",
            fontSize: 10,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            letterSpacing: "0.1em",
            zIndex: 100,
            pointerEvents: "none",
            boxShadow: "0 0 20px rgba(239,68,68,0.15)",
          }}>
            ⚠ FAILURE MODE — CLICK NODES TO MARK FAILED
          </div>
        )}

        <svg
          ref={svgRef}
          style={{
            width: "100%",
            height: "100%",
            background: DS.bg,
            display: "block",
          }}
        />

        {/* Node tooltip */}
        <div
          ref={tooltipRef}
          style={{
            position: "absolute",
            pointerEvents: "none",
            opacity: 0,
            background: DS.bgPanel,
            border: `1px solid ${DS.border}`,
            borderRadius: 10,
            padding: "8px 14px",
            fontSize: 11,
            fontFamily: "'Outfit', sans-serif",
            color: DS.textPrimary,
            lineHeight: 1.6,
            zIndex: 50,
            transition: "opacity 0.15s ease",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
            backdropFilter: "blur(16px)",
            maxWidth: 240,
            whiteSpace: "nowrap",
          }}
        />

        {/* Right-click context menu */}
        {ctxMenu && (
          <div
            style={{
              position: "absolute",
              left: ctxMenu.x,
              top: ctxMenu.y,
              background: DS.bgPanel,
              border: `1px solid ${DS.border}`,
              borderRadius: 12,
              padding: "6px 0",
              zIndex: 200,
              boxShadow: "0 12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
              backdropFilter: "blur(16px)",
              minWidth: 180,
              fontFamily: "'Outfit', sans-serif",
              fontSize: 12,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {[
              { label: "Edit Node", action: () => { openEditNodeModal(); setCtxMenu(null); } },
              { label: "Add Link from Here", action: () => { openAddLinkModal(); setCtxMenu(null); } },
              { label: "Drill Down", action: () => { openDrilldown(); setCtxMenu(null); } },
              null,
              { label: "Delete Node", action: () => { openDeleteSelectedModal(); setCtxMenu(null); }, danger: true },
            ].map((item, i) =>
              item === null ? (
                <div key={i} style={{ height: 1, background: DS.border, margin: "4px 0" }} />
              ) : (
                <div
                  key={i}
                  onClick={item.action}
                  style={{
                    padding: "7px 16px",
                    cursor: "pointer",
                    color: item.danger ? DS.danger : DS.textSecond,
                    fontWeight: 500,
                    transition: "all 0.1s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = DS.bgCard; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  {item.label}
                </div>
              )
            )}
          </div>
        )}

        {/* Empty state */}
        {data.nodes.length === 0 && (
          <div style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            pointerEvents: "none",
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={DS.accent} strokeWidth="1" opacity="0.3">
              <circle cx="12" cy="4" r="2"/>
              <circle cx="4" cy="20" r="2"/>
              <circle cx="20" cy="20" r="2"/>
              <line x1="12" y1="6" x2="5.5" y2="18.5"/>
              <line x1="12" y1="6" x2="18.5" y2="18.5"/>
              <line x1="6" y1="20" x2="18" y2="20"/>
            </svg>
            <span style={{ fontSize: 13, color: DS.textMuted, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}>
              NO NODES YET
            </span>
            <span style={{ fontSize: 12, color: DS.textMuted, opacity: 0.6, fontFamily: "'JetBrains Mono', monospace" }}>
              Click + NODE in the sidebar to get started
            </span>
          </div>
        )}

        {/* Toast notifications */}
        <ToastContainer toasts={toasts} removeToast={removeToast} />

        {/* Drill-down panel */}
        {drilldownNode && (
          <DrilldownPanel
            node={drilldownNode}
            onUpdate={handleSubGraphUpdate}
            onClose={() => setDrilldownNodeId(null)}
            addToast={addToast}
          />
        )}
      </div>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        style={{ display: "none" }}
      />

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
    </GraphEditorContext.Provider>
  );
}