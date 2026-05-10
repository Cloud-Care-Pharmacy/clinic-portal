"use client";

import { type EdgeProps } from "@xyflow/react";
import {
  ARC_LENGTH,
  ARC_LEFT_UP,
  ARC_RIGHT_UP,
  LINE_WIDTH,
  STROKE,
  STROKE_HIGHLIGHTED,
} from "../lib/canvas-consts";
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

  const dx = targetX - sourceX;
  const goesRight = dx >= 0;
  const arc = goesRight ? ARC_RIGHT_UP : ARC_LEFT_UP;
  const horizontalLen = Math.max(0, Math.abs(dx) - ARC_LENGTH);
  const horizontalSign = goesRight ? 1 : -1;
  const verticalLen = Math.max(0, targetY - sourceY - ARC_LENGTH);

  const d = [
    `M ${sourceX} ${sourceY}`,
    `v ${verticalLen}`,
    arc,
    `h ${horizontalSign * horizontalLen}`,
  ].join(" ");

  const stroke = ed.runActive ? STROKE_HIGHLIGHTED : STROKE;

  return (
    <path
      id={id}
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={LINE_WIDTH}
      markerEnd={ed.drawArrowAtEnd ? "url(#wf-arrow)" : undefined}
    />
  );
}
