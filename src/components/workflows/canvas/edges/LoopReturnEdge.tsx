"use client";

import { type EdgeProps } from "@xyflow/react";
import {
  ARC_LEFT_DOWN,
  ARC_LENGTH,
  ARC_RIGHT_UP,
  ARROW_RIGHT_CHEVRON,
  VERTICAL_SPACE_BETWEEN_STEP_AND_LINE,
} from "../lib/canvas-consts";
import { edgePaintForStatus } from "../lib/edge-paint";
import type { WfLoopReturnEdgeData } from "../lib/graph-builder";

/**
 * Edge from the last action in a loop body back to the loop step. Geometry
 * ported from ActivePieces' `loop-return-edge.tsx`:
 *
 *   M sourceX-0.5, sourceY-VSPACE_STEP_AND_LINE
 *   v 1
 *   ARC_LEFT_DOWN  h -horizontalLineLength
 *   ARC_RIGHT_UP   v -verticalLineLength
 *   a15,15 0 0,1 15,-15           (top-left rounded corner)
 *   h horizontalLineLength/2 - 2*ARC
 *   ARROW_RIGHT_CHEVRON           (loop-back arrow tip)
 *
 * Note: AP also draws a continuation stub (`endLineLength`) from the loop
 * spine down to the next step. We omit that here because the chain builder
 * already wires a straight edge from the loop subgraph's exit to the next
 * step — drawing the AP stub on top would double the line.
 *
 * `verticalSpan` corresponds to AP's `verticalSpaceBetweenReturnNodeStartAndEnd`
 * (= child bbox height + VSPACE between steps). `horizontalLineLength` is
 * derived from `|sourceX - targetX| - 2*ARC` like AP.
 */
export function LoopReturnEdge({ sourceX, sourceY, targetX, data, id }: EdgeProps) {
  const ed = (data ?? {}) as unknown as WfLoopReturnEdgeData;
  const paint = edgePaintForStatus(ed.runStatus, ed.runActive);

  const horizontalLineLength = Math.abs(sourceX - targetX) - 2 * ARC_LENGTH;
  const verticalLineLength = ed.verticalSpan;

  const path = [
    `M ${sourceX - 0.5} ${sourceY - VERTICAL_SPACE_BETWEEN_STEP_AND_LINE}`,
    `v 1`,
    `${ARC_LEFT_DOWN} h -${horizontalLineLength}`,
    `${ARC_RIGHT_UP} v -${verticalLineLength}`,
    `a${ARC_LENGTH},${ARC_LENGTH} 0 0,1 ${ARC_LENGTH},-${ARC_LENGTH}`,
    `h ${horizontalLineLength / 2 - 2 * ARC_LENGTH}`,
    ARROW_RIGHT_CHEVRON,
  ].join(" ");

  return (
    <path
      id={id}
      d={path}
      fill="none"
      stroke={paint.stroke}
      strokeWidth={paint.strokeWidth}
      strokeDasharray={paint.strokeDasharray}
      style={paint.style}
    />
  );
}
