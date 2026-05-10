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

  // Draw loop entry as a clean container rail: down from the loop card,
  // across to the body column, then down into the body. This mirrors the
  // ActivePieces-style reference and avoids diagonal connector noise.
  const bendY = sourceY + Math.max(32, (targetY - sourceY) / 3);
  const path = [
    `M ${sourceX} ${sourceY}`,
    `L ${sourceX} ${bendY}`,
    `L ${targetX} ${bendY}`,
    `L ${targetX} ${targetY}`,
  ].join(" ");

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
