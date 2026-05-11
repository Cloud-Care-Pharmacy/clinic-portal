"use client";

import { useCallback, useEffect, useMemo } from "react";
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
import { NoteNode } from "./nodes/NoteNode";
import { StraightLineEdge } from "./edges/StraightLineEdge";
import { RouterStartEdge } from "./edges/RouterStartEdge";
import { RouterEndEdge } from "./edges/RouterEndEdge";
import { LoopStartEdge } from "./edges/LoopStartEdge";
import { LoopReturnEdge } from "./edges/LoopReturnEdge";
import {
  buildWorkflowGraph,
  type NodeRunStatus,
  type WfNode,
  type WorkflowNodeData,
} from "./lib/graph-builder";
import { CanvasContextProvider, type InsertionRequest } from "./lib/canvas-context";
import { triggerLabel, stepLabel } from "./lib/node-kind-config";
import type { WorkflowNote, WorkflowStep, WorkflowTrigger } from "@/types";

const nodeTypes = {
  step: WorkflowNode,
  trigger: WorkflowNode,
  bigAddButton: BigAddButtonNode,
  graphEnd: GraphEndNode,
  loopReturn: LoopReturnNode,
  note: NoteNode,
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
  /**
   * Free-floating sticky-note annotations. These are non-executable canvas
   * objects positioned via absolute `x`/`y` on each `WorkflowNote`.
   */
  notes?: WorkflowNote[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onRequestInsert: (req: InsertionRequest) => void;
  /**
   * Called when xyflow reports a position or dimensions change for a note
   * node (drag end, resize end). Editor uses this to write back into draft
   * note state. Omitted in read-only / run views.
   */
  onNoteGeometryChange?: (
    id: string,
    patch: { x?: number; y?: number; width?: number; height?: number },
  ) => void;
  stepRunStatus?: Record<number, NodeRunStatus>;
  /**
   * Per-step duration / live-elapsed (ms), keyed by flat step index. The
   * run canvas passes this so each node can render a tiny duration pill.
   */
  stepRunMeta?: Record<
    number,
    { durationMs?: number; liveElapsedMs?: number }
  >;
  runActive?: boolean;
  panningMode: "grab" | "select";
  /**
   * Read-only mode: hides the inline `+` add buttons / placeholders so the
   * canvas can be reused inside the run view. Editing affordances (drag /
   * insert / palette) are inert in this mode.
   */
  readOnly?: boolean;
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
  notes,
  selectedId,
  onSelect,
  onRequestInsert,
  onNoteGeometryChange,
  stepRunStatus,
  stepRunMeta,
  runActive,
  panningMode,
  readOnly = false,
}: WorkflowGraphProps) {
  const { fitView } = useReactFlow();

  const { nodes, edges } = useMemo(
    () =>
      buildWorkflowGraph({
        triggers,
        steps,
        notes,
        triggerLabel,
        stepLabel,
        stepRunStatus,
        stepRunMeta,
      }),
    [triggers, steps, notes, stepRunStatus, stepRunMeta]
  );

  // In read-only mode (run view) we strip out the editing affordances so
  // the graph reads as a pure visualization. We also drop the orphan edges
  // that would have been pointing at the removed add buttons.
  const visibleNodes = useMemo<WfNode[]>(() => {
    if (!readOnly) return nodes;
    return nodes
      .filter((n) => {
        const k = (n.data as WorkflowNodeData).kind;
        return k !== "addButton" && k !== "bigAddButton";
      })
      .map((n) => {
        // Notes stay visible in run view but become inert (no drag, no
        // resize handles via selection).
        const k = (n.data as WorkflowNodeData).kind;
        if (k === "note") return { ...n, draggable: false, selectable: false };
        return n;
      });
  }, [nodes, readOnly]);

  const visibleNodeIds = useMemo(
    () => new Set(visibleNodes.map((n) => n.id)),
    [visibleNodes]
  );

  const selectedNodes = useMemo<WfNode[]>(
    () => visibleNodes.map((n) => ({ ...n, selected: n.id === selectedId })),
    [visibleNodes, selectedId]
  );

  // Build a lookup of node -> runStatus so each edge can colour itself by
  // the status of the step it terminates at. Only steps carry `runStatus`.
  const runStatusByNodeId = useMemo<Record<string, NodeRunStatus>>(() => {
    if (!stepRunStatus) return {};
    const out: Record<string, NodeRunStatus> = {};
    for (const n of nodes) {
      const data = n.data as WorkflowNodeData;
      if (data.kind === "step" && data.runStatus) {
        out[n.id] = data.runStatus;
      }
    }
    return out;
  }, [nodes, stepRunStatus]);

  const themedEdges = useMemo(
    () =>
      edges
        .filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))
        .map((e) => {
          const targetStatus = runStatusByNodeId[e.target];
          return {
            ...e,
            data: {
              ...(e.data ?? {}),
              runActive,
              runStatus: targetStatus,
              ...(readOnly ? { hideAddButton: true } : null),
            } as Record<string, unknown>,
          };
        }),
    [edges, visibleNodeIds, runActive, runStatusByNodeId, readOnly]
  );

  useEffect(() => {
    const id = window.setTimeout(() => {
      fitView({ padding: 0.2, maxZoom: 1, duration: 200 });
    }, 50);
    return () => window.clearTimeout(id);
  }, [visibleNodes.length, themedEdges.length, fitView]);

  const handleNodeClick: NodeMouseHandler = (_, node) => {
    const data = node.data as WorkflowNodeData;
    if (data.kind === "step" || data.kind === "trigger" || data.kind === "note") {
      onSelect(node.id);
    }
  };

  const handleNodeDragStop = useCallback<NodeMouseHandler>(
    (_, node) => {
      if (!onNoteGeometryChange) return;
      const data = node.data as WorkflowNodeData;
      if (data.kind !== "note") return;
      onNoteGeometryChange(data.noteId, {
        x: node.position.x,
        y: node.position.y,
      });
    },
    [onNoteGeometryChange],
  );

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
          elementsSelectable={!readOnly}
          onNodeClick={handleNodeClick}
          onNodeDragStop={handleNodeDragStop}
          onPaneClick={() => onSelect(null)}
          panOnDrag={panningMode === "grab" ? [0, 1, 2] : [1, 2]}
          panOnScroll
          panOnScrollMode={PanOnScrollMode.Free}
          selectionOnDrag={panningMode === "select"}
          zoomOnDoubleClick={false}
          fitView
          fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
          minZoom={0.4}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            gap={24}
            size={1.4}
            color="var(--input)"
            variant={BackgroundVariant.Dots}
            style={{ background: "var(--background)" }}
          />
        </ReactFlow>
      </div>
    </CanvasContextProvider>
  );
}
