// src/components/GraphEditor/DrilldownPanel.jsx
// Internal sub-architecture viewer for a selected node.

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { styles, DS, MONO, DISPLAY, NODE_TYPE_COLORS, NODE_TYPES, NODE_TYPE_LABELS } from "./styles";
import Modal from "./Modal";
import { makeUniqueId } from "./utils/helpers";

export default function DrilldownPanel({ node, onUpdate, onClose, addToast }) {
  const svgRef   = useRef(null);
  const simRef   = useRef(null);
  const [subData, setSubData]     = useState(() => node.subGraph || { nodes: [], links: [] });
  const [subSel,  setSubSel]      = useState({ type: null, id: null });
  const [modal,   setModal]       = useState(null);

  const typeColor = NODE_TYPE_COLORS[node.nodeType] || DS.accent;

  // ── D3 mini-canvas ────────────────────────────────────────────────────
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    const { width, height } = svgEl.getBoundingClientRect();
    const w = width  || 380;
    const h = height || 320;

    svg.selectAll("*").remove();
    if (subData.nodes.length === 0) return;

    const container = svg.append("g");
    svg.call(
      d3.zoom().scaleExtent([0.3, 3])
        .on("zoom", (e) => container.attr("transform", e.transform))
    );

    svg.append("defs").append("marker")
      .attr("id", "sub-arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 22).attr("refY", 0)
      .attr("markerWidth", 5).attr("markerHeight", 5)
      .attr("orient", "auto")
      .append("path").attr("d", "M0,-5L10,0L0,5").attr("fill", typeColor);

    const nodesCopy = subData.nodes.map((n) => ({ ...n }));
    const linksCopy = subData.links.map((l) => ({ ...l }));

    const sim = d3.forceSimulation(nodesCopy)
      .force("link", d3.forceLink(linksCopy).id((d) => d.id).distance(80))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(w / 2, h / 2))
      .on("tick", ticked);
    simRef.current = sim;

    const linkSel = container.append("g")
      .selectAll("line").data(linksCopy).join("line")
      .attr("stroke", typeColor)
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.5)
      .attr("marker-end", (d) => (d.directed !== false ? "url(#sub-arrow)" : null));

    const nodeG = container.append("g")
      .selectAll("g").data(nodesCopy, (d) => d.id)
      .join((enter) => {
        const g = enter.append("g").style("cursor", "pointer");
        g.append("circle").attr("r", 18).attr("stroke-width", 2);
        g.append("text")
          .attr("y", 5)
          .attr("text-anchor", "middle")
          .attr("fill", DS.textPrimary)
          .style("font-size", "9px")
          .style("font-family", MONO)
          .style("pointer-events", "none");
        return g;
      });

    nodeG.select("circle")
      .attr("fill", (d) => NODE_TYPE_COLORS[d.nodeType] || DS.bgCard)
      .attr("stroke", (d) =>
        subSel.type === "node" && subSel.id === d.id ? DS.accent : typeColor
      )
      .attr("stroke-width", (d) =>
        subSel.type === "node" && subSel.id === d.id ? 2.5 : 1.5
      )
      .on("click", (e, d) => {
        e.stopPropagation();
        setSubSel({ type: "node", id: d.id });
      })
      .on("mouseover", function() {
        d3.select(this).transition().duration(120)
          .attr("r", 20)
          .style("filter", `drop-shadow(0 0 6px ${typeColor})`);
      })
      .on("mouseout", function() {
        d3.select(this).transition().duration(120)
          .attr("r", 18)
          .style("filter", null);
      })
      .call(
        d3.drag()
          .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on("drag",  (e, d) => { d.fx = e.x; d.fy = e.y; })
          .on("end",   (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    nodeG.select("text").text((d) => (d.label || d.id).substring(0, 10));

    function ticked() {
      linkSel
        .attr("x1", (d) => typeof d.source === "object" ? d.source.x : 0)
        .attr("y1", (d) => typeof d.source === "object" ? d.source.y : 0)
        .attr("x2", (d) => typeof d.target === "object" ? d.target.x : 0)
        .attr("y2", (d) => typeof d.target === "object" ? d.target.y : 0);
      nodeG.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    }

    svg.on("click", () => setSubSel({ type: null, id: null }));

    return () => { simRef.current?.stop(); };
  }, [subData, subSel, typeColor]);

  // ── Actions ───────────────────────────────────────────────────────────
  function addComponent() {
    setModal({
      title: "Add Component",
      fields: [
        { name: "label", label: "Name", defaultValue: "", placeholder: "e.g., Auth Module", autoFocus: true },
        { name: "nodeType", label: "Type", defaultValue: "microservice", options: NODE_TYPES },
      ],
      onSubmit: ({ label, nodeType }) => {
        if (!label.trim()) return setModal(null);
        const id = makeUniqueId(label.replace(/\s+/g, "_").toLowerCase(), subData.nodes);
        setSubData((d) => ({ ...d, nodes: [...d.nodes, { id, label: label.trim(), nodeType: nodeType || "microservice" }] }));
        setModal(null);
      },
    });
  }

  function addLink() {
    if (subSel.type !== "node") { addToast?.("Select a component first.", "warning"); return; }
    const from = subSel.id;
    setModal({
      title: `Link from "${from}"`,
      fields: [
        { name: "target",   label: "Target component", defaultValue: subData.nodes.filter((n) => n.id !== from)[0]?.id || "", options: subData.nodes.filter((n) => n.id !== from).map((n) => n.id) },
        { name: "directed", label: "Directed?", defaultValue: "yes", options: ["yes", "no"] },
      ],
      onSubmit: ({ target, directed }) => {
        if (!target.trim()) return setModal(null);
        if (!subData.nodes.find((n) => n.id === target.trim())) { addToast?.("Component not found.", "error"); return setModal(null); }
        if (subData.links.some((l) => l.source === from && l.target === target.trim())) { addToast?.("Link already exists.", "warning"); return setModal(null); }
        setSubData((d) => ({ ...d, links: [...d.links, { source: from, target: target.trim(), directed: directed === "yes" }] }));
        setModal(null);
      },
    });
  }

  function deleteSelected() {
    if (!subSel.type) return;
    if (subSel.type === "node") {
      const id = subSel.id;
      setSubData((d) => ({
        nodes: d.nodes.filter((n) => n.id !== id),
        links: d.links.filter((l) => l.source !== id && l.target !== id),
      }));
    }
    setSubSel({ type: null, id: null });
  }

  const subCount = subData.nodes.length;

  return (
    <div style={{
      position: "absolute",
      right: 0,
      top: 0,
      bottom: 0,
      width: 380,
      background: DS.bgPanel,
      backdropFilter: "blur(12px)",
      borderLeft: `1px solid ${DS.border}`,
      borderRadius: "16px 0 0 16px",
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), -12px 0 48px rgba(0,0,0,0.6)`,
      display: "flex",
      flexDirection: "column",
      zIndex: 400,
      animation: "slide-in-right 250ms ease-out both",
    }}>

      {/* Left accent line */}
      <div style={{ position: "absolute", left: 0, top: 16, bottom: 16, width: 2, borderRadius: 1, background: typeColor, opacity: 0.6 }} />

      {/* Header */}
      <div style={{
        padding: "14px 18px 12px",
        borderBottom: `1px solid ${DS.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexShrink: 0,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: typeColor, flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: DS.textPrimary, fontFamily: DISPLAY }}>
              {node.label}
            </span>
            <span style={{
              fontSize: 10,
              color: typeColor,
              background: `${typeColor}22`,
              border: `1px solid ${typeColor}44`,
              borderRadius: 6,
              padding: "2px 8px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontFamily: MONO,
              fontWeight: 600,
            }}>
              {NODE_TYPE_LABELS[node.nodeType] || node.nodeType}
            </span>
          </div>
          <div style={{ fontSize: 10, color: DS.textMuted, letterSpacing: "0.04em", fontFamily: DISPLAY, fontWeight: 500 }}>
            Sub-architecture · {subCount} component{subCount !== 1 ? "s" : ""}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: `1px solid ${DS.border}`,
            borderRadius: 8,
            color: DS.textSecond,
            cursor: "pointer",
            padding: "4px 10px",
            fontSize: 12,
            fontFamily: DISPLAY,
            fontWeight: 500,
            transition: "all 0.15s ease",
          }}
        >
          ✕
        </button>
      </div>

      {/* Controls */}
      <div style={{
        padding: "10px 14px",
        borderBottom: `1px solid ${DS.border}`,
        display: "flex",
        gap: 6,
        flexShrink: 0,
      }}>
        <button onClick={addComponent} style={{ ...styles.btn, flex: 1 }}>+ COMPONENT</button>
        <button
          onClick={addLink}
          disabled={subSel.type !== "node"}
          style={{ ...styles.btn, flex: 1, opacity: subSel.type === "node" ? 1 : 0.4 }}
        >
          + LINK
        </button>
        <button
          onClick={deleteSelected}
          disabled={!subSel.type}
          style={{ ...styles.ghostBtn, flex: 1, opacity: subSel.type ? 1 : 0.4 }}
        >
          DELETE
        </button>
      </div>

      {/* Mini canvas */}
      <div style={{
        flex: 1,
        position: "relative",
        overflow: "hidden",
        background: DS.bg,
        backgroundImage: "radial-gradient(rgba(148,163,184,0.08) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}>
        <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />
        {subCount === 0 && (
          <div style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            pointerEvents: "none",
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={typeColor} strokeWidth="1" opacity="0.3">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="4" />
              <line x1="12" y1="2"  x2="12" y2="8"  />
              <line x1="12" y1="16" x2="12" y2="22" />
              <line x1="2"  y1="12" x2="8"  y2="12" />
              <line x1="16" y1="12" x2="22" y2="12" />
            </svg>
            <span style={{ fontSize: 12, color: DS.textMuted, fontFamily: DISPLAY, fontWeight: 600, letterSpacing: "0.02em" }}>
              No components yet
            </span>
            <span style={{ fontSize: 11, color: DS.textMuted, opacity: 0.6, fontFamily: DISPLAY }}>
              Click + Component to model internals
            </span>
          </div>
        )}
      </div>

      {/* Component list */}
      {subCount > 0 && (
        <div style={{
          borderTop: `1px solid ${DS.border}`,
          padding: "8px 14px",
          maxHeight: 110,
          overflowY: "auto",
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 11, color: DS.textMuted, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 6, fontFamily: DISPLAY, fontWeight: 600 }}>
            Components
          </div>
          {subData.nodes.map((n) => (
            <div
              key={n.id}
              onClick={() => setSubSel({ type: "node", id: n.id })}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 6px",
                borderRadius: 8,
                cursor: "pointer",
                background: subSel.id === n.id ? DS.accentDim : "transparent",
                borderLeft: subSel.id === n.id ? `2px solid ${DS.accent}` : "2px solid transparent",
                marginBottom: 2,
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: NODE_TYPE_COLORS[n.nodeType] || DS.accent, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: DS.textPrimary, fontFamily: DISPLAY, fontWeight: 500, flex: 1 }}>{n.label}</span>
              <span style={{ fontSize: 10, color: DS.textMuted, fontFamily: MONO }}>{n.id}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{
        padding: "12px 14px",
        borderTop: `1px solid ${DS.border}`,
        display: "flex",
        gap: 8,
        flexShrink: 0,
      }}>
        <button onClick={() => { onUpdate(subData); onClose(); }} style={{ ...styles.btn, flex: 1 }}>
          SAVE &amp; CLOSE
        </button>
        <button onClick={onClose} style={{ ...styles.ghostBtn, flex: 1 }}>
          DISCARD
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