"use client";

import { EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";
import { useMemo } from "react";
import { LINE_WIDTH, STROKE, STROKE_HIGHLIGHTED } from "../lib/canvas-consts";
import { AddButton } from "./AddButton";
import { useCanvasContext } from "../lib/canvas-context";
import type { WfStraightEdgeData } from "../lib/graph-builder";

/**
 * A vertical line connecting two nodes. The line is drawn from the source's
 * bottom edge to the target's top edge. An inline `+` button is centered on
 * the line and opens the node palette at the supplied insertion location.
 */
export function StraightLineEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  id,
}: EdgeProps) {
  const ed = (data ?? {}) as unknown as WfStraightEdgeData;
  const ctx = useCanvasContext();

  // Use a polyline if x diverges (allow horizontal jog when nodes are not
  // perfectly aligned, which can happen at the end of a router branch).
  const path = useMemo(() => {
    if (Math.abs(targetX - sourceX) < 0.5) {
      return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
    }
    const midY = (sourceY + targetY) / 2;
    return `M ${sourceX} ${sourceY} L ${sourceX} ${midY} L ${targetX} ${midY} L ${targetX} ${targetY}`;
  }, [sourceX, sourceY, targetX, targetY]);

  const stroke = ed.runActive ? STROKE_HIGHLIGHTED : STROKE;
  const labelX = (sourceX + targetX) / 2;
  const labelY = (sourceY + targetY) / 2;

  return (
    <>
      <path
        id={id}
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={LINE_WIDTH}
        markerEnd={ed.drawArrowHead ? "url(#wf-arrow)" : undefined}
      />
      {!ed.hideAddButton && ed.insertion && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan"
          >
            <AddButton
              onClick={() =>
                ctx.onRequestInsert(ed.insertion!, { x: labelX, y: labelY })
              }
            />
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
