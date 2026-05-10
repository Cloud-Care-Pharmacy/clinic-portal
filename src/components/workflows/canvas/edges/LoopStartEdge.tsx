"use client";

import { EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";
import {
  ADD_BUTTON_SIZE,
  ARC_LENGTH,
  ARC_RIGHT,
  ARC_RIGHT_DOWN,
  ARROW_DOWN_CHEVRON,
  VERTICAL_SPACE_BETWEEN_STEPS,
  VERTICAL_SPACE_BETWEEN_STEP_AND_LINE,
} from "../lib/canvas-consts";
import { AddButton } from "./AddButton";
import { useCanvasContext } from "../lib/canvas-context";
import { edgePaintForStatus } from "../lib/edge-paint";
import type { WfLoopStartEdgeData } from "../lib/graph-builder";

/**
 * Edge from a loop step down to the first action in its body. Identical
 * geometry to ActivePieces' `loop-start-edge.tsx`:
 *
 *   M sourceX,startY
 *   v verticalLineLength/2
 *   ARC_RIGHT_DOWN  h horizontalLineLength
 *   ARC_RIGHT       v verticalLineLength
 *   ARROW_DOWN_CHEVRON  (only when the body is non-empty)
 *
 * The inline "+" button sits where the path turns the corner and continues
 * straight down — at `(sourceX + horizontalLineLength + 2*ARC, startY +
 * verticalLineLength + ARC)`.
 */
export function LoopStartEdge({
  sourceX,
  sourceY,
  targetX,
  data,
  id,
}: EdgeProps) {
  const ed = (data ?? {}) as unknown as WfLoopStartEdgeData;
  const ctx = useCanvasContext();

  const startY = sourceY + VERTICAL_SPACE_BETWEEN_STEP_AND_LINE;
  const verticalLineLength =
    VERTICAL_SPACE_BETWEEN_STEPS - 2 * VERTICAL_SPACE_BETWEEN_STEP_AND_LINE;
  const horizontalLineLength = Math.abs(targetX - sourceX) - 2 * ARC_LENGTH;

  const path = [
    `M ${sourceX} ${startY}`,
    `v${verticalLineLength / 2}`,
    `${ARC_RIGHT_DOWN} h${horizontalLineLength}`,
    `${ARC_RIGHT} v${verticalLineLength}`,
    ed.isLoopEmpty ? "" : ARROW_DOWN_CHEVRON,
  ].join(" ");

  const paint = edgePaintForStatus(ed.runStatus, ed.runActive);

  const buttonX =
    sourceX -
    ADD_BUTTON_SIZE / 2 +
    horizontalLineLength +
    2 * ARC_LENGTH;
  const buttonY = startY + verticalLineLength + ARC_LENGTH;

  return (
    <>
      <path
        id={id}
        d={path}
        fill="none"
        stroke={paint.stroke}
        strokeWidth={paint.strokeWidth}
        strokeDasharray={paint.strokeDasharray}
        style={paint.style}
      />
      {!ed.isLoopEmpty && ed.insertion && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(0, 0) translate(${buttonX}px, ${buttonY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan"
          >
            <AddButton
              size={ADD_BUTTON_SIZE}
              onClick={() =>
                ctx.onRequestInsert(ed.insertion!, {
                  x: buttonX + ADD_BUTTON_SIZE / 2,
                  y: buttonY + ADD_BUTTON_SIZE / 2,
                })
              }
            />
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
