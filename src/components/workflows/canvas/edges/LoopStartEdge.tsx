"use client";

import { type EdgeProps } from "@xyflow/react";
import {
  ARC_LENGTH,
  ARC_LEFT_DOWN,
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

  // For a non-empty loop, route through a small arc on the left side so it
  // visually distinguishes from a straight chain edge.
  const path = ed.isLoopEmpty
    ? `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`
    : [
        `M ${sourceX} ${sourceY}`,
        `v ${(targetY - sourceY) / 2 - ARC_LENGTH}`,
        ARC_LEFT_DOWN,
        `H ${targetX - ARC_LENGTH}`,
        `v ${(targetY - sourceY) / 2 - ARC_LENGTH}`,
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
