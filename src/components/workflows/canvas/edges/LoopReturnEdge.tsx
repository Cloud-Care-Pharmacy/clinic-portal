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
  const stroke = ed.runActive ? STROKE_HIGHLIGHTED : STROKE;

  // ActivePieces-style loop return: identical geometry whether the body is
  // empty or not. Source = bottom of last child (right rail), target = top of
  // loopReturnNode (left rail). Draw the wraparound rectangle, terminate the
  // back-edge arrow at the spine center, then continue straight down on the
  // spine for the after-loop continuation.
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
