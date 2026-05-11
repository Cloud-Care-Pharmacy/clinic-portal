"use client";

import { type EdgeProps } from "@xyflow/react";
import {
  ARC_LENGTH,
  ARC_LEFT_DOWN,
  ARC_RIGHT_DOWN,
} from "../lib/canvas-consts";
import { edgePaintForStatus } from "../lib/edge-paint";
import type { WfRouterEndEdgeData } from "../lib/graph-builder";

/**
 * Edge from a branch tail back into the router's merge point. Drawn as:
 * vertical down, rounded corner, horizontal toward merge column.
 */
export function RouterEndEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  id,
}: EdgeProps) {
  const ed = (data ?? {}) as unknown as WfRouterEndEdgeData;

  // Clean merge path from branch exit to router merge anchor with a
  // quarter-circle rounded corner. Falls back to a sharp orthogonal path
  // when there is not enough room for the arc (e.g. a center branch that
  // sits directly above the merge).
  const dx = targetX - sourceX;
  const absDx = Math.abs(dx);
  const goRight = dx > 0;
  const verticalLineLength = targetY - sourceY - ARC_LENGTH;
  const horizontalLineLength = absDx - ARC_LENGTH;

  const canRound = absDx >= ARC_LENGTH && verticalLineLength >= 0;

  let d: string;
  if (!canRound) {
    d = [
      `M ${sourceX} ${sourceY}`,
      `L ${sourceX} ${targetY}`,
      `L ${targetX} ${targetY}`,
    ].join(" ");
  } else {
    const arc = goRight ? ARC_RIGHT_DOWN : ARC_LEFT_DOWN;
    const h = goRight ? horizontalLineLength : -horizontalLineLength;
    d = [
      `M ${sourceX} ${sourceY}`,
      `v ${verticalLineLength}`,
      `${arc} h ${h}`,
    ].join(" ");
  }

  const paint = edgePaintForStatus(ed.runStatus, ed.runActive);

  return (
    <path
      id={id}
      d={d}
      fill="none"
      stroke={paint.stroke}
      strokeWidth={paint.strokeWidth}
      strokeDasharray={paint.strokeDasharray}
      style={paint.style}
      markerEnd={ed.drawArrowAtEnd ? "url(#wf-arrow)" : undefined}
    />
  );
}
