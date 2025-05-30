import React, { useEffect, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";

type Node = {
  id: string;
  group?: number;
};

type Link = {
  source: string;
  target: string;
};

type GraphData = {
  nodes: Node[];
  links: Link[];
};

export default function App() {
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });

  useEffect(() => {
    fetch("/treeclimbgraphdata.json")
      .then((res) => res.json())
      .then(setGraphData)
      .catch((err) => console.error("Failed to load graph data:", err));
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <ForceGraph2D
        graphData={graphData}
        nodeLabel="id"
        nodeAutoColorBy="group"
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        linkCurvature={0.25}
      />
    </div>
  );
}
