// src/components/GraphEditor/Sidebar.jsx
// Mission Control sidebar — scrollable single-column with 14 collapsible sections.

import { useState } from "react";
import { DS, MONO, NODE_TYPE_COLORS, NODE_TYPE_LABELS, NODE_TYPES } from "./styles";
import { useGraphEditor } from "./GraphEditorContext";

// ── Reusable primitives ───────────────────────────────────────────────────────

function SbLabel({ children }) {
  return (
    <div style={{
      fontSize: 11,
      color: DS.textMuted,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      fontFamily: MONO,
      marginBottom: 5,
    }}>
      {children}
    </div>
  );
}

function SbInput({ value, onChange, placeholder, style, inputRef }) {
  return (
    <input
      ref={inputRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        display: "block",
        width: "100%",
        padding: "5px 9px",
        borderRadius: 2,
        border: `1px solid ${DS.border}`,
        background: DS.bgInput,
        color: DS.textPrimary,

        fontSize: 12,
        fontFamily: MONO,
        letterSpacing: "0.02em",
        boxSizing: "border-box",
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
        padding: "5px 9px",
        borderRadius: 2,
        border: `1px solid ${DS.border}`,
        background: DS.bgInput,
        color: DS.textPrimary,

        fontSize: 12,
        fontFamily: MONO,
        letterSpacing: "0.02em",
        cursor: "pointer",
        boxSizing: "border-box",
        appearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%2394a3b8'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 9px center",
        paddingRight: 26,
        ...style,
      }}
    >
      {children}
    </select>
  );
}

function SbButton({ onClick, disabled, variant = "accent", children, style, title }) {
  const [hov, setHov] = useState(false);

  const base = {
    display: "block",
    width: "100%",
    padding: "6px 10px",
    borderRadius: 2,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 11,
    fontFamily: MONO,
    fontWeight: 600,
    letterSpacing: "0.07em",
    textAlign: "left",
    boxSizing: "border-box",
    transition: "all 0.12s",
    opacity: disabled ? 0.4 : 1,
    border: "1px solid",
    ...style,
  };

  const variants = {
    accent: {
      color: DS.accent,
      borderColor: hov ? DS.accent : `${DS.accent}55`,
      background: hov ? DS.accentDim : "transparent",
      borderLeft: hov ? `3px solid ${DS.accent}` : `1px solid ${DS.accent}55`,
    },
    danger: {
      color: DS.danger,
      borderColor: hov ? DS.danger : `${DS.danger}55`,
      background: hov ? DS.dangerDim : "transparent",
      borderLeft: hov ? `3px solid ${DS.danger}` : `1px solid ${DS.danger}55`,
    },
    ghost: {
      color: DS.textSecond,
      borderColor: DS.border,
      background: hov ? "rgba(255,255,255,0.04)" : "transparent",
    },
    warning: {
      color: DS.warning,
      borderColor: hov ? DS.warning : `${DS.warning}55`,
      background: hov ? DS.warningDim : "transparent",
      borderLeft: hov ? `3px solid ${DS.warning}` : `1px solid ${DS.warning}55`,
    },
  };

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ ...base, ...variants[variant] }}
    >
      {children}
    </button>
  );
}

function SbDivider() {
  return <div style={{ height: 1, background: DS.border, margin: "8px 0" }} />;
}

// ── Collapsible section ───────────────────────────────────────────────────────

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
          padding: "8px 12px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          gap: 7,
        }}
      >
        <span style={{ color: DS.accent, fontSize: 11, flexShrink: 0 }}>•</span>
        <span style={{
          flex: 1,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: DS.textSecond,
          fontFamily: MONO,
          textAlign: "left",
        }}>
          {title}
        </span>
        {badge != null && (
          <span style={{
            fontSize: 11,
            color: DS.accent,
            background: DS.accentDim,
            border: `1px solid ${DS.accent}44`,
            borderRadius: 2,
            padding: "0 5px",
            fontFamily: MONO,
          }}>
            {badge}
          </span>
        )}
        <svg
          width="8" height="8" viewBox="0 0 8 8" fill="none"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}
        >
          <path d="M1 2l3 4 3-4" stroke={DS.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      </button>

      <div style={{
        overflow: "hidden",
        maxHeight: open ? "9999px" : 0,
        transition: "max-height 200ms ease",
      }}>
        <div style={{ padding: "4px 12px 14px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Stat row ─────────────────────────────────────────────────────────────────

function StatRow({ label, value, accent }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
      <span style={{ fontSize: 12, color: DS.textMuted, fontFamily: MONO }}>{label}</span>
      <span style={{ fontSize: 12, color: accent ? DS.accent : DS.textPrimary, fontFamily: MONO, fontWeight: 600 }}>
        {String(value)}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

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

  // Algorithm result description
  function algoResultMeta() {
    if (!algorithmResult) return null;
    const r = algorithmResult;
    if (r.type === "bfs") return {
      title: `BFS from "${r.startId}"`,
      desc: "Visits all reachable nodes level-by-level (shortest hop-count first).",
      summary: `${r.order.length} visited${r.unreachable ? `, ${r.unreachable} unreachable` : ""}`,
      color: DS.accent,
    };
    if (r.type === "dfs") return {
      title: `DFS from "${r.startId}"`,
      desc: "Explores each branch as deep as possible before backtracking.",
      summary: `${r.order.length} visited${r.unreachable ? `, ${r.unreachable} unreachable` : ""}`,
      color: DS.accent,
    };
    if (r.type === "topological") return {
      title: "Topological Order",
      desc: "Valid execution order — each node appears after all its dependencies.",
      summary: `${r.order.length} nodes ordered`,
      color: DS.gold,
    };
    if (r.type === "mst") return {
      title: "Minimum Spanning Tree",
      desc: "Cheapest set of edges that connects all nodes without cycles.",
      summary: `${r.edges.length} edges · total weight ${r.totalWeight}`,
      color: DS.accent,
    };
    if (r.type === "cycles") return {
      title: "Cycle Detection",
      desc: r.hasCycles
        ? "The graph contains directed cycles — it is not a DAG."
        : "No directed cycles found — the graph is a valid DAG.",
      summary: r.label,
      color: r.hasCycles ? DS.danger : DS.success || "#06d6a0",
    };
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
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
    }}>

      {/* ── Title bar ─────────────────────────────────────────────────── */}
      <div style={{
        padding: "14px 12px 12px",
        borderBottom: `1px solid ${DS.border}`,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={DS.accent} strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="4" r="2"/>
            <circle cx="4" cy="20" r="2"/>
            <circle cx="20" cy="20" r="2"/>
            <line x1="12" y1="6" x2="5.5" y2="18.5"/>
            <line x1="12" y1="6" x2="18.5" y2="18.5"/>
            <line x1="6" y1="20" x2="18" y2="20"/>
          </svg>
          <div>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: DS.textPrimary,
              fontFamily: MONO,
              lineHeight: 1.3,
            }}>
              NETWORK TOPOLOGY
            </div>
            <div style={{
              fontSize: 11,
              letterSpacing: "0.14em",
              color: DS.textMuted,
              fontFamily: MONO,
              textTransform: "uppercase",
            }}>
              EDITOR
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: DS.accent, boxShadow: `0 0 6px ${DS.accent}` }} />
            <span style={{ fontSize: 11, color: DS.accent, fontFamily: MONO, letterSpacing: "0.08em" }}>LIVE</span>
          </div>
        </div>
      </div>

      {/* ── Scrollable body ───────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>

        {/* 1. SEARCH */}
        <Section title="Search" defaultOpen={true}>
          <SbLabel>Node label / ID  ·  or  A - B  for a link</SbLabel>
          <SbInput
            inputRef={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="api server…"
          />
        </Section>

        {/* 2. FILTER */}
        <Section title="Filter" defaultOpen={false}>
          <SbLabel>Comma-separated node IDs</SbLabel>
          <div style={{ position: "relative" }}>
            <SbInput
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="api1, api2, postgres"
            />
            {filter && (
              <button
                onClick={() => setFilter("")}
                style={{
                  position: "absolute",
                  right: 6,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: DS.accentDim,
                  border: `1px solid ${DS.accent}44`,
                  borderRadius: 2,
                  color: DS.accent,
                  fontSize: 11,
                  fontFamily: MONO,
                  cursor: "pointer",
                  padding: "1px 6px",
                  letterSpacing: "0.06em",
                }}
              >
                CLEAR
              </button>
            )}
          </div>
        </Section>

        {/* 3. LAYOUT */}
        <Section title="Layout" defaultOpen={true}>
          <SbLabel>Mode</SbLabel>
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
              <SbButton
                onClick={togglePinMode}
                variant={pinMode ? "warning" : "ghost"}
                title="Pin nodes in place — drag to reposition, they stay where you put them"
              >
                {pinMode ? "⬛ PINNED — CLICK TO RELEASE" : "📌 PIN LAYOUT"}
              </SbButton>
              {pinMode && (
                <div style={{ fontSize: 11, color: DS.warning, fontFamily: MONO, marginTop: 5, lineHeight: 1.5 }}>
                  Nodes are fixed. Drag to reposition.
                </div>
              )}
            </div>
          )}
        </Section>

        {/* 4. GRAPH STATISTICS */}
        <Section title="Statistics" defaultOpen={true}>
          <div style={{
            background: DS.bgCard,
            borderRadius: 2,
            padding: "10px 10px",
            border: `1px solid ${DS.border}`,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
          }}>
            <StatRow label="Nodes"     value={graphStats.nodes} />
            <StatRow label="Links"     value={graphStats.links} />
            <StatRow label="Density"   value={graphStats.density} />
            <SbDivider />
            <StatRow label="Connected" value={graphStats.connected ? "YES" : "NO"} accent={graphStats.connected} />
            <StatRow label="Has Cycles" value={graphStats.hasCycles ? "YES" : "NO"} accent={!graphStats.hasCycles} />
          </div>
        </Section>

        {/* 5. ACTIONS */}
        <Section title="Actions" defaultOpen={true}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
            <SbButton onClick={openAddNodeModal}>+ NODE</SbButton>
            <SbButton onClick={openAddLinkModal} disabled={selected.type !== "node"}>+ LINK</SbButton>
            <SbButton onClick={openEditNodeModal} disabled={selected.type !== "node"} variant="ghost">EDIT NODE</SbButton>
            <SbButton onClick={openEditLinkModal} disabled={selected.type !== "link"} variant="ghost">EDIT LINK</SbButton>
          </div>
          <div style={{ marginTop: 5 }}>
            <SbButton onClick={openDeleteSelectedModal} disabled={!selected.type} variant="danger">
              DELETE SELECTED
            </SbButton>
          </div>
          <div style={{ marginTop: 5 }}>
            <SbButton
              onClick={openDrilldown}
              disabled={selected.type !== "node"}
              variant="ghost"
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              DRILL DOWN
              {selectedNodeHasSubGraph && (
                <span style={{
                  marginLeft: "auto",
                  fontSize: 11,
                  color: DS.accent,
                  background: DS.accentDim,
                  border: `1px solid ${DS.accent}44`,
                  borderRadius: 2,
                  padding: "0 4px",
                }}>
                  HAS DATA
                </span>
              )}
            </SbButton>
          </div>
        </Section>

        {/* 6. SELECTION INFO */}
        {(selectedNode || selectedLink) && (
          <Section title="Selection" defaultOpen={true}>
            {selectedNode && (
              <div style={{
                background: DS.bgCard,
                border: `1px solid ${DS.border}`,
                borderLeft: `3px solid ${NODE_TYPE_COLORS[selectedNode.nodeType] || DS.accent}`,
                borderRadius: 2,
                padding: "8px 10px",
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: DS.textPrimary, fontFamily: MONO, marginBottom: 6 }}>
                  {selectedNode.label}
                </div>
                <StatRow label="ID"         value={selectedNode.id} />
                <StatRow label="Type"       value={NODE_TYPE_LABELS[selectedNode.nodeType] || selectedNode.nodeType} />
                <StatRow label="Components" value={selectedNode.subGraph?.nodes?.length ?? 0} />
              </div>
            )}
            {selectedLink && (
              <div style={{
                background: DS.bgCard,
                border: `1px solid ${DS.border}`,
                borderLeft: `3px solid ${DS.accent}`,
                borderRadius: 2,
                padding: "8px 10px",
              }}>
                <div style={{ fontSize: 11, fontFamily: MONO, color: DS.textPrimary, marginBottom: 6 }}>
                  {selectedLink.source} → {selectedLink.target}
                </div>
                <StatRow label="Weight"   value={selectedLink.weight ?? "—"} />
                <StatRow label="Directed" value={selectedLink.directed ? "YES" : "NO"} />
              </div>
            )}
          </Section>
        )}

        {/* 7. UNDO / REDO */}
        <Section title="History" defaultOpen={false}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
            <SbButton onClick={historyCtrl.undo} disabled={!historyCtrl.canUndo} variant="ghost">
              ↩ UNDO
            </SbButton>
            <SbButton onClick={historyCtrl.redo} disabled={!historyCtrl.canRedo} variant="ghost">
              ↪ REDO
            </SbButton>
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: DS.textMuted, fontFamily: MONO, textAlign: "center" }}>
            10-step history cap
          </div>
        </Section>

        {/* 8. FAILURE SIMULATION */}
        <Section title="Failure Simulation" defaultOpen={true} badge={failureMode ? "ACTIVE" : undefined}>
          {!failureMode ? (
            <SbButton onClick={toggleFailureMode} variant="danger">
              ENTER FAILURE MODE
            </SbButton>
          ) : (
            <>
              <div style={{
                background: DS.dangerDim,
                border: `1px solid ${DS.danger}44`,
                borderRadius: 2,
                padding: "8px 10px",
                marginBottom: 8,
              }}>
                <div style={{ fontSize: 11, color: DS.danger, fontFamily: MONO, letterSpacing: "0.08em", marginBottom: 6, fontWeight: 700 }}>
                  ⚠ FAILURE MODE ACTIVE
                </div>
                <div style={{ fontSize: 11, color: DS.textMuted, fontFamily: MONO }}>
                  Click nodes on canvas to toggle FAILED state.
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1, background: DS.bgCard, border: `1px solid ${DS.danger}44`, borderRadius: 2, padding: "6px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: DS.danger, fontFamily: MONO }}>{failedCount}</div>
                  <div style={{ fontSize: 11, color: DS.textMuted, fontFamily: MONO, letterSpacing: "0.06em" }}>FAILED</div>
                </div>
                <div style={{ flex: 1, background: DS.bgCard, border: `1px solid ${DS.warning}44`, borderRadius: 2, padding: "6px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: DS.warning, fontFamily: MONO }}>{affectedCount}</div>
                  <div style={{ fontSize: 11, color: DS.textMuted, fontFamily: MONO, letterSpacing: "0.06em" }}>AFFECTED</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                <SbButton onClick={resetFailure} variant="ghost">RESET ALL</SbButton>
                <SbButton onClick={toggleFailureMode} variant="danger">EXIT MODE</SbButton>
              </div>
            </>
          )}
        </Section>

        {/* 9. GRAPH ALGORITHMS */}
        <Section title="Algorithms" defaultOpen={true}>
          <div style={{ fontSize: 11, color: DS.textMuted, fontFamily: MONO, marginBottom: 4, lineHeight: 1.5 }}>
            {selected.type !== "node" ? "Select a node first to run BFS / DFS." : `Start node: ${selected.id}`}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <SbButton
              onClick={runBFS}
              disabled={selected.type !== "node"}
              title="Breadth-first search — visits nodes layer by layer from the selected node. Shows shortest hop-count distance."
            >
              BFS — Breadth-first search
            </SbButton>
            <SbButton
              onClick={runDFS}
              disabled={selected.type !== "node"}
              title="Depth-first search — explores each branch fully before backtracking. Useful for reachability."
            >
              DFS — Depth-first search
            </SbButton>
            <SbButton
              onClick={runTopologicalSort}
              title="Topological sort (Kahn's algorithm) — orders nodes so every dependency comes before its dependents. Requires a DAG (no cycles)."
            >
              TOPO — Topological sort
            </SbButton>
            <SbButton
              onClick={runMST}
              title="Minimum Spanning Tree (Kruskal) — finds the cheapest set of edges that connects all nodes. Links must have weights."
            >
              MST — Min spanning tree
            </SbButton>
            <SbButton
              onClick={runCycleDetection}
              title="Cycle detection — checks if the graph contains any directed cycles. A graph with no cycles is called a DAG."
            >
              CYCLES — Detect cycles
            </SbButton>
            <SbButton
              onClick={openShortestPathModal}
              variant="warning"
              title="Dijkstra's algorithm — finds the shortest weighted path between two nodes. All links must have numeric weights."
            >
              DIJKSTRA — Shortest path
            </SbButton>
          </div>

          {algorithmResult && (() => {
            const meta = algoResultMeta();
            if (!meta) return null;
            return (
              <>
                <SbDivider />
                <div style={{
                  background: DS.bgCard,
                  border: `1px solid ${DS.border}`,
                  borderLeft: `3px solid ${meta.color}`,
                  borderRadius: 2,
                  padding: "8px 10px",
                }}>
                  <div style={{ fontSize: 11, color: meta.color, fontFamily: MONO, letterSpacing: "0.06em", fontWeight: 700, marginBottom: 3 }}>
                    {meta.title}
                  </div>
                  <div style={{ fontSize: 11, color: DS.textMuted, fontFamily: MONO, lineHeight: 1.5, marginBottom: 5 }}>
                    {meta.desc}
                  </div>
                  <div style={{ fontSize: 12, color: DS.textPrimary, fontFamily: MONO, fontWeight: 600 }}>
                    {meta.summary}
                  </div>
                  {algorithmResult.order && algorithmResult.order.length > 0 && (
                    <>
                      <div style={{ fontSize: 11, color: DS.textMuted, fontFamily: MONO, marginTop: 6, marginBottom: 2, letterSpacing: "0.06em" }}>
                        ORDER
                      </div>
                      <div style={{ fontSize: 11, color: DS.textSecond, fontFamily: MONO, lineHeight: 1.7 }}>
                        {algorithmResult.order.map((id, i) => (
                          <span key={id}>
                            <span style={{ color: meta.color, fontSize: 10 }}>#{i + 1}</span>
                            {" "}{id}
                            {i < algorithmResult.order.length - 1 && (
                              <span style={{ color: DS.textMuted }}> → </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <div style={{ marginTop: 5 }}>
                  <SbButton onClick={clearAlgorithmResult} variant="ghost">CLEAR RESULT</SbButton>
                </div>
              </>
            );
          })()}
        </Section>

        {/* 10. ANALYSIS */}
        <Section title="Analysis" defaultOpen={false}>
          <SbLabel>Color-gradient overlays</SbLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <SbButton onClick={runDegreeCentrality}>
              DEGREE CENTRALITY
            </SbButton>
            <SbButton onClick={runPageRank}>
              PAGERANK
            </SbButton>
          </div>
          {analysisActive && (
            <div style={{ marginTop: 8 }}>
              <SbButton onClick={clearAnalysis} variant="ghost">CLEAR ANALYSIS</SbButton>
            </div>
          )}
        </Section>

        {/* 11. LEGEND */}
        <Section title="Legend" defaultOpen={false}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {NODE_TYPES.map((t) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: NODE_TYPE_COLORS[t],
                  flexShrink: 0,
                  boxShadow: `0 0 4px ${NODE_TYPE_COLORS[t]}77`,
                }} />
                <span style={{ fontSize: 12, color: DS.textSecond, fontFamily: MONO }}>
                  {NODE_TYPE_LABELS[t]}
                </span>
              </div>
            ))}
          </div>
          <SbDivider />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              border: `1.5px dashed ${DS.accent}`,
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 12, color: DS.textMuted, fontFamily: MONO }}>Has sub-architecture</span>
          </div>
        </Section>

        {/* 12. EXPORT / IMPORT */}
        <Section title="Export / Import" defaultOpen={false}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
            <SbButton onClick={handleExport}>EXPORT</SbButton>
            <SbButton onClick={() => fileInputRef.current?.click()} variant="ghost">
              IMPORT JSON
            </SbButton>
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: DS.textMuted, fontFamily: MONO, lineHeight: 1.5 }}>
            Export as JSON topology or PNG canvas capture.
            Import replaces the current graph.
          </div>
        </Section>

        {/* 13. VERSIONS */}
        <Section title="Versions" defaultOpen={false} badge={versionKeys.length > 0 ? versionKeys.length : undefined}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 8 }}>
            <SbButton onClick={openSaveVersionModal}>SAVE VERSION</SbButton>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
              <SbButton onClick={openLoadVersionModal}   disabled={!versionKeys.length} variant="ghost">LOAD</SbButton>
              <SbButton onClick={openDeleteVersionModal} disabled={!versionKeys.length} variant="danger">DELETE</SbButton>
            </div>
          </div>

          {versionKeys.length > 0 && (
            <>
              <SbDivider />
              <SbLabel>Saved versions</SbLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {versionKeys.map((key) => {
                  const v = versions[key];
                  const date = v.savedAt ? new Date(v.savedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
                  return (
                    <div
                      key={key}
                      style={{
                        background: DS.bgCard,
                        border: `1px solid ${DS.border}`,
                        borderRadius: 2,
                        padding: "6px 8px",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: DS.textPrimary, fontFamily: MONO, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {key}
                        </div>
                        <div style={{ fontSize: 11, color: DS.textMuted, fontFamily: MONO, marginTop: 1 }}>{date}</div>
                      </div>
                      <button
                        onClick={() => loadVersion(key)}
                        style={{
                          background: DS.accentDim,
                          border: `1px solid ${DS.accent}44`,
                          borderRadius: 2,
                          color: DS.accent,
                          fontSize: 11,
                          fontFamily: MONO,
                          cursor: "pointer",
                          padding: "2px 6px",
                          letterSpacing: "0.06em",
                          flexShrink: 0,
                        }}
                      >
                        LOAD
                      </button>
                      <button
                        onClick={() => deleteVersionDirect(key)}
                        style={{
                          background: DS.dangerDim,
                          border: `1px solid ${DS.danger}44`,
                          borderRadius: 2,
                          color: DS.danger,
                          fontSize: 11,
                          fontFamily: MONO,
                          cursor: "pointer",
                          padding: "2px 6px",
                          letterSpacing: "0.06em",
                          flexShrink: 0,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Section>

      </div>
    </div>
  );
}