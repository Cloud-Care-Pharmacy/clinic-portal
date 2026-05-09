import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";

interface SizedNode<T extends Node = Node> {
  node: T;
  width: number;
  height: number;
}

/**
 * Lays out nodes top-to-bottom using dagre and returns nodes positioned for
 * `<ReactFlow>`. The graph is a pure function of the workflow JSON — users do
 * not drag-position individual nodes.
 */
export function dagreLayout<T extends Node>(
  sized: SizedNode<T>[],
  edges: Edge[]
): T[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 32, ranksep: 56, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const { node, width, height } of sized) {
    g.setNode(node.id, { width, height });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return sized.map(({ node, width, height }) => {
    const pos = g.node(node.id);
    return {
      ...node,
      // dagre returns the node's center; xyflow expects top-left.
      position: { x: pos.x - width / 2, y: pos.y - height / 2 },
      width,
      height,
    } as T;
  });
}
