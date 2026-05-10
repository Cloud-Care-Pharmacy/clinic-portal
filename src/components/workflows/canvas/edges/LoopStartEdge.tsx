"use client";

import { type EdgeProps } from "@xyflow/react";
import {
  LINE_WIDTH,
  STROKE,
  STROKE_HIGHLIGHTED,
} from "../lib/canvas-consts";
import type { WfLoopStartEdgeData } from "../lib/graph-builder";

/**
 * Edge from a loop step down to the first action in its body. Drawn straight
 * down with a small arc when the body is non-empty.
 */
export function LoopStartEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  id,
}: EdgeProps) {
  const ed = (data ?? {}) as unknown as WfLoopStartEdgeData;

  // Keep the loop-entry line intentionally boring: the return edge carries
  // the loop affordance. The previous decorative bend crossed the centered
  // child path and created a visual duplicate in simple one-step loops.
  const path = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;

  const stroke = ed.runActive ? STROKE_HIGHLIGHTED : STROKE;

  return (
    <path
      id={id}
      d={path}
      fill="none"
      stroke={stroke}
      strokeWidth={LINE_WIDTH}
      markerEnd="url(#wf-arrow)"
    />
  );
}
