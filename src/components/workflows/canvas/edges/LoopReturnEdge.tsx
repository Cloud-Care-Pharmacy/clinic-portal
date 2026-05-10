"use client";

import { type EdgeProps } from "@xyflow/react";
import {
  ARC_LENGTH,
  LINE_WIDTH,
  STROKE,
  STROKE_HIGHLIGHTED,
  VERTICAL_SPACE_BETWEEN_STEPS,
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

  // ActivePieces-style loop return: draw the return rail and the centered
  // after-loop continuation as one edge. This keeps the End widget attached
  // to the loop's main spine instead of creating an extra off-center edge.
  const distance = Math.abs(sourceX - targetX);
  const horizontalLineLength = Math.max(0, distance - 2 * ARC_LENGTH);
  const direction = sourceX >= targetX ? -1 : 1;
  const bottomY = sourceY + ARC_LENGTH;
  const centerX = sourceX + direction * (horizontalLineLength / 2 + ARC_LENGTH);
  const exitY = sourceY + ARC_LENGTH + VERTICAL_SPACE_BETWEEN_STEPS;
  const arrowX = (targetX + centerX) / 2;
  const arrowY = targetY;

  const d = [
    `M ${sourceX} ${sourceY}`,
    `L ${sourceX} ${bottomY}`,
    `L ${targetX} ${bottomY}`,
    `L ${targetX} ${targetY}`,
    `L ${centerX} ${targetY}`,
    `M ${centerX} ${bottomY}`,
    `L ${centerX} ${exitY}`,
  ].join(" ");

  const stroke = ed.runActive ? STROKE_HIGHLIGHTED : STROKE;

  return (
    <>
      <path
        id={id}
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={LINE_WIDTH}
      />
      <path
        d={`M ${arrowX - 5} ${arrowY - 5} L ${arrowX} ${arrowY} L ${
          arrowX - 5
        } ${arrowY + 5}`}
        fill="none"
        stroke={stroke}
        strokeWidth={LINE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );
}
