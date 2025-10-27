// src/components/GraphEditor/GraphEditor.jsx
// Komplett version med:
// - Normal, Hierarchical & Circular layouts
// - Riktade länkar i Normal layout (directed property)
// - Shortest path respekterar riktning
// - Pilar i Hierarchical layout (parent → child)
// - Degree Centrality & PageRank analyser
// - Återställd drag-funktionalitet (flytta noder fritt i Normal)
// - All tidigare logik intakt

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

import { useHistoryState } from "./utils/history";
import { makeUniqueId, parseLinkQuery } from "./utils/helpers";
import { dijkstra } from "./utils/dijkstra";
import { computeHierarchyPositions, computeCircularPositions } from "./utils/layout";
import { styles } from "./styles";

import Modal from "./Modal";
import Sidebar from "./Sidebar";

export default function GraphEditor() {
  const svgRef = useRef(null);
  const fileInputRef = useRef(null);

  const [selected, setSelected] = useState({ type: null, id: null });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [shortestPath, setShortestPath] = useState([]);
  const [modalConfig, setModalConfig] = useState(null);
  const [layoutType, setLayoutType] = useState("NORMAL");
  const [hierDirection, setHierDirection] = useState("TB");
  const [analysis, setAnalysis] = useState(null);

  const [data, updateData, historyCtrl] = useHistoryState({
    nodes: [
      { id: "A", label: "A" },
      { id: "B", label: "B" },
      { id: "C", label: "C" },
    ],
    links: [
      { source: "A", target: "B", weight: null, directed: true },
      { source: "B", target: "C", weight: null, directed: true },
    ],
  });

  const simRef = useRef(null);

  const [versions, setVersions] = useState(() => {
    try {
      const raw = localStorage.getItem("graph_versions");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

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
    svg.call(d3.zoom().scaleExtent([0.1, 4]).on("zoom", (e) => container.attr("transform", e.transform)));

    // Create marker (arrowhead) for hierarchical and directed links
    if (layoutType === "HIERARCHICAL" || layoutType === "NORMAL") {
      svg.append("defs")
        .append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 20)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#6c63ff");
    }

    const filterIds = filter ? filter.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const visibleNodes = filterIds.length ? data.nodes.filter((n) => filterIds.includes(n.id)) : data.nodes;
    const visibleLinks = filterIds.length
      ? data.links.filter((l) => filterIds.includes(l.source) && filterIds.includes(l.target))
      : data.links;

    const nodesCopy = visibleNodes.map((n) => ({ ...n }));
    const linksCopy = visibleLinks.map((l) => ({ ...l }));

    let usingSimulation = true;

    if (layoutType === "HIERARCHICAL") {
      const positions = computeHierarchyPositions(nodesCopy, linksCopy, hierDirection, width, height);
      nodesCopy.forEach((n) => {
        const pos = positions.get(n.id);
        n.x = pos?.x || width / 2;
        n.y = pos?.y || height / 2;
        n.fx = n.x;
        n.fy = n.y;
      });
      usingSimulation = false;
      if (simRef.current) simRef.current.stop();
    } else if (layoutType === "CIRCULAR") {
      const positions = computeCircularPositions(nodesCopy, width, height);
      nodesCopy.forEach((n) => {
        const pos = positions.get(n.id);
        n.x = pos?.x || width / 2;
        n.y = pos?.y || height / 2;
        n.fx = n.x;
        n.fy = n.y;
      });
      usingSimulation = false;
      if (simRef.current) simRef.current.stop();
    } else {
      const simulation = d3
        .forceSimulation(nodesCopy)
        .force("link", d3.forceLink(linksCopy).id((d) => d.id).distance(80))
        .force("charge", d3.forceManyBody().strength(-220))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .on("tick", ticked);
      simRef.current = simulation;
      usingSimulation = true;
    }
    const linkGroup = container.append("g").attr("class", "links");
    const nodeGroup = container.append("g").attr("class", "nodes");

    const linkQuery = parseLinkQuery(search);
    const nodeSearch = search && !linkQuery ? search.toLowerCase() : null;

    const link = linkGroup
      .selectAll("line")
      .data(linksCopy)
      .join("line")
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.65)
      .style("cursor", "pointer")
      .attr("marker-end", (d) => {
        if (layoutType === "HIERARCHICAL") return "url(#arrowhead)";
        if (layoutType === "NORMAL" && d.directed) return "url(#arrowhead)";
        return null;
      })
      .on("click", (e, d) => {
        e.stopPropagation();
        const src = typeof d.source === "object" ? d.source.id : d.source;
        const tgt = typeof d.target === "object" ? d.target.id : d.target;
        setSelected({ type: "link", id: { source: src, target: tgt } });
      });

    link.attr("stroke", (d) => {
      const src = typeof d.source === "object" ? d.source.id : d.source;
      const tgt = typeof d.target === "object" ? d.target.id : d.target;
      const isSel = selected.type === "link" && selected.id?.source === src && selected.id?.target === tgt;
      const isSearched =
        linkQuery && ((linkQuery[0] === src && linkQuery[1] === tgt) || (linkQuery[0] === tgt && linkQuery[1] === src));
      let inPath = false;
      for (let i = 0; i < shortestPath.length - 1; i++) {
        const a = shortestPath[i], b = shortestPath[i + 1];
        if ((a === src && b === tgt) || (a === tgt && b === src)) {
          inPath = true;
          break;
        }
      }
      if (inPath) return "#ffd166";
      if (isSel) return "#ff7b00";
      if (isSearched) return "#00eaff";
      return "#6c63ff";
    });

    const weightLabels = linkGroup
      .selectAll("text")
      .data(linksCopy)
      .join("text")
      .attr("fill", "#cfcfe0")
      .attr("font-size", 11)
      .attr("text-anchor", "middle")
      .text((d) => (d.weight == null ? "" : d.weight));

    const node = nodeGroup
      .selectAll("g")
      .data(nodesCopy, (d) => d.id)
      .join((enter) => {
        const g = enter.append("g");
        g.append("circle").attr("r", (d) => Math.max(10, 10 + d.label.length * 1.8));
        g.append("text").attr("y", 5).attr("text-anchor", "middle").attr("fill", "#f5f5f7").style("pointer-events", "none").style("font-size", 12);
        return g;
      });


    let colorScale = null;
    if (analysis?.values) {
      const values = Object.values(analysis.values);
      const min = Math.min(...values);
      const max = Math.max(...values);
      colorScale = d3.scaleLinear().domain([min, max]).range(["#6c63ff", "#ffd166"]);
    }

    node
      .select("circle")
      .attr("fill", (d) => {
        if (analysis?.values && colorScale) return colorScale(analysis.values[d.id] || 0);
        if (shortestPath.includes(d.id)) return "#ffd166";
        if (selected.type === "node" && selected.id === d.id) return "#ff7b00";
        if (nodeSearch && d.label.toLowerCase().includes(nodeSearch)) return "#00eaff";
        return "#2f2f37";
      })
      .attr("stroke", "#6c63ff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("click", (e, d) => {
        e.stopPropagation();
        setSelected({ type: "node", id: d.id });
      })
      .call(
        d3.drag()
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
            if (layoutType === "HIERARCHICAL" || layoutType === "CIRCULAR") {
              d.fx = d.fx;
              d.fy = d.fy;
            } else {
              d.fx = null;
              d.fy = null;
            }
          })
      );

    node.select("text").text((d) => d.label || d.id);

    if (analysis?.values) {
      node
        .append("text")
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .attr("fill", "#cfcfe0")
        .style("font-size", 10)
        .text((d) => analysis.values[d.id]?.toFixed(2));
    }

    function ticked() {
      link
        .attr("x1", (d) => (typeof d.source === "object" ? d.source.x : nodesCopy.find((n) => n.id === d.source)?.x))
        .attr("y1", (d) => (typeof d.source === "object" ? d.source.y : nodesCopy.find((n) => n.id === d.source)?.y))
        .attr("x2", (d) => (typeof d.target === "object" ? d.target.x : nodesCopy.find((n) => n.id === d.target)?.x))
        .attr("y2", (d) => (typeof d.target === "object" ? d.target.y : nodesCopy.find((n) => n.id === d.target)?.y));

      weightLabels
        .attr("x", (d) => {
          const sx = typeof d.source === "object" ? d.source.x : nodesCopy.find((n) => n.id === d.source)?.x;
          const tx = typeof d.target === "object" ? d.target.x : nodesCopy.find((n) => n.id === d.target)?.x;
          return (sx + tx) / 2;
        })
        .attr("y", (d) => {
          const sy = typeof d.source === "object" ? d.source.y : nodesCopy.find((n) => n.id === d.source)?.y;
          const ty = typeof d.target === "object" ? d.target.y : nodesCopy.find((n) => n.id === d.target)?.y;
          return (sy + ty) / 2 - 8;
        });

      node.attr("transform", (d) => `translate(${d.x}, ${d.y})`);
    }

    if (!usingSimulation) ticked();

    svg.on("click", () => {
      setSelected({ type: null, id: null });
      setShortestPath([]);
    });

    return () => {
      if (simRef.current) {
        try {
          simRef.current.stop();
        } catch {}
        simRef.current = null;
      }
    };
  }, [data, search, filter, selected, shortestPath, layoutType, hierDirection, analysis]);  /* -------------------------
     Modal-handlers & helpers
     ------------------------- */
  function openAddNodeModal() {
    setModalConfig({
      title: "Add Node",
      fields: [{ name: "label", label: "Label", defaultValue: "", placeholder: "Node label", autoFocus: true }],
      onSubmit: ({ label }) => {
        if (!label) return setModalConfig(null);
        applyChange((d) => {
          const idBase = label.replace(/\s+/g, "_") || "node";
          const id = makeUniqueId(idBase, d.nodes);
          return { nodes: [...d.nodes, { id, label }], links: d.links };
        });
        setModalConfig(null);
      },
    });
  }

  function openAddLinkModal() {
    if (selected.type !== "node") return alert("Select a node first.");
    const selectedNode = selected.id;

    const hierarchical = layoutType === "HIERARCHICAL";
    const isNormal = layoutType === "NORMAL";

    setModalConfig({
      title: hierarchical
        ? `Add Link (selected = ${selectedNode}, relation Parent/Child)`
        : `Add Link (selected = ${selectedNode})`,
      fields: [
        hierarchical
          ? { name: "relation", label: "Relation", defaultValue: "parent→child", options: ["parent→child", "child→parent"] }
          : { name: "direction", label: "Direction", defaultValue: "outgoing", options: ["outgoing", "incoming"] },
        { name: "other", label: "Other node id", defaultValue: "", placeholder: "Existing node id (e.g., A1)" },
        { name: "weight", label: "Weight (optional)", defaultValue: "", placeholder: "Number or leave blank" },
        ...(isNormal
          ? [{ name: "directed", label: "Directed?", defaultValue: "no", options: ["no", "yes"] }]
          : []),
      ],
      onSubmit: ({ relation, direction, other, weight, directed }) => {
        if (!other) return setModalConfig(null);
        const otherNode = data.nodes.find((n) => n.id === other);
        if (!otherNode) { alert("Other node not found."); return setModalConfig(null); }

        let source, target;
        if (hierarchical) {
          // parent→child: selected = parent, other = child
          // child→parent: selected = child, other = parent
          if (relation === "child→parent") {
            source = other;           // parent
            target = selectedNode;    // child
          } else {
            source = selectedNode;    // parent
            target = other;           // child
          }
        } else {
          [source, target] = direction === "outgoing" ? [selectedNode, other] : [other, selectedNode];
        }

        const exists = data.links.some((l) => l.source === source && l.target === target);
        if (exists) { alert("Link already exists in that direction."); return setModalConfig(null); }

        const w = weight === "" ? null : (isNaN(Number(weight)) ? null : Number(weight));
        const isDirected = directed === "yes";
        applyChange((d) => ({ 
          nodes: d.nodes, 
          links: [...d.links, { source, target, weight: w, directed: isDirected }] 
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
      title: `Edit Node (${node.id})`,
      fields: [{ name: "label", label: "Label", defaultValue: node.label, placeholder: "New label", autoFocus: true }],
      onSubmit: ({ label }) => {
        if (!label) return setModalConfig(null);
        applyChange((d) => ({
          nodes: d.nodes.map((n) => (n.id === node.id ? { ...n, label } : n)),
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
      (l) => (l.source === source && l.target === target) || (l.source === target && l.target === source)
    );
    if (!link) return;

    const hierarchical = layoutType === "HIERARCHICAL";
    const isNormal = layoutType === "NORMAL";

    setModalConfig({
      title: `Edit Link (${link.source} - ${link.target})`,
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
                label: "Relation (Hierarchical)",
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
                options: ["no", "yes"],
              },
            ]
          : []),
      ],
      onSubmit: ({ source: newSource, target: newTarget, weight, relation, directed }) => {
        if (!newSource || !newTarget) return setModalConfig(null);
        if (!data.nodes.find((n) => n.id === newSource) || !data.nodes.find((n) => n.id === newTarget)) {
          alert("Source or target node id not found.");
          return setModalConfig(null);
        }

        // If hierarchical: interpret relation as parent→child, else keep direction
        let finalSource = newSource;
        let finalTarget = newTarget;
        if (hierarchical) {
          if (relation === "parent→child") {
            finalSource = newSource;
            finalTarget = newTarget;
          } else {
            // child→parent => flip
            finalSource = newTarget;
            finalTarget = newSource;
          }
        }

        const exists = data.links.some((l) => {
          const sameEdited =
            (l.source === link.source && l.target === link.target) ||
            (l.source === link.target && l.target === link.source);
          const wouldBe =
            (l.source === finalSource && l.target === finalTarget) ||
            (l.source === finalTarget && l.target === finalSource);
          return !sameEdited && wouldBe;
        });
        if (exists) { alert("Another link between those nodes already exists."); return setModalConfig(null); }

        const w = weight === "" ? null : (isNaN(Number(weight)) ? null : Number(weight));
        const isDirected = directed === "yes";
        applyChange((d) => ({
          nodes: d.nodes,
          links: d.links.map((l) =>
            ((l.source === link.source && l.target === link.target) ||
              (l.source === link.target && l.target === link.source))
              ? { source: finalSource, target: finalTarget, weight: w, directed: isDirected }
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
        : `${selected.id.source} - ${selected.id.target}`;
    setModalConfig({
      title: `Delete ${selected.type}`,
      fields: [{ name: "confirm", label: `Type DELETE to confirm deletion of ${label}`, defaultValue: "" }],
      onSubmit: ({ confirm }) => {
        if (confirm !== "DELETE") return setModalConfig(null);
        if (selected.type === "node") {
          const id = selected.id;
          applyChange((d) => ({
            nodes: d.nodes.filter((n) => n.id !== id),
            links: d.links.filter((l) => l.source !== id && l.target !== id),
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
    if (shortestPath.length > 0) return setShortestPath([]);
    if (layoutType !== "NORMAL") {
      return alert("Shortest path can only be run in Normal layout.");
    }
    const missing = data.links.some(
      (l) => l.weight == null || Number.isNaN(Number(l.weight))
    );
    if (missing) return alert("Cannot run shortest path: all links must have weights.");
    setModalConfig({
      title: "Find shortest path",
      fields: [
        { name: "start", label: "Start node id", defaultValue: "", autoFocus: true },
        { name: "end", label: "End node id", defaultValue: "" },
      ],
      onSubmit: ({ start, end }) => {
        if (!start || !end) return setModalConfig(null);
        if (!data.nodes.find((n) => n.id === start) || !data.nodes.find((n) => n.id === end)) {
          alert("Start or end node not found.");
          return setModalConfig(null);
        }
        const path = dijkstra(data.nodes, data.links, start, end);
        if (!path) alert("No path found.");
        else setShortestPath(path);
        setModalConfig(null);
      },
    });
  }  /* -------------------------
     Export / Import
     ------------------------- */
  function handleExport() {
    if (!data || !data.nodes || !data.links) {
      alert("Nothing to export.");
      return;
    }

    // choice of "uml" or "png"
    const choice = window.prompt(
      "Choose export type:\n- Type 'uml' for GraphUML (JSON)\n- Type 'png' for image export (PNG)",
      "png"
    );
    if (!choice) return;

    // === GraphUML (JSON) ===
    if (choice.toLowerCase() === "uml" || choice.toLowerCase() === "graphuml") {
      try {
        const jsonContent = JSON.stringify(
          {
            nodes: data.nodes.map((n) => ({ id: n.id, label: n.label })),
            links: data.links.map((l) => ({
              source: l.source,
              target: l.target,
              weight: l.weight ?? null,
              directed: l.directed ?? false,
            })),
          },
          null,
          2
        );
        const blob = new Blob([jsonContent], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "graph.graphuml.json";
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error("Export failed:", e);
        alert("Export av GraphUML misslyckades.");
      }
      return;
    }

    // === PNG ===
    const svgElement = svgRef.current;
    if (!svgElement) return;

    // Clone SVG and serialize
    const clone = svgElement.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const svgData = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function () {
      const width = svgElement.clientWidth || window.innerWidth;
      const height = svgElement.clientHeight || window.innerHeight;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#070708";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        const pngUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = "graph.png";
        a.click();
        URL.revokeObjectURL(pngUrl);
      });
    };

    img.onerror = function (err) {
      console.error("Kunde inte ladda SVG för export:", err);
      alert("Export till PNG misslyckades.");
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
          return alert("Invalid file format: must contain nodes and links.");
        const nodes = parsed.nodes.map((n) => ({ id: n.id, label: n.label ?? n.id }));
        const links = parsed.links.map((l) => ({
          source: l.source,
          target: l.target,
          weight: l.weight ?? null,
          directed: l.directed ?? false,
        }));
        updateData({ nodes, links });
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
      title: "Save current version",
      fields: [{ name: "name", label: "Version name", defaultValue: "", placeholder: "e.g., demo1", autoFocus: true }],
      onSubmit: ({ name }) => {
        if (!name) return setModalConfig(null);
        const newVersions = {
          ...versions,
          [name]: { nodes: data.nodes, links: data.links, savedAt: new Date().toISOString() },
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
      title: "Load saved version",
      fields: [{ name: "version", label: "Choose version", defaultValue: keys[0], options: keys }],
      onSubmit: ({ version }) => {
        const v = versions[version];
        if (!v) return setModalConfig(null);
        updateData({ nodes: v.nodes, links: v.links });
        setModalConfig(null);
      },
    });
  }

  function openDeleteVersionModal() {
    const keys = Object.keys(versions);
    if (!keys.length) return alert("No saved versions.");
    setModalConfig({
      title: "Delete saved version",
      fields: [
        { name: "version", label: "Choose version", defaultValue: keys[0], options: keys },
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
     Analysis functions
     ------------------------- */
  function runDegreeCentrality() {
    const values = {};
    data.nodes.forEach((n) => {
      const count = data.links.filter((l) => l.source === n.id || l.target === n.id).length;
      values[n.id] = count;
    });
    setAnalysis({ type: "degree", values });
  }

  function runPageRank() {
    if (layoutType !== "HIERARCHICAL") {
      alert("PageRank kan bara köras i hierarkisk layout.");
      return;
    }
    // Simple hierarchical PageRank: r(root)=1, r(child)=0.85 * r(parent) (along all parents, take max)
    const indegree = {};
    data.nodes.forEach((n) => (indegree[n.id] = 0));
    data.links.forEach((l) => { indegree[l.target] = (indegree[l.target] || 0) + 1; });
    const roots = data.nodes.filter((n) => indegree[n.id] === 0).map((n) => n.id);

    const queue = [...roots];
    const rank = {};
    roots.forEach((r) => (rank[r] = 1));

    while (queue.length) {
      const parent = queue.shift();
      const children = data.links.filter((l) => l.source === parent).map((l) => l.target);
      children.forEach((c) => {
        rank[c] = Math.max(rank[c] || 0, (rank[parent] || 1) * 0.85);
        queue.push(c);
      });
    }

    const maxVal = Math.max(1, ...Object.values(rank));
    const values = {};
    data.nodes.forEach((n) => { values[n.id] = (rank[n.id] || 0) / maxVal; });

    setAnalysis({ type: "pagerank", values });
  }

  /* -------------------------
     Render UI
     ------------------------- */
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
      {/* Left sidebar */}
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
        setSelected={setSelected}
        parseLinkQuery={parseLinkQuery}
        runDegreeCentrality={runDegreeCentrality}
        runPageRank={runPageRank}
        clearAnalysis={() => setAnalysis(null)}
        layoutIsHierarchical={layoutType === "HIERARCHICAL"}
        analysisActive={!!analysis}
      />

      {/* Main area with the graph */}
      <div style={{ flex: 1 }}>
        <svg
          ref={svgRef}
          style={{ width: "100vw", height: "100vh", background: "#070708" }}
        />
      </div>

      {/* Modal for all operations */}
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