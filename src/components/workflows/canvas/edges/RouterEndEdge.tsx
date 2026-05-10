"use client";

import { type EdgeProps } from "@xyflow/react";
import { edgePaintForStatus } from "../lib/edge-paint";
import type { WfRouterEndEdgeData } from "../lib/graph-builder";

/**
 * Edge from a branch tail back into the router's merge point. Drawn as:
 * vertical down, arc inward, horizontal toward merge column.
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

  // Clean merge path from branch exit to router merge anchor. The old arc
  // math was based on relative fragments and could stop short of the target.
  const d = [
    `M ${sourceX} ${sourceY}`,
    `L ${sourceX} ${targetY}`,
    `L ${targetX} ${targetY}`,
  ].join(" ");

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
