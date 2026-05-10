"use client";

import { type EdgeProps } from "@xyflow/react";
import {
  ARC_LEFT_DOWN,
  ARC_LENGTH,
  ARC_RIGHT_UP,
  ARROW_DOWN_CHEVRON,
  ARROW_RIGHT_CHEVRON,
  LINE_WIDTH,
  STROKE,
  STROKE_HIGHLIGHTED,
  VERTICAL_SPACE_BETWEEN_STEPS,
  VERTICAL_SPACE_BETWEEN_STEP_AND_LINE,
} from "../lib/canvas-consts";
import type { WfLoopReturnEdgeData } from "../lib/graph-builder";

/**
 * Edge from the last action in a loop body back to the loop step, plus the
 * after-loop continuation drawn on the loop's main spine. Identical geometry
 * to ActivePieces' `loop-return-edge.tsx`:
 *
 *   M sourceX-0.5, sourceY-VSPACE_STEP_AND_LINE
 *   v 1
 *   ARC_LEFT_DOWN  h -horizontalLineLength
 *   ARC_RIGHT_UP   v -verticalLineLength
 *   a15,15 0 0,1 15,-15           (top-left rounded corner)
 *   h horizontalLineLength/2 - 2*ARC
 *   ARROW_RIGHT_CHEVRON           (loop-back arrow tip)
 *
 *   M centerX, sourceY+VSPACE_STEP_AND_LINE+ARC/2
 *   v endLineLength
 *   ARROW_DOWN_CHEVRON            (only when the loop has a next step)
 *
 * `verticalSpan` corresponds to AP's `verticalSpaceBetweenReturnNodeStartAndEnd`
 * (= child bbox height + VSPACE between steps). `horizontalLineLength` is
 * derived from `|sourceX - targetX| - 2*ARC` like AP.
 */
export function LoopReturnEdge({
  sourceX,
  sourceY,
  targetX,
  data,
  id,
}: EdgeProps) {
  const ed = (data ?? {}) as unknown as WfLoopReturnEdgeData;
  const stroke = ed.runActive ? STROKE_HIGHLIGHTED : STROKE;

  const horizontalLineLength = Math.abs(sourceX - targetX) - 2 * ARC_LENGTH;
  const verticalLineLength = ed.verticalSpan;
  const endLineLength =
    VERTICAL_SPACE_BETWEEN_STEPS - 2 * VERTICAL_SPACE_BETWEEN_STEP_AND_LINE + 8;

  const path = [
    `M ${sourceX - 0.5} ${sourceY - VERTICAL_SPACE_BETWEEN_STEP_AND_LINE}`,
    `v 1`,
    `${ARC_LEFT_DOWN} h -${horizontalLineLength}`,
    `${ARC_RIGHT_UP} v -${verticalLineLength}`,
    `a${ARC_LENGTH},${ARC_LENGTH} 0 0,1 ${ARC_LENGTH},-${ARC_LENGTH}`,
    `h ${horizontalLineLength / 2 - 2 * ARC_LENGTH}`,
    ARROW_RIGHT_CHEVRON,
    `M ${sourceX - ARC_LENGTH - horizontalLineLength / 2} ${
      sourceY + VERTICAL_SPACE_BETWEEN_STEP_AND_LINE + ARC_LENGTH / 2
    }`,
    `v${endLineLength}`,
    ed.drawArrowAfterEnd ? ARROW_DOWN_CHEVRON : "",
  ].join(" ");

  return (
    <path
      id={id}
      d={path}
      fill="none"
      stroke={stroke}
      strokeWidth={LINE_WIDTH}
    />
  );
}
