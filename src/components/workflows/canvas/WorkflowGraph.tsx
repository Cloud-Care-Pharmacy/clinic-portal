"use client";

import { useEffect, useMemo } from "react";
import {
  Background,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { WorkflowNode } from "./nodes/WorkflowNode";
import { WorkflowEdge } from "./WorkflowEdge";
import {
  buildGraph,
  type NodeRunStatus,
  type WorkflowNode as WfNode,
} from "./lib/workflow-graph";
import type { WorkflowStep, WorkflowTrigger } from "@/types";

const nodeTypes = { workflow: WorkflowNode };
const edgeTypes = { workflow: WorkflowEdge };

interface WorkflowGraphProps {
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  /** Selected node id ("trigger-N" or "step-N"). */
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  stepRunStatus?: Record<number, NodeRunStatus>;
  runActive?: boolean;
}

function ArrowMarker() {
  return (
    <svg style={{ position: "absolute", width: 0, height: 0 }}>
      <defs>
        <marker
          id="wf-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerUnits="strokeWidth"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--input)" />
        </marker>
      </defs>
    </svg>
  );
}

function GraphInner({
  triggers,
  steps,
  selectedId,
  onSelect,
  stepRunStatus,
  runActive,
}: WorkflowGraphProps) {
  const { fitView } = useReactFlow();

  const { nodes, edges } = useMemo(
    () => buildGraph({ triggers, steps, stepRunStatus }),
    [triggers, steps, stepRunStatus]
  );

  const selectedNodes = useMemo<WfNode[]>(
    () =>
      nodes.map((n) => ({
        ...n,
        selected: n.id === selectedId,
      })),
    [nodes, selectedId]
  );

  const themedEdges = useMemo(
    () =>
      edges.map((e) => ({
        ...e,
        data: { ...(e.data ?? {}), runActive },
      })),
    [edges, runActive]
  );

  // Re-fit when graph shape changes.
  useEffect(() => {
    const id = window.setTimeout(() => {
      fitView({ padding: 0.2, duration: 200 });
    }, 50);
    return () => window.clearTimeout(id);
  }, [nodes.length, edges.length, fitView]);

  const handleNodeClick: NodeMouseHandler = (_, node) => {
    onSelect(node.id);
  };

  return (
    <div className="relative h-full w-full">
      <ArrowMarker />
      <ReactFlow
        nodes={selectedNodes}
        edges={themedEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        onNodeClick={handleNodeClick}
        onPaneClick={() => onSelect(null)}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.4}
        maxZoom={1.2}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          gap={20}
          size={1}
          color="var(--border)"
          style={{ background: "var(--background)" }}
        />
      </ReactFlow>
    </div>
  );
}

export function WorkflowGraph(props: WorkflowGraphProps) {
  return (
    <ReactFlowProvider>
      <GraphInner {...props} />
    </ReactFlowProvider>
  );
}
