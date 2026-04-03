import React, { useEffect } from "react";
import * as d3 from "d3";
import { computeHierarchyPositions } from "./utils/layout";
import * as styles from "./styles";

export default function GraphCanvas({
  svgRef,
  nodes,
  setNodes,
  links,
  setLinks,
  mode,
  setMode,
  selectedNode,
  setSelectedNode,
  selectedLink,
  setSelectedLink,
  linkStart,
  setLinkStart,
  highlightedPath,
  hierarchical,
  hierDirection,
}) {
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    if (hierarchical) {
      const pos = computeHierarchyPositions(nodes, links, hierDirection, width, height);
      nodes = nodes.map(n => ({ ...n, ...pos[n.id] }));
    }

    const linkGroup = svg.append("g").attr("stroke", "#555").attr("stroke-opacity", 0.7);
    const nodeGroup = svg.append("g");
    const labelGroup = svg.append("g");

    const linkElements = linkGroup
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 2)
      .attr("stroke", (d) => (highlightedPath.includes(d.source) && highlightedPath.includes(d.target) ? "#00ff88" : "#666"));

    const nodeElements = nodeGroup
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", 18)
      .attr("fill", (d) =>
        selectedNode?.id === d.id ? "#6c63ff" : highlightedPath.includes(d.id) ? "#00ff88" : "#444"
      )
      .attr("stroke", "#999")
      .attr("stroke-width", 1.5)
      .on("click", (event, d) => {
        event.stopPropagation();
        if (mode === "addLink") {
          if (!linkStart) {
            setLinkStart(d.id);
            setSelectedNode(d);
          } else {
            setLinkStart(null);
            setMode("select");
            setSelectedNode(null);
            setSelectedLink(null);
            setLinks((prev) => [...prev, { id: `l_${Math.random()}`, source: linkStart, target: d.id, weight: 1 }]);
          }
        } else {
          setSelectedNode(d);
          setSelectedLink(null);
        }
      })
      .call(
        d3.drag()
          .on("start", (event, d) => {
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
            d3.select(event.sourceEvent.target).attr("cx", d.fx).attr("cy", d.fy);
          })
          .on("end", (event, d) => {
            d.x = d.fx;
            d.y = d.fy;
            d.fx = null;
            d.fy = null;
          })
      );

    const labelElements = labelGroup
      .selectAll("text")
      .data(nodes)
      .join("text")
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y + 4)
      .attr("fill", "#fff")
      .attr("text-anchor", "middle")
      .text((d) => d.label);

    // Klick på bakgrunden → lägg till nod
    svg.on("click", (event) => {
      if (mode === "addNode") {
        const [x, y] = d3.pointer(event);
        setNodes((prev) => [...prev, { id: `n_${Math.random()}`, label: `Node ${prev.length + 1}`, x, y }]);
      } else {
        setSelectedNode(null);
        setSelectedLink(null);
      }
    });

    // Force layout om ej hierarkiskt
    if (!hierarchical) {
      const simulation = d3
        .forceSimulation(nodes)
        .force("link", d3.forceLink(links).id((d) => d.id).distance(120))
        .force("charge", d3.forceManyBody().strength(-400))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .on("tick", () => {
          linkElements
            .attr("x1", (d) => getNode(d.source).x)
            .attr("y1", (d) => getNode(d.source).y)
            .attr("x2", (d) => getNode(d.target).x)
            .attr("y2", (d) => getNode(d.target).y);
          nodeElements.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
          labelElements.attr("x", (d) => d.x).attr("y", (d) => d.y + 4);
        });
    }

    // Zoom & pan
    svg.call(
      d3.zoom().on("zoom", (event) => {
        svg.selectAll("g").attr("transform", event.transform);
      })
    );

    function getNode(id) {
      return typeof id === "object" ? id : nodes.find((n) => n.id === id);
    }
  }, [nodes, links, mode, selectedNode, linkStart, highlightedPath, hierarchical, hierDirection]);

  return <svg ref={svgRef} style={styles.canvas} />;
}
