"use client";

import { MiniMap } from "@xyflow/react";
import { useMemo } from "react";
import {
  STEP_KIND_CONFIG,
  TRIGGER_KIND_CONFIG,
} from "./lib/node-kind-config";
import type { WorkflowNodeData } from "./lib/graph-builder";

/**
 * Compact minimap with kind-tinted node fills. Only steps + triggers are
 * rendered; auxiliary nodes (add-buttons / end / loop-return) are hidden.
 */
export function CanvasMinimap() {
  const nodeColor = useMemo(
    () => (n: { data?: unknown }) => {
      const data = n.data as WorkflowNodeData | undefined;
      if (!data) return "transparent";
      if (data.kind === "trigger") {
        return TRIGGER_KIND_CONFIG[data.triggerKind].accent;
      }
      if (data.kind === "step") {
        return STEP_KIND_CONFIG[data.stepKind].accent;
      }
      return "transparent";
    },
    [],
  );

  return (
    <MiniMap
      pannable
      zoomable
      nodeColor={nodeColor}
      maskColor="rgba(0,0,0,0.06)"
      style={{
        background: "var(--popover)",
        border: "1px solid var(--border)",
        borderRadius: 8,
      }}
    />
  );
}
