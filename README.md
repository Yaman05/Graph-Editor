 Graph Editor

A powerful, interactive graph visualization and editing tool built with React and D3.js. Create, edit, and analyze graphs with multiple layout options, pathfinding algorithms, and centrality analysis.

![Graph Editor](https://img.shields.io/badge/React-18+-blue.svg)
![D3.js](https://img.shields.io/badge/D3.js-7+-orange.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

 Features

Multiple Layout Types
- Normal Layout: Force-directed graph with customizable physics
- Hierarchical Layout: Parent-child relationships with Top-Bottom or Left-Right orientations
- Circular Layout: Nodes arranged in a perfect circle

Node & Link Management
- Create Nodes: Add nodes with custom labels
- Create Links: Add directed or undirected links between nodes
- Edit Properties: Modify node labels, link weights, and directions
- Delete Elements: Remove nodes and links with confirmation
- Drag & Drop: Freely move nodes in all layouts

 Search & Filter
- Node Search: Find nodes by label
- Link Search: Search for specific connections (e.g., "A - B")
- Filter View: Display only specific nodes and their connections

 Pathfinding
- Dijkstra's Algorithm: Find shortest path between two nodes
- Directed Graph Support: Respects link directions in Normal layout
- Visual Highlighting: Path nodes and edges highlighted in gold

 Graph Analysis
- Degree Centrality: Visualize node connectivity
- PageRank: Hierarchical importance analysis (Hierarchical layout only)
- Color-coded Results: Gradient visualization from low to high values

 Data Management
- Undo/Redo: Full history support (up to 10 steps)
- Version Control: Save, load, and delete graph versions
- Local Storage: Automatic persistence of saved versions
- Export Options:
  - JSON format (for reimporting)
  - PNG image export
- Import: Load graphs from JSON files

 Visual Features
- Interactive SVG Canvas: Smooth zoom and pan
- Arrows: Visual direction indicators on directed links
- Weight Labels: Display link weights on the graph
- Color Highlighting: Selection, search results, and analysis visualization
- Responsive Design: Dark theme optimized for visibility

 Installation

`bash
 Clone the repository
git clone https://github.com/Yaman05/graph-editor.git

Navigate to project directory
cd graph-editor

Install dependencies
npm install

Start development server
npm start


The application will open at `http://localhost:5173`

 Usage Guide

 Creating Your First Graph

1. Add Nodes
   - Click "Add Node" button
   - Enter a label for your node
   - Node appears on canvas

2. Add Links
   - Select a node by clicking it
   - Click "Add Link (use selected node)"
   - Choose direction: outgoing or incoming
   - Enter the other node's ID
   - (Optional) Add weight and set as directed

3. Edit Elements
   - Click on a node or link to select it
   - Use "Edit Node" or "Edit Link" buttons
   - Modify properties and confirm

 Layout Options

Normal Layout (Default)
- Force-directed graph with natural spacing
- Supports directed and undirected links
- Drag nodes to reposition freely
- Best for: General-purpose graphs

Hierarchical Layout
- Parent-child relationships
- Choose Top-Bottom or Left-Right orientation
- All links show arrows (parent → child)
- Best for: Trees, organizational charts, flowcharts

Circular Layout
- Nodes arranged in a circle
- Equal spacing between nodes
- Best for: Cycle detection, symmetric graphs

 Finding Shortest Path

1. Ensure you're in Normal Layout
2. All links must have weights
3. Click "Find Shortest Path"
4. Enter start and end node IDs
5. Path highlights in gold

Note: Directed links are respected - pathfinding only follows valid directions.

 Running Analysis

Degree Centrality
- Available in all layouts
- Shows number of connections per node
- Higher values = more connected nodes

PageRank
- Only available in Hierarchical layout
- Measures node importance in hierarchy
- Propagates influence from parents to children

 Saving & Loading

Save Version
1. Click "Save Version"
2. Enter a version name
3. Version saved to browser storage

Load Version
1. Click "Load Version"
2. Select from saved versions
3. Graph restores to saved state

Export
- Choose JSON to save editable file
- Choose PNG to save image

Import
- Click "Import JSON"
- Select a previously exported JSON file
- Graph loads from file

 Project Structure

src/
├── components/
│   └── GraphEditor/
│       ├── GraphEditor.jsx       Main component
│       ├── Modal.jsx              Modal dialog component
│       ├── Sidebar.jsx            Control panel component
│       ├── styles.js              Style definitions
│       └── utils/
│           ├── dijkstra.js        Shortest path algorithm
│           ├── helpers.js         Utility functions
│           ├── history.js         Undo/redo state management
│           └── layout.js          Layout algorithms
└── App.jsx


Technical Details

 Technologies Used
- React 18+: Component framework
- D3.js 7+: Graph visualization and force simulation
- JavaScript ES6+: Modern JavaScript features
- Local Storage API: Data persistence

 Key Algorithms
- Force-Directed Layout: D3 force simulation
- Dijkstra's Algorithm: Shortest path with directed graph support
- Hierarchical Layout: Level-based positioning with depth calculation
- PageRank: Simplified hierarchical ranking algorithm

 Data Structure

Node Object
   javascript
{
  id: "A",           // Unique identifier
  label: "Node A"    // Display label
}


Link Object
javascript
{
  source: "A",       // Source node ID
  target: "B",       // Target node ID
  weight: 5,         // Optional: numeric weight
  directed: true     // Optional: direction flag (default: false)
}


 Keyboard Shortcuts

- Click Node: Select node
- Click Link: Select link
- Click Canvas: Deselect all
- Drag Node: Move node position
- Scroll: Zoom in/out
- Drag Canvas: Pan view

 Known Limitations

- Shortest path only works in Normal layout
- PageRank only available in Hierarchical layout
- Export to PNG may have browser compatibility issues
- Maximum undo history: 10 steps
- Versions stored in browser local storage (cleared when cache is cleared)



 Author:
Yaman Alaiash
- GitHub: [@Yaman05](https://github.com/Yaman05)






