"use client";

import { useEffect, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  PanOnScrollMode,
  ReactFlow,
  useReactFlow,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { WorkflowNode } from "./nodes/WorkflowNode";
import { BigAddButtonNode } from "./nodes/BigAddButtonNode";
import { GraphEndNode } from "./nodes/GraphEndNode";
import { LoopReturnNode } from "./nodes/LoopReturnNode";
import { StraightLineEdge } from "./edges/StraightLineEdge";
import { RouterStartEdge } from "./edges/RouterStartEdge";
import { RouterEndEdge } from "./edges/RouterEndEdge";
import { LoopStartEdge } from "./edges/LoopStartEdge";
import { LoopReturnEdge } from "./edges/LoopReturnEdge";
import { CanvasMinimap } from "./CanvasMinimap";
import {
  buildWorkflowGraph,
  type NodeRunStatus,
  type WfNode,
  type WorkflowNodeData,
} from "./lib/graph-builder";
import {
  CanvasContextProvider,
  type InsertionRequest,
} from "./lib/canvas-context";
import { triggerLabel, stepLabel } from "./lib/node-kind-config";
import type { WorkflowStep, WorkflowTrigger } from "@/types";

const nodeTypes = {
  step: WorkflowNode,
  trigger: WorkflowNode,
  bigAddButton: BigAddButtonNode,
  graphEnd: GraphEndNode,
  loopReturn: LoopReturnNode,
};

const edgeTypes = {
  straight: StraightLineEdge,
  routerStart: RouterStartEdge,
  routerEnd: RouterEndEdge,
  loopStart: LoopStartEdge,
  loopReturn: LoopReturnEdge,
};

export interface WorkflowGraphProps {
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onRequestInsert: (req: InsertionRequest) => void;
  stepRunStatus?: Record<number, NodeRunStatus>;
  runActive?: boolean;
  panningMode: "grab" | "select";
  showMinimap: boolean;
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

export function WorkflowGraph({
  triggers,
  steps,
  selectedId,
  onSelect,
  onRequestInsert,
  stepRunStatus,
  runActive,
  panningMode,
  showMinimap,
}: WorkflowGraphProps) {
  const { fitView } = useReactFlow();

  const { nodes, edges } = useMemo(
    () =>
      buildWorkflowGraph({
        triggers,
        steps,
        triggerLabel,
        stepLabel,
        stepRunStatus,
      }),
    [triggers, steps, stepRunStatus],
  );

  const selectedNodes = useMemo<WfNode[]>(
    () => nodes.map((n) => ({ ...n, selected: n.id === selectedId })),
    [nodes, selectedId],
  );

  const themedEdges = useMemo(
    () =>
      edges.map((e) => ({
        ...e,
        data: { ...(e.data ?? {}), runActive } as Record<string, unknown>,
      })),
    [edges, runActive],
  );

  useEffect(() => {
    const id = window.setTimeout(() => {
      fitView({ padding: 0.2, duration: 200 });
    }, 50);
    return () => window.clearTimeout(id);
  }, [nodes.length, edges.length, fitView]);

  const handleNodeClick: NodeMouseHandler = (_, node) => {
    const data = node.data as WorkflowNodeData;
    if (data.kind === "step" || data.kind === "trigger") {
      onSelect(node.id);
    }
  };

  return (
    <CanvasContextProvider
      value={{
        onRequestInsert: (req) => onRequestInsert(req),
      }}
    >
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
          panOnDrag={panningMode === "grab" ? [0, 1, 2] : [1, 2]}
          panOnScroll
          panOnScrollMode={PanOnScrollMode.Free}
          selectionOnDrag={panningMode === "select"}
          zoomOnDoubleClick={false}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.4}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            gap={24}
            size={1.4}
            color="var(--border)"
            variant={BackgroundVariant.Dots}
            style={{ background: "var(--background)" }}
          />
          {showMinimap && <CanvasMinimap />}
        </ReactFlow>
      </div>
    </CanvasContextProvider>
  );
}
