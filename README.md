# Network Topology Editor

An interactive tool for designing, analyzing, and stress-testing distributed system architectures — built from scratch with **React 19** and **D3.js 7**.

The app ships with a realistic reference topology (Browser → Firewall → Load Balancer → API Servers → PostgreSQL / Redis / Queue / Worker) and lets you explore it at any level of detail.

---

## Why this exists

Visualizing how a distributed system behaves under failure is hard to reason about in a document or a whiteboard sketch. This tool makes it concrete:

- **Click a node** to mark it as "failed" — the graph immediately shows every downstream service that is now unreachable.
- **Drill into any node** to see its internal architecture (e.g., click "API Server 1" to reveal its Auth module, Request Handler, and Validator).
- **Run graph algorithms** on the topology to understand traversal order, critical paths, and minimum spanning trees.

---

## Tech stack

| Layer | Technology |
|---|---|
| UI framework | React 19 |
| Graph rendering | D3.js 7 (SVG, force simulation) |
| Build tool | Vite 7 |
| Tests | Vitest 2 — 25 unit tests |
| Persistence | localStorage |

---

## Features

### Topology modelling
- **9 node types** with distinct colours: Server, Database, API, Client, Load Balancer, Cache, Queue, Firewall, Microservice
- Directed and undirected weighted links
- Drag-and-drop node positioning on the canvas
- 3 layouts: Force-directed, Hierarchical (Top→Bottom / Left→Right), Circular
- Zoom, pan, and filter by node ID

### Failure simulation
- Toggle **Failure Mode** → click any node to mark it as `FAILED`
- BFS downstream propagation instantly highlights every `AFFECTED` service
- Visual: failed = red, affected = orange, healthy = type colour
- Reset all failures with one click

### Drill-down sub-architecture
- Every node can store its own internal graph (sub-components + links)
- Nodes with sub-architectures show a dashed cyan border as a visual cue
- Click **Drill Down** on a selected node to open a dedicated right-side panel
- Add, link, and delete internal components without leaving the main view
- Changes are saved back to the parent node and preserved in version snapshots

### Graph algorithms
| Algorithm | Purpose |
|---|---|
| **BFS** | Traversal order from any start node, visualised step-by-step |
| **DFS** | Depth-first traversal with visit ordering |
| **Topological Sort** | Build/deploy ordering for DAGs (Kahn's algorithm) |
| **Kruskal MST** | Minimum spanning tree — highlights backbone edges in gold |
| **Dijkstra** | Shortest weighted path between two nodes |
| **Cycle detection** | DFS-coloring to verify DAG validity |
| **Degree Centrality** | Identifies the most connected nodes |
| **PageRank** | Hierarchical influence scoring |

### Graph statistics (live)
- Node count, link count, density
- Connectivity check (is the graph fully connected?)
- Cycle detection result

### Data management
- Undo / Redo (10-step history via custom `useHistoryState` hook)
- Named version snapshots (localStorage)
- Export as JSON (full topology including sub-graphs) or PNG
- Import from JSON

---

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # run 25 unit tests
npm run build      # production build
```

---

## Project structure

```
src/components/GraphEditor/
├── GraphEditor.jsx       Main component — state, D3 rendering, failure logic
├── Sidebar.jsx           Control panel — all sections and statistics
├── DrilldownPanel.jsx    Sub-architecture panel with its own D3 graph
├── Modal.jsx             Reusable dialog
├── styles.js             Shared styles + node-type colour palette
└── utils/
    ├── algorithms.js     BFS, DFS, topological sort, Kruskal MST,
    │                     cycle detection, failure propagation, connectivity
    ├── algorithms.test.js  25 Vitest unit tests
    ├── dijkstra.js       Dijkstra shortest-path
    ├── layout.js         Hierarchical and circular layout calculators
    ├── history.js        useHistoryState hook (undo/redo)
    └── helpers.js        makeUniqueId, parseLinkQuery
```

---

## Data model

```js
// Node
{
  id: "api1",
  label: "API Server 1",
  nodeType: "api",                       // controls colour and icon
  subGraph: { nodes: [...], links: [...] } // internal architecture
}

// Link
{
  source: "lb",
  target: "api1",
  weight: 3,       // used by Dijkstra and Kruskal
  directed: true
}
```

---

## Author

**Yaman Alaiash** · [github.com/Yaman05](https://github.com/Yaman05)
