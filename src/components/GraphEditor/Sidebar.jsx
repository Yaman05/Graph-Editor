// src/components/GraphEditor/Sidebar.jsx
import React from "react";
import { styles, NODE_TYPE_COLORS, NODE_TYPE_LABELS } from "./styles";

export default function Sidebar({
  // Search & filter
  search, setSearch,
  filter, setFilter,

  // Layout
  layoutType, setLayoutType,
  hierDirection, setHierDirection,

  // History
  historyCtrl,

  // CRUD modals
  openAddNodeModal,
  openAddLinkModal,
  openEditNodeModal,
  openEditLinkModal,
  openDeleteSelectedModal,
  openShortestPathModal,

  // Import / Export
  handleExport, handleImport, fileInputRef,

  // Versions
  versions, saveVersions, updateData,
  openSaveVersionModal, openLoadVersionModal, openDeleteVersionModal,

  // Selection info
  data, selected,

  // Analysis
  runDegreeCentrality, runPageRank,
  clearAnalysis, layoutIsHierarchical, analysisActive,

  // Graph algorithms
  runBFS, runDFS, runTopologicalSort, runMST, runCycleDetection,
  algorithmResult, clearAlgorithmResult,

  // Failure simulation
  failureMode, toggleFailureMode,
  failedCount, affectedCount, resetFailure,

  // Drill-down
  openDrilldown, selectedNodeHasSubGraph,

  // Graph stats
  graphStats,
}) {
  const selectedNode =
    selected?.type === "node"
      ? data.nodes.find((n) => n.id === selected.id)
      : null;

  return (
    <div
      style={{
        width: 300,
        background: "#121217",
        padding: "14px 14px",
        borderRight: "1px solid #23232a",
        boxSizing: "border-box",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      {/* Title */}
      <h2 style={{ color: styles.brandColor, margin: 0, marginBottom: 14, fontSize: 16 }}>
        Network Topology Editor
      </h2>

      {/* ── Search & Filter ── */}
      <div style={{ marginBottom: 8 }}>
        <input
          placeholder="Search nodes or 'A - B'"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...styles.input, width: "100%" }}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <input
          placeholder="Filter nodes (id1,id2,...)"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ ...styles.input, width: "100%" }}
        />
      </div>

      {/* ── Layout ── */}
      <Section label="Layout">
        <select
          value={layoutType}
          onChange={(e) => setLayoutType(e.target.value)}
          style={{ ...styles.input, padding: "6px 8px", width: "100%" }}
        >
          <option value="NORMAL">Force-directed</option>
          <option value="HIERARCHICAL">Hierarchical (Parent → Child)</option>
          <option value="CIRCULAR">Circular</option>
        </select>
        {layoutType === "HIERARCHICAL" && (
          <select
            value={hierDirection}
            onChange={(e) => setHierDirection(e.target.value)}
            style={{ ...styles.input, padding: "6px 8px", width: "100%", marginTop: 6 }}
          >
            <option value="TB">Top → Bottom</option>
            <option value="LR">Left → Right</option>
          </select>
        )}
      </Section>

      {/* ── Graph Statistics ── */}
      <Section label="Graph Statistics">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <Stat label="Nodes" value={graphStats.nodes} />
          <Stat label="Links" value={graphStats.links} />
          <Stat label="Density" value={graphStats.density} />
          <Stat
            label="Connected"
            value={graphStats.connected ? "Yes" : "No"}
            color={graphStats.connected ? "#22c55e" : "#ef4444"}
          />
          <Stat
            label="Has Cycles"
            value={graphStats.hasCycles ? "Yes" : "No"}
            color={graphStats.hasCycles ? "#f97316" : "#22c55e"}
          />
        </div>
      </Section>

      {/* ── Node Actions ── */}
      <Section label="Node / Link">
        <div style={{ display: "grid", gap: 6 }}>
          <button onClick={openAddNodeModal} style={styles.btn}>Add Node</button>
          <button onClick={openAddLinkModal} style={styles.btn}>
            {layoutType === "HIERARCHICAL"
              ? "Add Link (Parent/Child)"
              : "Add Link (from selected)"}
          </button>
          <button onClick={openEditNodeModal} style={styles.btn}>Edit Node</button>
          <button onClick={openEditLinkModal} style={styles.btn}>Edit Link</button>
          <button onClick={openDeleteSelectedModal} style={styles.ghostBtn}>
            Delete Selected
          </button>
          {selected?.type === "node" && (
            <button
              onClick={openDrilldown}
              style={{
                ...styles.btn,
                background: selectedNodeHasSubGraph ? "#00eaff22" : "#1e1e2e",
                border: `1px solid ${selectedNodeHasSubGraph ? "#00eaff" : "#2a2a34"}`,
                color: selectedNodeHasSubGraph ? "#00eaff" : "#9aa0b4",
              }}
            >
              {selectedNodeHasSubGraph
                ? "🔍 Drill Down (has sub-graph)"
                : "🔍 Drill Down"}
            </button>
          )}
        </div>
      </Section>

      {/* ── Selected node info ── */}
      {selectedNode && (
        <div
          style={{
            background: "#0f0f18",
            border: "1px solid #23232a",
            borderRadius: 8,
            padding: "8px 10px",
            marginBottom: 10,
            fontSize: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <div
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: NODE_TYPE_COLORS[selectedNode.nodeType] || "#6c63ff",
                flexShrink: 0,
              }}
            />
            <strong style={{ color: "#eaeaf2" }}>{selectedNode.label}</strong>
            <span style={{ color: "#9aa0b4" }}>· {selectedNode.id}</span>
          </div>
          <div style={{ color: "#9aa0b4" }}>
            Type: {NODE_TYPE_LABELS[selectedNode.nodeType] || selectedNode.nodeType || "—"}
          </div>
          {selectedNode.subGraph?.nodes?.length > 0 && (
            <div style={{ color: "#00eaff", marginTop: 2 }}>
              {selectedNode.subGraph.nodes.length} internal component
              {selectedNode.subGraph.nodes.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      )}

      {/* ── Undo / Redo ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button
          onClick={historyCtrl.undo}
          disabled={!historyCtrl.canUndo}
          style={{ ...styles.btnSmall, flex: 1, opacity: historyCtrl.canUndo ? 1 : 0.4 }}
        >
          ↩ Undo
        </button>
        <button
          onClick={historyCtrl.redo}
          disabled={!historyCtrl.canRedo}
          style={{ ...styles.btnSmall, flex: 1, opacity: historyCtrl.canRedo ? 1 : 0.4 }}
        >
          Redo ↪
        </button>
      </div>

      <Divider />

      {/* ── Failure Simulation ── */}
      <Section label="Failure Simulation">
        <button
          onClick={toggleFailureMode}
          style={{
            ...styles.btn,
            background: failureMode ? "#ef4444" : "#1e1e2e",
            border: `1px solid ${failureMode ? "#ef4444" : "#2a2a34"}`,
            color: failureMode ? "#fff" : "#9aa0b4",
            width: "100%",
            marginBottom: 6,
          }}
        >
          {failureMode ? "⚠ Exit Failure Mode" : "⚠ Enter Failure Mode"}
        </button>
        {failureMode && (
          <>
            <div style={{ fontSize: 11, color: "#9aa0b4", marginBottom: 6 }}>
              Click nodes on the canvas to mark as failed.
              Downstream dependencies are highlighted automatically.
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 12 }}>
              <span style={{ color: "#ef4444", fontWeight: 600 }}>
                ● {failedCount} failed
              </span>
              <span style={{ color: "#f97316", fontWeight: 600 }}>
                ● {affectedCount} affected
              </span>
            </div>
            <button onClick={resetFailure} style={{ ...styles.ghostBtn, width: "100%", fontSize: 12 }}>
              Reset All
            </button>
          </>
        )}
      </Section>

      <Divider />

      {/* ── Graph Algorithms ── */}
      <Section label="Graph Algorithms">
        <div style={{ display: "grid", gap: 6 }}>
          <button onClick={runBFS} style={styles.btn}>
            BFS Traversal (from selected)
          </button>
          <button onClick={runDFS} style={styles.btn}>
            DFS Traversal (from selected)
          </button>
          <button onClick={runTopologicalSort} style={styles.btn}>
            Topological Sort
          </button>
          <button onClick={runMST} style={styles.btn}>
            Minimum Spanning Tree
          </button>
          <button onClick={runCycleDetection} style={styles.btn}>
            Detect Cycles
          </button>
          <button onClick={openShortestPathModal} style={styles.btn}>
            Shortest Path (Dijkstra)
          </button>
          {algorithmResult && (
            <button onClick={clearAlgorithmResult} style={styles.ghostBtn}>
              Clear Result
            </button>
          )}
        </div>
        {algorithmResult && (
          <div
            style={{
              marginTop: 8,
              background: "#0f0f18",
              border: "1px solid #23232a",
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: 11,
              color: "#9aa0b4",
            }}
          >
            {algorithmResult.type === "bfs" && (
              <>
                <strong style={{ color: "#00eaff" }}>BFS</strong> — visited{" "}
                {algorithmResult.order.length} nodes
                <div style={{ marginTop: 2 }}>
                  Order: {algorithmResult.order.slice(0, 8).join(" → ")}
                  {algorithmResult.order.length > 8 ? " …" : ""}
                </div>
              </>
            )}
            {algorithmResult.type === "dfs" && (
              <>
                <strong style={{ color: "#00eaff" }}>DFS</strong> — visited{" "}
                {algorithmResult.order.length} nodes
                <div style={{ marginTop: 2 }}>
                  Order: {algorithmResult.order.slice(0, 8).join(" → ")}
                  {algorithmResult.order.length > 8 ? " …" : ""}
                </div>
              </>
            )}
            {algorithmResult.type === "topological" && (
              <>
                <strong style={{ color: "#ffd166" }}>Topological order</strong>
                <div style={{ marginTop: 2 }}>
                  {algorithmResult.order.slice(0, 8).join(" → ")}
                  {algorithmResult.order.length > 8 ? " …" : ""}
                </div>
              </>
            )}
            {algorithmResult.type === "mst" && (
              <>
                <strong style={{ color: "#ffd166" }}>MST</strong> —{" "}
                {algorithmResult.edges.length} edges selected
              </>
            )}
          </div>
        )}
      </Section>

      <Divider />

      {/* ── Analysis ── */}
      <Section label="Analysis">
        <div style={{ display: "grid", gap: 6 }}>
          <button onClick={runDegreeCentrality} style={styles.btn}>
            Degree Centrality
          </button>
          <button
            onClick={runPageRank}
            disabled={!layoutIsHierarchical}
            style={{ ...styles.btn, opacity: layoutIsHierarchical ? 1 : 0.4 }}
          >
            PageRank (Hierarchical)
          </button>
          {analysisActive && (
            <button onClick={clearAnalysis} style={styles.ghostBtn}>
              Clear Analysis
            </button>
          )}
        </div>
      </Section>

      <Divider />

      {/* ── Node Type Legend ── */}
      <Section label="Node Type Legend">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
          {Object.entries(NODE_TYPE_LABELS).map(([type, label]) => (
            <div
              key={type}
              style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}
            >
              <div
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: NODE_TYPE_COLORS[type],
                  flexShrink: 0,
                }}
              />
              <span style={{ color: "#9aa0b4" }}>{label}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 6, fontSize: 10, color: "#4a4a5a" }}>
          Dashed border = has sub-architecture
        </div>
      </Section>

      <Divider />

      {/* ── Import / Export ── */}
      <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
        <button onClick={handleExport} style={styles.btn}>Export</button>
        <button
          onClick={() => fileInputRef.current.click()}
          style={styles.btn}
        >
          Import JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          style={{ display: "none" }}
        />
      </div>

      <Divider />

      {/* ── Version Management ── */}
      <Section label="Versions">
        <div style={{ display: "grid", gap: 6 }}>
          <button onClick={openSaveVersionModal} style={styles.btn}>Save Version</button>
          <button onClick={openLoadVersionModal} style={styles.btn}>Load Version</button>
          <button onClick={openDeleteVersionModal} style={styles.ghostBtn}>
            Delete Version
          </button>
        </div>
        {Object.keys(versions).length > 0 && (
          <ul
            style={{
              listStyle: "none",
              marginTop: 8,
              padding: 0,
              maxHeight: 90,
              overflow: "auto",
            }}
          >
            {Object.entries(versions).map(([k, v]) => (
              <li
                key={k}
                style={{
                  padding: "5px 6px",
                  borderBottom: "1px solid #23232a",
                  fontSize: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong style={{ color: "#cfcfe0" }}>{k}</strong>
                    <br />
                    <small style={{ color: "#9aa0b4" }}>
                      {new Date(v.savedAt).toLocaleString()}
                    </small>
                  </div>
                  <div style={{ display: "flex", gap: 5 }}>
                    <button
                      onClick={() => updateData({ nodes: v.nodes, links: v.links })}
                      style={{ ...styles.btnSmall, padding: "4px 7px", fontSize: 11 }}
                    >
                      Load
                    </button>
                    <button
                      onClick={() => {
                        const nv = { ...versions };
                        delete nv[k];
                        saveVersions(nv);
                      }}
                      style={{ ...styles.ghostBtn, padding: "4px 7px", fontSize: 11 }}
                    >
                      Del
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

/* Small helpers */
function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#4a4a5e",
          marginBottom: 7,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function Divider() {
  return <hr style={{ borderColor: "#1e1e28", margin: "8px 0 12px" }} />;
}

function Stat({ label, value, color }) {
  return (
    <div
      style={{
        background: "#0f0f18",
        border: "1px solid #1e1e28",
        borderRadius: 6,
        padding: "5px 8px",
      }}
    >
      <div style={{ fontSize: 9, color: "#4a4a5e", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: color || "#eaeaf2" }}>{value}</div>
    </div>
  );
}
