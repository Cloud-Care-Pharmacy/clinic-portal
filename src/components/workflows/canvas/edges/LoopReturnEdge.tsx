"use client";

import { type EdgeProps } from "@xyflow/react";
import {
  ARC_LENGTH,
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

  // Route out to the right-side loop anchor and always terminate at the
  // target coordinate. The previous arc fragments did not land on the target,
  // so React Flow handles and visible strokes drifted apart.
  const bendY = sourceY + ARC_LENGTH;
  const d = [
    `M ${sourceX} ${sourceY}`,
    `L ${sourceX} ${bendY}`,
    `L ${targetX} ${bendY}`,
    `L ${targetX} ${targetY}`,
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
