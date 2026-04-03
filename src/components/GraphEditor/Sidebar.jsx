// src/components/GraphEditor/Sidebar.jsx
// Midnight Flow — n8n-inspired sidebar

import { useState } from "react";
import { DS, DISPLAY, MONO, NODE_TYPE_COLORS, NODE_TYPE_LABELS, NODE_TYPES } from "./styles";
import { useGraphEditor } from "./GraphEditorContext";

// ── Primitives ────────────────────────────────────────────────────────────────

function SbLabel({ children }) {
  return (
    <div style={{
      fontSize: 11,
      color: DS.textMuted,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      fontFamily: DISPLAY,
      fontWeight: 600,
      marginBottom: 7,
    }}>
      {children}
    </div>
  );
}

function SbInput({ value, onChange, placeholder, style, inputRef }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      ref={inputRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        display: "block",
        width: "100%",
        padding: "8px 11px",
        borderRadius: 8,
        border: `1px solid ${focused ? DS.accent + "55" : DS.border}`,
        background: DS.bgInput,
        color: DS.textPrimary,
        fontSize: 12,
        fontFamily: DISPLAY,
        boxSizing: "border-box",
        outline: "none",
        transition: "border-color 0.15s, box-shadow 0.15s",
        boxShadow: focused ? `0 0 0 3px ${DS.accent}12` : "none",
        ...style,
      }}
    />
  );
}

function SbSelect({ value, onChange, children, style }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        display: "block",
        width: "100%",
        padding: "8px 28px 8px 11px",
        borderRadius: 8,
        border: `1px solid ${DS.border}`,
        background: DS.bgInput,
        color: DS.textPrimary,
        fontSize: 12,
        fontFamily: DISPLAY,
        cursor: "pointer",
        boxSizing: "border-box",
        appearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%237b7f9e'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
        outline: "none",
        ...style,
      }}
    >
      {children}
    </select>
  );
}

function SbButton({ onClick, disabled, variant = "accent", children, style, title }) {
  const [hov, setHov] = useState(false);
  const active = hov && !disabled;

  const v = {
    accent: {
      color: active ? DS.textPrimary : DS.accent,
      background: active ? `${DS.accent}18` : DS.accentDim,
      borderColor: active ? `${DS.accent}66` : `${DS.accent}33`,
      boxShadow: active ? `0 0 12px ${DS.accent}15` : "none",
    },
    danger: {
      color: active ? DS.textPrimary : DS.danger,
      background: active ? `${DS.danger}18` : DS.dangerDim,
      borderColor: active ? `${DS.danger}66` : `${DS.danger}33`,
      boxShadow: active ? `0 0 12px ${DS.danger}15` : "none",
    },
    ghost: {
      color: active ? DS.textPrimary : DS.textSecond,
      background: active ? "rgba(255,255,255,0.04)" : "transparent",
      borderColor: DS.border,
      boxShadow: "none",
    },
    warning: {
      color: active ? DS.textPrimary : DS.warning,
      background: active ? `${DS.warning}18` : DS.warningDim,
      borderColor: active ? `${DS.warning}66` : `${DS.warning}33`,
      boxShadow: active ? `0 0 12px ${DS.warning}15` : "none",
    },
  }[variant] || {};

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "block",
        width: "100%",
        padding: "8px 11px",
        border: "1px solid",
        borderRadius: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 11,
        fontFamily: DISPLAY,
        fontWeight: 600,
        textAlign: "left",
        boxSizing: "border-box",
        transition: "all 0.15s ease",
        opacity: disabled ? 0.35 : 1,
        ...v,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function SbDivider() {
  return <div style={{ height: 1, background: DS.border, margin: "10px 0" }} />;
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({ title, children, defaultOpen = true, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: `1px solid ${DS.border}` }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          padding: "10px 16px",
          background: open ? "rgba(255,255,255,0.015)" : "transparent",
          border: "none",
          cursor: "pointer",
          gap: 8,
          transition: "background 0.15s",
        }}
      >
        <svg
          width="8" height="8" viewBox="0 0 8 8" fill="none"
          style={{
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            flexShrink: 0,
          }}
        >
          <path d="M2 1l3.5 3-3.5 3" stroke={open ? DS.accent : DS.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>

        <span style={{
          fontFamily: DISPLAY,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.02em",
          color: open ? DS.textPrimary : DS.textSecond,
          flex: 1,
          textAlign: "left",
          transition: "color 0.15s",
        }}>
          {title}
        </span>

        {badge != null && (
          <span style={{
            fontSize: 10,
            color: DS.accent,
            background: DS.accentDim,
            border: `1px solid ${DS.accent}33`,
            borderRadius: 6,
            padding: "1px 7px",
            fontFamily: DISPLAY,
            fontWeight: 700,
          }}>
            {badge}
          </span>
        )}
      </button>

      <div style={{
        overflow: "hidden",
        maxHeight: open ? "9999px" : 0,
        transition: "max-height 200ms ease",
      }}>
        <div style={{ padding: "2px 16px 14px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Stat row ─────────────────────────────────────────────────────────────────

function StatRow({ label, value, accent, last }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "5px 0",
      borderBottom: last ? "none" : `1px solid ${DS.border}`,
    }}>
      <span style={{ fontSize: 11, color: DS.textMuted, fontFamily: DISPLAY }}>{label}</span>
      <span style={{
        fontSize: 11,
        color: accent ? DS.accent : DS.textPrimary,
        fontFamily: MONO,
        fontWeight: 600,
      }}>
        {String(value)}
      </span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const {
    search, setSearch, searchRef,
    filter, setFilter,
    layoutType, setLayoutType,
    hierDirection, setHierDirection,
    pinMode, togglePinMode,
    historyCtrl,
    graphStats, data, selected,
    openAddNodeModal, openAddLinkModal,
    openEditNodeModal, openEditLinkModal,
    openDeleteSelectedModal,
    openDrilldown, selectedNodeHasSubGraph,
    runBFS, runDFS, runTopologicalSort, runMST, runCycleDetection,
    openShortestPathModal,
    algorithmResult, clearAlgorithmResult,
    runDegreeCentrality, runPageRank,
    clearAnalysis, analysisActive,
    failureMode, toggleFailureMode,
    failedCount, affectedCount, resetFailure,
    versions, saveVersions,
    openSaveVersionModal, openLoadVersionModal, openDeleteVersionModal,
    updateData,
    handleExport, fileInputRef,
  } = useGraphEditor();

  const selectedNode = selected.type === "node" ? data.nodes.find((n) => n.id === selected.id) : null;
  const selectedLink = selected.type === "link"
    ? data.links.find((l) =>
        (l.source === selected.id?.source && l.target === selected.id?.target) ||
        (l.source === selected.id?.target && l.target === selected.id?.source)
      )
    : null;

  const versionKeys = Object.keys(versions);

  function loadVersion(key) {
    const v = versions[key];
    if (!v) return;
    updateData({ nodes: v.nodes, links: v.links });
  }

  function deleteVersionDirect(key) {
    if (!window.confirm(`Delete version "${key}"?`)) return;
    const next = { ...versions };
    delete next[key];
    saveVersions(next);
  }

  function algoResultMeta() {
    if (!algorithmResult) return null;
    const r = algorithmResult;
    if (r.type === "bfs")         return { title: `BFS from "${r.startId}"`, desc: "Visits all reachable nodes level-by-level.", summary: `${r.order.length} visited${r.unreachable ? `, ${r.unreachable} unreachable` : ""}`, color: DS.accent };
    if (r.type === "dfs")         return { title: `DFS from "${r.startId}"`, desc: "Explores each branch as deep as possible before backtracking.", summary: `${r.order.length} visited${r.unreachable ? `, ${r.unreachable} unreachable` : ""}`, color: DS.accent };
    if (r.type === "topological") return { title: "Topological Order", desc: "Valid execution order for all dependencies.", summary: `${r.order.length} nodes ordered`, color: DS.gold };
    if (r.type === "mst")         return { title: "Minimum Spanning Tree", desc: "Cheapest edges connecting all nodes without cycles.", summary: `${r.edges.length} edges · weight ${r.totalWeight}`, color: DS.accent };
    if (r.type === "cycles")      return { title: "Cycle Detection", desc: r.hasCycles ? "Directed cycles found — not a DAG." : "No cycles — valid DAG.", summary: r.label, color: r.hasCycles ? DS.danger : DS.success };
    return null;
  }

  return (
    <div style={{
      width: 300,
      height: "100%",
      background: DS.bgPanel,
      borderRight: `1px solid ${DS.border}`,
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      overflow: "hidden",
    }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{
        padding: "18px 16px 14px",
        borderBottom: `1px solid ${DS.border}`,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36,
            borderRadius: 10,
            background: DS.accentDim,
            border: `1px solid ${DS.accent}33`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={DS.accent} strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="4" r="2.2"/>
              <circle cx="4"  cy="20" r="2.2"/>
              <circle cx="20" cy="20" r="2.2"/>
              <line x1="12" y1="6.2" x2="5.8" y2="18.2"/>
              <line x1="12" y1="6.2" x2="18.2" y2="18.2"/>
              <line x1="6.2" y1="20" x2="17.8" y2="20"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: DISPLAY,
              fontSize: 16,
              fontWeight: 700,
              color: DS.textPrimary,
              lineHeight: 1.2,
            }}>
              Graph Editor
            </div>
            <div style={{
              fontFamily: DISPLAY,
              fontSize: 11,
              color: DS.textMuted,
              marginTop: 2,
            }}>
              Network Topology
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{
              width: 6, height: 6,
              borderRadius: "50%",
              background: DS.accent,
              animation: "pulse-live 2.5s ease-in-out infinite",
            }} />
            <span style={{ fontSize: 10, color: DS.accent, fontFamily: MONO, fontWeight: 600 }}>LIVE</span>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{
          marginTop: 14, paddingTop: 10,
          borderTop: `1px solid ${DS.border}`,
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <MiniStat value={graphStats.nodes} label="nodes" />
          <div style={{ width: 1, height: 12, background: DS.border }} />
          <MiniStat value={graphStats.links} label="links" />
          <div style={{ width: 1, height: 12, background: DS.border }} />
          <MiniStat value={graphStats.density} label="density" />
        </div>
      </div>

      {/* ── Scrollable body ────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>

        <Section title="Search" defaultOpen={true}>
          <SbInput inputRef={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Node label, ID or A — B for a link" />
        </Section>

        <Section title="Filter" defaultOpen={false}>
          <SbLabel>Comma-separated node IDs</SbLabel>
          <div style={{ position: "relative" }}>
            <SbInput value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="api1, api2, postgres" />
            {filter && (
              <button onClick={() => setFilter("")} style={{
                position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                background: DS.accentDim, border: `1px solid ${DS.accent}33`, borderRadius: 6,
                color: DS.accent, fontSize: 10, fontFamily: DISPLAY, fontWeight: 600,
                cursor: "pointer", padding: "2px 8px",
              }}>Clear</button>
            )}
          </div>
        </Section>

        <Section title="Layout" defaultOpen={true}>
          <SbSelect value={layoutType} onChange={(e) => setLayoutType(e.target.value)}>
            <option value="NORMAL">Force-directed</option>
            <option value="HIERARCHICAL">Hierarchical</option>
            <option value="CIRCULAR">Circular</option>
          </SbSelect>
          {layoutType === "HIERARCHICAL" && (
            <div style={{ marginTop: 8 }}>
              <SbLabel>Direction</SbLabel>
              <SbSelect value={hierDirection} onChange={(e) => setHierDirection(e.target.value)}>
                <option value="TB">Top → Bottom</option>
                <option value="LR">Left → Right</option>
              </SbSelect>
            </div>
          )}
          {layoutType === "NORMAL" && (
            <div style={{ marginTop: 8 }}>
              <SbButton onClick={togglePinMode} variant={pinMode ? "warning" : "ghost"}>
                {pinMode ? "Pinned — click to release" : "Pin Layout"}
              </SbButton>
              {pinMode && (
                <div style={{ marginTop: 6, fontSize: 11, color: DS.warning, fontFamily: DISPLAY, lineHeight: 1.5, padding: "6px 10px", background: DS.warningDim, border: `1px solid ${DS.warning}22`, borderRadius: 8 }}>
                  Nodes are fixed. Drag to reposition.
                </div>
              )}
            </div>
          )}
        </Section>

        <Section title="Statistics" defaultOpen={true}>
          <div style={{ background: DS.bgCard, border: `1px solid ${DS.border}`, borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "6px 10px" }}>
              <StatRow label="Nodes" value={graphStats.nodes} />
              <StatRow label="Links" value={graphStats.links} />
              <StatRow label="Density" value={graphStats.density} last />
            </div>
            <div style={{ height: 1, background: DS.border }} />
            <div style={{ padding: "6px 10px" }}>
              <StatRow label="Connected" value={graphStats.connected ? "YES" : "NO"} accent={graphStats.connected} />
              <StatRow label="Has Cycles" value={graphStats.hasCycles ? "YES" : "NO"} accent={!graphStats.hasCycles} last />
            </div>
          </div>
        </Section>

        <Section title="Actions" defaultOpen={true}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
            <SbButton onClick={openAddNodeModal}>+ Node</SbButton>
            <SbButton onClick={openAddLinkModal} disabled={selected.type !== "node"}>+ Link</SbButton>
            <SbButton onClick={openEditNodeModal} disabled={selected.type !== "node"} variant="ghost">Edit Node</SbButton>
            <SbButton onClick={openEditLinkModal} disabled={selected.type !== "link"} variant="ghost">Edit Link</SbButton>
          </div>
          <div style={{ marginTop: 5 }}>
            <SbButton onClick={openDeleteSelectedModal} disabled={!selected.type} variant="danger">Delete Selected</SbButton>
          </div>
          <div style={{ marginTop: 5 }}>
            <SbButton onClick={openDrilldown} disabled={selected.type !== "node"} variant="ghost"
              style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ flex: 1 }}>Drill Down</span>
              {selectedNodeHasSubGraph && (
                <span style={{ fontSize: 9, color: DS.accent, background: DS.accentDim, border: `1px solid ${DS.accent}33`, borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>DATA</span>
              )}
            </SbButton>
          </div>
        </Section>

        {(selectedNode || selectedLink) && (
          <Section title="Selection" defaultOpen={true}>
            {selectedNode && (
              <div style={{
                background: DS.bgCard, border: `1px solid ${DS.border}`,
                borderLeft: `3px solid ${NODE_TYPE_COLORS[selectedNode.nodeType] || DS.accent}`,
                borderRadius: 10, padding: "10px 12px",
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: DS.textPrimary, fontFamily: DISPLAY, marginBottom: 6 }}>
                  {selectedNode.label}
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, fontFamily: MONO, color: NODE_TYPE_COLORS[selectedNode.nodeType], background: `${NODE_TYPE_COLORS[selectedNode.nodeType]}15`, border: `1px solid ${NODE_TYPE_COLORS[selectedNode.nodeType]}33`, borderRadius: 6, padding: "2px 8px", marginBottom: 8 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: NODE_TYPE_COLORS[selectedNode.nodeType] }} />
                  {NODE_TYPE_LABELS[selectedNode.nodeType] || selectedNode.nodeType}
                </div>
                <StatRow label="ID" value={selectedNode.id} />
                <StatRow label="Components" value={selectedNode.subGraph?.nodes?.length ?? 0} last />
              </div>
            )}
            {selectedLink && (
              <div style={{ background: DS.bgCard, border: `1px solid ${DS.border}`, borderLeft: `3px solid ${DS.accent}`, borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 12, fontFamily: MONO, fontWeight: 600, color: DS.textPrimary, marginBottom: 6 }}>
                  {selectedLink.source} → {selectedLink.target}
                </div>
                <StatRow label="Weight" value={selectedLink.weight ?? "—"} />
                <StatRow label="Directed" value={selectedLink.directed ? "YES" : "NO"} last />
              </div>
            )}
          </Section>
        )}

        <Section title="History" defaultOpen={false}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
            <SbButton onClick={historyCtrl.undo} disabled={!historyCtrl.canUndo} variant="ghost">↩ Undo</SbButton>
            <SbButton onClick={historyCtrl.redo} disabled={!historyCtrl.canRedo} variant="ghost">↪ Redo</SbButton>
          </div>
        </Section>

        <Section title="Failure Simulation" defaultOpen={true} badge={failureMode ? "ACTIVE" : undefined}>
          {!failureMode ? (
            <SbButton onClick={toggleFailureMode} variant="danger">Enter Failure Mode</SbButton>
          ) : (
            <>
              <div style={{ background: DS.dangerDim, border: `1px solid ${DS.danger}33`, borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: DS.danger, fontFamily: DISPLAY, fontWeight: 700, marginBottom: 4 }}>Failure Mode Active</div>
                <div style={{ fontSize: 11, color: DS.textMuted, fontFamily: DISPLAY }}>Click nodes on canvas to toggle failed state.</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <CountCard count={failedCount} label="Failed" color={DS.danger} />
                <CountCard count={affectedCount} label="Affected" color={DS.warning} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                <SbButton onClick={resetFailure} variant="ghost">Reset All</SbButton>
                <SbButton onClick={toggleFailureMode} variant="danger">Exit Mode</SbButton>
              </div>
            </>
          )}
        </Section>

        <Section title="Algorithms" defaultOpen={true}>
          {selected.type !== "node" && (
            <div style={{ fontSize: 11, color: DS.textMuted, fontFamily: DISPLAY, marginBottom: 8, padding: "8px 10px", background: DS.bgCard, border: `1px solid ${DS.border}`, borderRadius: 8 }}>
              Select a node to run BFS / DFS.
            </div>
          )}
          {selected.type === "node" && (
            <div style={{ fontSize: 11, color: DS.textMuted, fontFamily: DISPLAY, marginBottom: 8 }}>
              Start: <span style={{ color: DS.accent, fontWeight: 600 }}>{selected.id}</span>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <SbButton onClick={runBFS} disabled={selected.type !== "node"} title="Breadth-first search">BFS — Breadth-first</SbButton>
            <SbButton onClick={runDFS} disabled={selected.type !== "node"} title="Depth-first search">DFS — Depth-first</SbButton>
            <SbButton onClick={runTopologicalSort} title="Topological sort">Topological Sort</SbButton>
            <SbButton onClick={runMST} title="Minimum Spanning Tree">MST — Min Spanning Tree</SbButton>
            <SbButton onClick={runCycleDetection} title="Cycle detection">Cycle Detection</SbButton>
            <SbButton onClick={openShortestPathModal} variant="warning" title="Dijkstra's shortest path">Dijkstra — Shortest Path</SbButton>
          </div>
          {algorithmResult && (() => {
            const meta = algoResultMeta();
            if (!meta) return null;
            return (
              <div style={{ marginTop: 10 }}>
                <div style={{ background: DS.bgCard, border: `1px solid ${DS.border}`, borderTop: `2px solid ${meta.color}`, borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ padding: "8px 10px", borderBottom: `1px solid ${DS.border}` }}>
                    <div style={{ fontSize: 11, color: meta.color, fontFamily: DISPLAY, fontWeight: 700, marginBottom: 2 }}>{meta.title}</div>
                    <div style={{ fontSize: 11, color: DS.textMuted, fontFamily: DISPLAY, lineHeight: 1.5 }}>{meta.desc}</div>
                  </div>
                  <div style={{ padding: "6px 10px" }}>
                    <div style={{ fontSize: 12, color: DS.textPrimary, fontFamily: MONO, fontWeight: 600 }}>{meta.summary}</div>
                    {algorithmResult.order?.length > 0 && (
                      <div style={{ marginTop: 6 }}>
                        <div style={{ fontSize: 10, color: DS.textMuted, fontFamily: DISPLAY, fontWeight: 600, marginBottom: 3 }}>ORDER</div>
                        <div style={{ fontSize: 10, color: DS.textSecond, fontFamily: MONO, lineHeight: 1.8, wordBreak: "break-word" }}>
                          {algorithmResult.order.map((id, i) => (
                            <span key={id}>
                              <span style={{ color: meta.color, fontSize: 9 }}>#{i + 1}</span>{" "}{id}
                              {i < algorithmResult.order.length - 1 && <span style={{ color: DS.textMuted }}> → </span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ marginTop: 5 }}>
                  <SbButton onClick={clearAlgorithmResult} variant="ghost">Clear Result</SbButton>
                </div>
              </div>
            );
          })()}
        </Section>

        <Section title="Analysis" defaultOpen={false}>
          <SbLabel>Color-gradient overlays</SbLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <SbButton onClick={runDegreeCentrality}>Degree Centrality</SbButton>
            <SbButton onClick={runPageRank}>PageRank</SbButton>
          </div>
          {analysisActive && (
            <div style={{ marginTop: 8 }}>
              <SbButton onClick={clearAnalysis} variant="ghost">Clear Analysis</SbButton>
            </div>
          )}
        </Section>

        <Section title="Legend" defaultOpen={false}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {NODE_TYPES.map((t) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: NODE_TYPE_COLORS[t], flexShrink: 0,
                  boxShadow: `0 0 6px ${NODE_TYPE_COLORS[t]}66`,
                }} />
                <span style={{ fontSize: 12, color: DS.textSecond, fontFamily: DISPLAY }}>{NODE_TYPE_LABELS[t]}</span>
              </div>
            ))}
          </div>
          <SbDivider />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", border: `1.5px dashed ${DS.accent}`, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: DS.textMuted, fontFamily: DISPLAY }}>Has sub-architecture</span>
          </div>
        </Section>

        <Section title="Export / Import" defaultOpen={false}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
            <SbButton onClick={handleExport}>Export</SbButton>
            <SbButton onClick={() => fileInputRef.current?.click()} variant="ghost">Import JSON</SbButton>
          </div>
        </Section>

        <Section title="Versions" defaultOpen={false} badge={versionKeys.length > 0 ? versionKeys.length : undefined}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 8 }}>
            <SbButton onClick={openSaveVersionModal}>Save Version</SbButton>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
              <SbButton onClick={openLoadVersionModal} disabled={!versionKeys.length} variant="ghost">Load</SbButton>
              <SbButton onClick={openDeleteVersionModal} disabled={!versionKeys.length} variant="danger">Delete</SbButton>
            </div>
          </div>
          {versionKeys.length > 0 && (
            <>
              <SbDivider />
              <SbLabel>Saved</SbLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {versionKeys.map((key) => {
                  const v = versions[key];
                  const date = v.savedAt ? new Date(v.savedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
                  return <VersionCard key={key} name={key} date={date} onLoad={() => loadVersion(key)} onDelete={() => deleteVersionDirect(key)} />;
                })}
              </div>
            </>
          )}
        </Section>

      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MiniStat({ value, label }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
      <span style={{ fontSize: 13, color: DS.textPrimary, fontFamily: MONO, fontWeight: 700 }}>{value}</span>
      <span style={{ fontSize: 10, color: DS.textMuted, fontFamily: DISPLAY }}>{label}</span>
    </div>
  );
}

function CountCard({ count, label, color }) {
  return (
    <div style={{
      background: DS.bgCard, border: `1px solid ${color}22`,
      borderRadius: 10, padding: "8px 10px", textAlign: "center",
    }}>
      <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: MONO, lineHeight: 1 }}>{count}</div>
      <div style={{ fontSize: 10, color: DS.textMuted, fontFamily: DISPLAY, fontWeight: 600, marginTop: 4, textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

function VersionCard({ name, date, onLoad, onDelete }) {
  const [hovL, setHovL] = useState(false);
  const [hovD, setHovD] = useState(false);
  return (
    <div style={{
      background: DS.bgCard, border: `1px solid ${DS.border}`, borderRadius: 8,
      padding: "7px 10px", display: "flex", alignItems: "center", gap: 8,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: DS.textPrimary, fontFamily: DISPLAY, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
        <div style={{ fontSize: 10, color: DS.textMuted, fontFamily: DISPLAY, marginTop: 2 }}>{date}</div>
      </div>
      <button onClick={onLoad} onMouseEnter={() => setHovL(true)} onMouseLeave={() => setHovL(false)} style={{
        background: hovL ? DS.accentDim : "transparent", border: `1px solid ${DS.accent}33`,
        borderRadius: 6, color: DS.accent, fontSize: 10, fontFamily: DISPLAY, fontWeight: 600,
        cursor: "pointer", padding: "3px 10px", flexShrink: 0, transition: "background 0.1s",
      }}>Load</button>
      <button onClick={onDelete} onMouseEnter={() => setHovD(true)} onMouseLeave={() => setHovD(false)} style={{
        background: hovD ? DS.dangerDim : "transparent", border: `1px solid ${DS.danger}33`,
        borderRadius: 6, color: DS.danger, fontSize: 10, fontFamily: DISPLAY, fontWeight: 600,
        cursor: "pointer", padding: "3px 10px", flexShrink: 0, transition: "background 0.1s",
      }}>✕</button>
    </div>
  );
}
