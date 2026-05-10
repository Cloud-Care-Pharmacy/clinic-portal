"use client";

import { EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";
import {
  LABEL_HEIGHT,
  LINE_WIDTH,
  STROKE,
  STROKE_HIGHLIGHTED,
} from "../lib/canvas-consts";
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

  const labelLineY = sourceY + LABEL_HEIGHT;
  const branchLabelY = labelLineY + 18;

  // Orthogonal branch fan-out. It must end at targetX/targetY exactly;
  // otherwise labels/buttons look aligned while the actual edge handle is not.
  const d = [
    `M ${sourceX} ${sourceY}`,
    `L ${sourceX} ${labelLineY}`,
    `L ${targetX} ${labelLineY}`,
    `L ${targetX} ${targetY}`,
  ].join(" ");

  const stroke = ed.runActive ? STROKE_HIGHLIGHTED : STROKE;
  const labelClasses = ed.isFallbackBranch
    ? "border-border bg-muted text-foreground"
    : "border-primary/70 bg-popover text-primary";

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
            transform: `translate(-50%, -50%) translate(${targetX}px, ${branchLabelY}px)`,
          }}
          className={`nodrag nopan pointer-events-none rounded-md border px-2.5 py-1 text-xs font-semibold shadow-sm ${labelClasses}`}
        >
          {ed.branchLabel}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
