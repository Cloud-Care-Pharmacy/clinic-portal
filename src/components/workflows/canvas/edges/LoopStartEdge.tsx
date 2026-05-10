"use client";

import { EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";
import {
  ARC_LENGTH,
  ADD_BUTTON_SIZE,
  LINE_WIDTH,
  STROKE,
  STROKE_HIGHLIGHTED,
} from "../lib/canvas-consts";
import { AddButton } from "./AddButton";
import { useCanvasContext } from "../lib/canvas-context";
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
  const ctx = useCanvasContext();

  // ActivePieces-style loop entry: down from the loop card, rounded across to
  // the body rail, then down into the first body node / add target.
  const bendY = sourceY + Math.max(32, (targetY - sourceY) / 2 - ARC_LENGTH);
  const radius = Math.min(ARC_LENGTH, Math.abs(targetX - sourceX) / 2);
  const goesRight = targetX >= sourceX;
  const sign = goesRight ? 1 : -1;
  const path = [
    `M ${sourceX} ${sourceY}`,
    `L ${sourceX} ${bendY}`,
    `q 0 ${radius} ${sign * radius} ${radius}`,
    `L ${targetX - sign * radius} ${bendY + radius}`,
    `q ${sign * radius} 0 ${sign * radius} ${radius}`,
    `L ${targetX} ${targetY}`,
  ].join(" ");

  const stroke = ed.runActive ? STROKE_HIGHLIGHTED : STROKE;
  const buttonY = bendY + radius + (targetY - bendY - radius) / 2;

  return (
    <>
      <path
        id={id}
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={LINE_WIDTH}
        markerEnd="url(#wf-arrow)"
      />
      {!ed.isLoopEmpty && ed.insertion && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${targetX}px, ${buttonY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan"
          >
            <AddButton
              size={ADD_BUTTON_SIZE}
              onClick={() =>
                ctx.onRequestInsert(ed.insertion!, { x: targetX, y: buttonY })
              }
            />
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
