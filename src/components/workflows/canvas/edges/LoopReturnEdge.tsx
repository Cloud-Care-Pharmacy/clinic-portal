"use client";

import { type EdgeProps } from "@xyflow/react";
import {
  ARC_LENGTH,
  ARC_LEFT_UP,
  ARC_RIGHT_DOWN,
  LINE_WIDTH,
  STROKE,
  STROKE_HIGHLIGHTED,
} from "../lib/canvas-consts";
import type { WfLoopReturnEdgeData } from "../lib/graph-builder";

/**
 * Edge from the last action in a loop body back to the loop step. Loops
 * around the right side using two arcs.
 */
export function LoopReturnEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  id,
}: EdgeProps) {
  const ed = (data ?? {}) as unknown as WfLoopReturnEdgeData;

  // sourceX,sourceY = bottom of last action in loop body
  // targetX,targetY = the loop-return anchor node (right side, near loop)
  const goRightLen = Math.max(0, targetX - sourceX - ARC_LENGTH);
  const goUpLen = Math.max(0, sourceY - targetY - ARC_LENGTH * 2);

  const d = [
    `M ${sourceX} ${sourceY}`,
    `v ${ARC_LENGTH}`,
    ARC_RIGHT_DOWN,
    `h ${goRightLen}`,
    ARC_LEFT_UP,
    `v ${-goUpLen}`,
  ].join(" ");

  const stroke = ed.runActive ? STROKE_HIGHLIGHTED : STROKE;

  return (
    <path
      id={id}
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={LINE_WIDTH}
      markerEnd={ed.drawArrowAfterEnd ? "url(#wf-arrow)" : undefined}
    />
  );
}
