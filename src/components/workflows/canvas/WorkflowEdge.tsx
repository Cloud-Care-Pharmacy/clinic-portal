"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";

export function WorkflowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  data,
}: EdgeProps) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const runActive = (data as { runActive?: boolean } | undefined)?.runActive;
  const stroke = runActive ? "var(--primary)" : "var(--input)";

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke,
          strokeWidth: runActive ? 2 : 1.5,
          strokeDasharray: runActive ? "6 4" : undefined,
          fill: "none",
        }}
        markerEnd="url(#wf-arrow)"
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              background: "var(--popover)",
              border: "1px solid var(--border)",
              color: "var(--muted-foreground)",
            }}
            className="pointer-events-none absolute rounded-full px-2 py-px text-[10px] font-medium"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
