"use client";

import { EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";
import {
  ARC_LENGTH,
  ARC_LEFT_DOWN,
  ARC_RIGHT_DOWN,
  LABEL_HEIGHT,
  LINE_WIDTH,
  STROKE,
  STROKE_HIGHLIGHTED,
} from "../lib/canvas-consts";
import { AddButton } from "./AddButton";
import { useCanvasContext } from "../lib/canvas-context";
import type { WfRouterStartEdgeData } from "../lib/graph-builder";

/**
 * Edge from a router step out to a single branch. Drawn as: vertical down,
 * horizontal jog (right or left depending on branch position), arc, vertical
 * down to branch head. A branch label is rendered above the arc.
 */
export function RouterStartEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  id,
}: EdgeProps) {
  const ed = (data ?? {}) as unknown as WfRouterStartEdgeData;
  const ctx = useCanvasContext();

  const dx = targetX - sourceX;
  const goesRight = dx >= 0;
  const arc = goesRight ? ARC_RIGHT_DOWN : ARC_LEFT_DOWN;
  const horizontalLen = Math.max(0, Math.abs(dx) - ARC_LENGTH);
  const horizontalSign = goesRight ? 1 : -1;

  // Path:
  //   from source go down a tiny bit,
  //   horizontal toward target column,
  //   arc into vertical,
  //   straight down to target.
  const verticalAfterArc =
    targetY - sourceY - LABEL_HEIGHT - ARC_LENGTH * 2;
  const d = [
    `M ${sourceX} ${sourceY}`,
    `v ${LABEL_HEIGHT}`,
    `h ${horizontalSign * horizontalLen}`,
    arc,
    `v ${Math.max(0, verticalAfterArc)}`,
  ].join(" ");

  const stroke = ed.runActive ? STROKE_HIGHLIGHTED : STROKE;
  const labelX = sourceX + horizontalSign * (horizontalLen / 2);
  const labelY = sourceY + LABEL_HEIGHT / 2;

  return (
    <>
      <path
        id={id}
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={LINE_WIDTH}
        markerEnd="url(#wf-arrow)"
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
          className="nodrag nopan pointer-events-none rounded-md border border-border bg-popover px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shadow-sm"
        >
          {ed.branchLabel}
        </div>
      </EdgeLabelRenderer>
      {ed.insertion && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${targetX}px, ${
                targetY - 16
              }px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan"
          >
            <AddButton
              onClick={() =>
                ctx.onRequestInsert(ed.insertion!, { x: targetX, y: targetY })
              }
            />
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
