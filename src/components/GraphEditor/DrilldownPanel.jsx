// src/components/GraphEditor/DrilldownPanel.jsx
// Shows the internal sub-architecture of a selected node.
// Users can add/delete components and links within the sub-graph.

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { styles, NODE_TYPE_COLORS, NODE_TYPES, NODE_TYPE_LABELS } from "./styles";
import Modal from "./Modal";
import { makeUniqueId } from "./utils/helpers";

export default function DrilldownPanel({ node, onUpdate, onClose }) {
  const svgRef = useRef(null);
  const simRef = useRef(null);
  const [subData, setSubData] = useState(
    () => node.subGraph || { nodes: [], links: [] }
  );
  const [subSelected, setSubSelected] = useState({ type: null, id: null });
  const [modal, setModal] = useState(null);

  const typeColor = NODE_TYPE_COLORS[node.nodeType] || "#6c63ff";

  // --- D3 rendering ---
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    const { width, height } = svgEl.getBoundingClientRect();
    const w = width || 380;
    const h = height || 320;

    svg.selectAll("*").remove();

    if (subData.nodes.length === 0) return;

    const container = svg.append("g");
    svg
      .call(
        d3.zoom()
          .scaleExtent([0.3, 3])
          .on("zoom", (e) => container.attr("transform", e.transform))
      );

    svg
      .append("defs")
      .append("marker")
      .attr("id", "sub-arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 22)
      .attr("refY", 0)
      .attr("markerWidth", 5)
      .attr("markerHeight", 5)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", typeColor);

    const nodesCopy = subData.nodes.map((n) => ({ ...n }));
    const linksCopy = subData.links.map((l) => ({ ...l }));

    const sim = d3
      .forceSimulation(nodesCopy)
      .force("link", d3.forceLink(linksCopy).id((d) => d.id).distance(70))
      .force("charge", d3.forceManyBody().strength(-180))
      .force("center", d3.forceCenter(w / 2, h / 2))
      .on("tick", ticked);
    simRef.current = sim;

    const linkSel = container
      .append("g")
      .selectAll("line")
      .data(linksCopy)
      .join("line")
      .attr("stroke", typeColor)
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.7)
      .attr("marker-end", (d) => (d.directed !== false ? "url(#sub-arrow)" : null));

    const nodeG = container
      .append("g")
      .selectAll("g")
      .data(nodesCopy, (d) => d.id)
      .join((enter) => {
        const g = enter.append("g").style("cursor", "pointer");
        g.append("circle").attr("r", 18).attr("stroke-width", 2);
        g.append("text")
          .attr("y", 5)
          .attr("text-anchor", "middle")
          .attr("fill", "#f5f5f7")
          .style("font-size", 10)
          .style("pointer-events", "none");
        return g;
      });

    nodeG
      .select("circle")
      .attr("fill", (d) => NODE_TYPE_COLORS[d.nodeType] || "#2f2f37")
      .attr("stroke", (d) =>
        subSelected.type === "node" && subSelected.id === d.id
          ? "#ff7b00"
          : typeColor
      )
      .on("click", (e, d) => {
        e.stopPropagation();
        setSubSelected({ type: "node", id: d.id });
      })
      .call(
        d3
          .drag()
          .on("start", (e, d) => {
            if (!e.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (e, d) => {
            d.fx = e.x;
            d.fy = e.y;
          })
          .on("end", (e, d) => {
            if (!e.active) sim.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    nodeG.select("text").text((d) => (d.label || d.id).substring(0, 8));

    function ticked() {
      linkSel
        .attr("x1", (d) => (typeof d.source === "object" ? d.source.x : 0))
        .attr("y1", (d) => (typeof d.source === "object" ? d.source.y : 0))
        .attr("x2", (d) => (typeof d.target === "object" ? d.target.x : 0))
        .attr("y2", (d) => (typeof d.target === "object" ? d.target.y : 0));
      nodeG.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    }

    svg.on("click", () => setSubSelected({ type: null, id: null }));

    return () => {
      if (simRef.current) simRef.current.stop();
    };
  }, [subData, subSelected, typeColor]);

  // --- Actions ---
  function addComponent() {
    setModal({
      title: "Add Component",
      fields: [
        {
          name: "label",
          label: "Name",
          defaultValue: "",
          placeholder: "e.g., Auth Module",
          autoFocus: true,
        },
        {
          name: "nodeType",
          label: "Type",
          defaultValue: "microservice",
          options: NODE_TYPES,
        },
      ],
      onSubmit: ({ label, nodeType }) => {
        if (!label) return setModal(null);
        const id = makeUniqueId(label.replace(/\s+/g, "_"), subData.nodes);
        setSubData((d) => ({
          ...d,
          nodes: [...d.nodes, { id, label, nodeType: nodeType || "microservice" }],
        }));
        setModal(null);
      },
    });
  }

  function addLink() {
    if (subSelected.type !== "node") {
      alert("Select a component first.");
      return;
    }
    const from = subSelected.id;
    setModal({
      title: `Add link from "${from}"`,
      fields: [
        {
          name: "target",
          label: "Target component ID",
          defaultValue: "",
          placeholder: "component id",
        },
        {
          name: "directed",
          label: "Directed?",
          defaultValue: "yes",
          options: ["yes", "no"],
        },
      ],
      onSubmit: ({ target, directed }) => {
        if (!target) return setModal(null);
        if (!subData.nodes.find((n) => n.id === target)) {
          alert("Target not found.");
          return setModal(null);
        }
        const already = subData.links.some(
          (l) => l.source === from && l.target === target
        );
        if (already) {
          alert("Link already exists.");
          return setModal(null);
        }
        setSubData((d) => ({
          ...d,
          links: [
            ...d.links,
            { source: from, target, directed: directed === "yes" },
          ],
        }));
        setModal(null);
      },
    });
  }

  function deleteSelected() {
    if (!subSelected.type) return;
    if (subSelected.type === "node") {
      const id = subSelected.id;
      setSubData((d) => ({
        nodes: d.nodes.filter((n) => n.id !== id),
        links: d.links.filter((l) => l.source !== id && l.target !== id),
      }));
    }
    setSubSelected({ type: null, id: null });
  }

  function saveAndClose() {
    onUpdate(subData);
    onClose();
  }

  return (
    <div
      style={{
        position: "fixed",
        right: 0,
        top: 0,
        bottom: 0,
        width: 420,
        background: "#0a0a12",
        borderLeft: `2px solid ${typeColor}`,
        display: "flex",
        flexDirection: "column",
        zIndex: 1500,
        boxShadow: "-10px 0 40px rgba(0,0,0,0.7)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid #1e1e28",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 11,
                height: 11,
                borderRadius: "50%",
                background: typeColor,
                flexShrink: 0,
              }}
            />
            <strong style={{ color: "#eaeaf2", fontSize: 15 }}>
              {node.label}
            </strong>
            <span
              style={{
                fontSize: 11,
                color: typeColor,
                background: `${typeColor}22`,
                borderRadius: 4,
                padding: "1px 6px",
              }}
            >
              {NODE_TYPE_LABELS[node.nodeType] || node.nodeType}
            </span>
          </div>
          <small style={{ color: "#9aa0b4", fontSize: 11 }}>
            Sub-architecture · {subData.nodes.length} component
            {subData.nodes.length !== 1 ? "s" : ""}
          </small>
        </div>
        <button
          onClick={onClose}
          style={{ ...styles.ghostBtn, padding: "4px 10px", fontSize: 14 }}
        >
          ✕
        </button>
      </div>

      {/* Controls */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid #1e1e28",
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={addComponent}
          style={{ ...styles.btn, fontSize: 12, padding: "6px 10px" }}
        >
          + Component
        </button>
        <button
          onClick={addLink}
          disabled={subSelected.type !== "node"}
          style={{
            ...styles.btn,
            fontSize: 12,
            padding: "6px 10px",
            opacity: subSelected.type === "node" ? 1 : 0.45,
          }}
        >
          + Link
        </button>
        <button
          onClick={deleteSelected}
          disabled={!subSelected.type}
          style={{
            ...styles.ghostBtn,
            fontSize: 12,
            padding: "6px 10px",
            opacity: subSelected.type ? 1 : 0.45,
          }}
        >
          Delete
        </button>
      </div>

      {/* Node list (when no nodes yet) or SVG */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />
        {subData.nodes.length === 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#4a4a5a",
              gap: 10,
              pointerEvents: "none",
            }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={typeColor} strokeWidth="1" opacity="0.4">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="4" />
              <line x1="12" y1="2" x2="12" y2="8" />
              <line x1="12" y1="16" x2="12" y2="22" />
              <line x1="2" y1="12" x2="8" y2="12" />
              <line x1="16" y1="12" x2="22" y2="12" />
            </svg>
            <span style={{ fontSize: 13, color: "#6a6a7a" }}>
              No internal components yet
            </span>
            <span style={{ fontSize: 11, color: "#4a4a5a" }}>
              Click "+ Component" to model the internals
            </span>
          </div>
        )}
      </div>

      {/* Component list */}
      {subData.nodes.length > 0 && (
        <div
          style={{
            borderTop: "1px solid #1e1e28",
            padding: "8px 14px",
            maxHeight: 100,
            overflowY: "auto",
          }}
        >
          {subData.nodes.map((n) => (
            <div
              key={n.id}
              onClick={() => setSubSelected({ type: "node", id: n.id })}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 6px",
                borderRadius: 6,
                cursor: "pointer",
                background:
                  subSelected.id === n.id ? "#1e1e2e" : "transparent",
                marginBottom: 2,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: NODE_TYPE_COLORS[n.nodeType] || "#6c63ff",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 12, color: "#cfcfe0" }}>{n.label}</span>
              <span style={{ fontSize: 10, color: "#6a6a7a", marginLeft: "auto" }}>
                {n.id}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          padding: "12px 14px",
          borderTop: "1px solid #1e1e28",
          display: "flex",
          gap: 8,
        }}
      >
        <button onClick={saveAndClose} style={{ ...styles.btn, flex: 1 }}>
          Save & Close
        </button>
        <button onClick={onClose} style={{ ...styles.ghostBtn, flex: 1 }}>
          Discard
        </button>
      </div>

      {modal && (
        <Modal
          title={modal.title}
          fields={modal.fields}
          onSubmit={modal.onSubmit}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
