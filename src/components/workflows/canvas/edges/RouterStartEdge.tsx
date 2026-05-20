"use client";

import { EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";
import {
  ARC_LENGTH,
  ARC_LEFT,
  ARC_LEFT_DOWN,
  ARC_RIGHT,
  ARC_RIGHT_DOWN,
  LABEL_HEIGHT,
} from "../lib/canvas-consts";
import { edgePaintForStatus } from "../lib/edge-paint";
import type { WfRouterStartEdgeData } from "../lib/graph-builder";

/**
 * Edge from a router step out to a single branch. Drawn as: vertical down,
 * rounded corner, horizontal jog (right or left depending on branch
 * position), rounded corner, vertical down to branch head. A branch label
 * is rendered above the arc.
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
  // Sit the branch label midway down the final vertical descent so it
  // floats above the branch head rather than hugging the horizontal jog.
  const branchLabelY = (labelLineY + targetY) / 2;

  // Orthogonal branch fan-out with quarter-circle rounded corners. The path
  // must end exactly at targetX/targetY; otherwise labels/buttons look
  // aligned while the actual edge handle is not.
  const dx = targetX - sourceX;
  const absDx = Math.abs(dx);
  const goRight = dx > 0;
  const middleVerticalLength = labelLineY - sourceY - ARC_LENGTH;
  const finalVerticalLength = targetY - labelLineY - ARC_LENGTH;
  const horizontalLineLength = absDx - 2 * ARC_LENGTH;

  const canRound =
    absDx >= 2 * ARC_LENGTH &&
    middleVerticalLength >= 0 &&
    finalVerticalLength >= 0;

  let d: string;
  if (!canRound) {
    // Branch sits directly below the router (center/fallback) or there is
    // not enough room for arcs — fall back to a straight orthogonal path.
    d = [
      `M ${sourceX} ${sourceY}`,
      `L ${sourceX} ${labelLineY}`,
      `L ${targetX} ${labelLineY}`,
      `L ${targetX} ${targetY}`,
    ].join(" ");
  } else {
    const firstArc = goRight ? ARC_RIGHT_DOWN : ARC_LEFT_DOWN;
    const secondArc = goRight ? ARC_RIGHT : ARC_LEFT;
    const h = goRight ? horizontalLineLength : -horizontalLineLength;
    d = [
      `M ${sourceX} ${sourceY}`,
      `v ${middleVerticalLength}`,
      `${firstArc} h ${h}`,
      `${secondArc} v ${finalVerticalLength}`,
    ].join(" ");
  }

  const paint = edgePaintForStatus(ed.runStatus, ed.runActive);
  const labelClasses = ed.isFallbackBranch
    ? "border-border bg-muted text-foreground"
    : "border-primary/70 bg-popover text-primary";

  return (
    <>
      <path
        id={id}
        d={d}
        fill="none"
        stroke={paint.stroke}
        strokeWidth={paint.strokeWidth}
        strokeDasharray={paint.strokeDasharray}
        style={paint.style}
        markerEnd="url(#wf-arrow)"
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${targetX}px, ${branchLabelY}px)`,
          }}
          className={`nodrag nopan pointer-events-none rounded-sm border px-2.5 py-1 text-xs font-semibold shadow-sm ${labelClasses}`}
        >
          {ed.branchLabel}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
