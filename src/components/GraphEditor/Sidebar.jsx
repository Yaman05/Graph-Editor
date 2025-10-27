// src/components/GraphEditor/Sidebar.jsx
// Sidebar with layout chooser (Normal / Hierarchical / Circular)
// + controls, version management, analysis functions

import React from "react";
import { styles } from "./styles";

export default function Sidebar({
  // Search & filter
  search,
  setSearch,
  filter,
  setFilter,

  // Layout
  layoutType,
  setLayoutType,
  hierDirection,
  setHierDirection,

  // History
  historyCtrl,

  // Modals / actions
  openAddNodeModal,
  openAddLinkModal,
  openEditNodeModal,
  openEditLinkModal,
  openDeleteSelectedModal,
  openShortestPathModal,

  // Import/Export
  handleExport,
  handleImport,
  fileInputRef,

  // Versions
  versions,
  saveVersions,
  updateData,
  openSaveVersionModal,
  openLoadVersionModal,
  openDeleteVersionModal,

  // Selected objects
  data,
  selected,
  setSelected,
  parseLinkQuery,

  // Analysis functions
  runDegreeCentrality,
  runPageRank,
  clearAnalysis,
  layoutIsHierarchical,
  analysisActive,
}) {
  return (
    <div
      style={{
        width: 300,
        background: "#121217",
        padding: 16,
        borderRight: "1px solid #23232a",
        boxSizing: "border-box",
        overflowY: "auto",
      }}
    >
      <h2 style={{ color: styles.brandColor, margin: 0, marginBottom: 12 }}>
        Graph Editor
      </h2>

      {/* Search */}
      <div style={{ marginBottom: 10 }}>
        <input
          placeholder="Search nodes or 'A - B'"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...styles.input, width: "100%" }}
        />
      </div>

      {/* Filter */}
      <div style={{ marginBottom: 12 }}>
        <input
          placeholder="Filter nodes (A,B,C)"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ ...styles.input, width: "100%" }}
        />
      </div>

      {/* Layout chooser */}
      <div style={{ marginBottom: 12 }}>
        <strong style={{ color: "#cfcfe0" }}>Layout</strong>
        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          <select
            value={layoutType}
            onChange={(e) => setLayoutType(e.target.value)}
            style={{ ...styles.input, padding: "6px 8px" }}
          >
            <option value="NORMAL">Force-directed (normal)</option>
            <option value="HIERARCHICAL">Hierarchical (Parent → Child)</option>
            <option value="CIRCULAR">Circular</option>
          </select>
        </div>

        {layoutType === "HIERARCHICAL" && (
          <div style={{ marginTop: 8 }}>
            <select
              value={hierDirection}
              onChange={(e) => setHierDirection(e.target.value)}
              style={{ ...styles.input, padding: "6px 8px", width: "100%" }}
            >
              <option value="TB">Top → Bottom</option>
              <option value="LR">Left → Right</option>
            </select>
            <div style={{ marginTop: 8 }}>
              <small style={{ color: "#9aa0b4" }}>
              A parent is placed one level above its child.
              You can change the relationship in Edit Link when hierarchical layout is selected.
              </small>
            </div>
          </div>
        )}
      </div>

      {/* Node/Link actions */}
      <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
        <button onClick={openAddNodeModal} style={styles.btn}>
          Add Node
        </button>
        <button onClick={openAddLinkModal} style={styles.btn}>
          {layoutType === "HIERARCHICAL"
            ? "Add Link (Parent/Child)"
            : "Add Link (use selected node)"}
        </button>
        <button onClick={openEditNodeModal} style={styles.btn}>
          Edit Node
        </button>
        <button onClick={openEditLinkModal} style={styles.btn}>
          Edit Link
        </button>
        <button onClick={openDeleteSelectedModal} style={styles.ghostBtn}>
          Delete Selected
        </button>
        <button onClick={openShortestPathModal} style={styles.btn}>
          Find Shortest Path
        </button>
      </div>

      {/* Undo/Redo */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          onClick={historyCtrl.undo}
          disabled={!historyCtrl.canUndo}
          style={{
            ...styles.btnSmall,
            opacity: historyCtrl.canUndo ? 1 : 0.5,
          }}
        >
          Undo
        </button>
        <button
          onClick={historyCtrl.redo}
          disabled={!historyCtrl.canRedo}
          style={{
            ...styles.btnSmall,
            opacity: historyCtrl.canRedo ? 1 : 0.5,
          }}
        >
          Redo
        </button>
      </div>

      <hr style={{ borderColor: "#23232a", margin: "12px 0" }} />

      {/* Import/Export */}
      <div style={{ display: "grid", gap: 8 }}>
        <button onClick={handleExport} style={styles.btn}>
          Export
        </button>
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

      <hr style={{ borderColor: "#23232a", margin: "12px 0" }} />

      {/* Version Management */}
      <div style={{ marginBottom: 12 }}>
        <strong style={{ color: "#cfcfe0" }}>Versions</strong>
        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          <button onClick={openSaveVersionModal} style={styles.btn}>
            Save Version
          </button>
          <button onClick={openLoadVersionModal} style={styles.btn}>
            Load Version
          </button>
          <button onClick={openDeleteVersionModal} style={styles.ghostBtn}>
            Delete Version
          </button>
        </div>

        {Object.keys(versions).length > 0 && (
          <ul
            style={{
              listStyle: "none",
              marginTop: 10,
              padding: 0,
              maxHeight: 100,
              overflow: "auto",
            }}
          >
            {Object.entries(versions).map(([k, v]) => (
              <li
                key={k}
                style={{
                  padding: "6px 8px",
                  borderBottom: "1px solid #23232a",
                  fontSize: 13,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong style={{ color: "#cfcfe0" }}>{k}</strong>
                    <br />
                    <small style={{ color: "#9aa0b4" }}>
                      {new Date(v.savedAt).toLocaleString()}
                    </small>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => {
                        updateData({ nodes: v.nodes, links: v.links });
                      }}
                      style={{ ...styles.btnSmall, padding: "6px 8px" }}
                    >
                      Load
                    </button>
                    <button
                      onClick={() => {
                        const newVersions = { ...versions };
                        delete newVersions[k];
                        saveVersions(newVersions);
                      }}
                      style={styles.ghostBtn}
                    >
                      Del
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Analysis section */}
      <hr style={{ borderColor: "#23232a", margin: "12px 0" }} />
      <div style={{ marginBottom: 12 }}>
        <strong style={{ color: "#cfcfe0" }}>Analysis</strong>
        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
          <button onClick={runDegreeCentrality} style={styles.btn}>
            Degree Centrality
          </button>
          <button
            onClick={runPageRank}
            disabled={!layoutIsHierarchical}
            style={{
              ...styles.btn,
              opacity: layoutIsHierarchical ? 1 : 0.5,
            }}
          >
            PageRank (Hierarchical)
          </button>
          {analysisActive && (
            <button onClick={clearAnalysis} style={styles.ghostBtn}>
              Clear Analysis
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
