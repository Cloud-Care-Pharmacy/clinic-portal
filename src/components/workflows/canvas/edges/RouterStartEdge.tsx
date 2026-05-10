"use client";

import { EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";
import {
  LABEL_HEIGHT,
  LINE_WIDTH,
  STROKE,
  STROKE_HIGHLIGHTED,
} from "../lib/canvas-consts";
import { AddButton } from "./AddButton";
import { useCanvasContext } from "../lib/canvas-context";
import type { WfRouterStartEdgeData } from "../lib/graph-builder";

/**
 * Edge from a router step out to a single branch. Drawn as: vertical down,
 * horizontal jog (right or left depending on branch position), arc, vertical
 * down to branch head. A branch label is rendered above the arc.
 */
export function RouterStartEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  id,
}: EdgeProps) {
  const ed = (data ?? {}) as unknown as WfRouterStartEdgeData;
  const ctx = useCanvasContext();

  const dx = targetX - sourceX;
  const labelLineY = sourceY + LABEL_HEIGHT;

  // Orthogonal branch fan-out. It must end at targetX/targetY exactly;
  // otherwise labels/buttons look aligned while the actual edge handle is not.
  const d = [
    `M ${sourceX} ${sourceY}`,
    `L ${sourceX} ${labelLineY}`,
    `L ${targetX} ${labelLineY}`,
    `L ${targetX} ${targetY}`,
  ].join(" ");

  const stroke = ed.runActive ? STROKE_HIGHLIGHTED : STROKE;
  const labelX = sourceX + dx / 2;
  const labelY = labelLineY;

  return (
    <>
      <path
        id={id}
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={LINE_WIDTH}
        markerEnd="url(#wf-arrow)"
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
          className="nodrag nopan pointer-events-none rounded-md border border-border bg-popover px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shadow-sm"
        >
          {ed.branchLabel}
        </div>
      </EdgeLabelRenderer>
      {ed.insertion && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${targetX}px, ${
                targetY - 16
              }px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan"
          >
            <AddButton
              onClick={() =>
                ctx.onRequestInsert(ed.insertion!, { x: targetX, y: targetY })
              }
            />
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
