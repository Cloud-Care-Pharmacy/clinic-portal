"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Flag } from "lucide-react";
import { HANDLE_STYLING } from "../lib/canvas-consts";
import type { WorkflowNodeData } from "../lib/graph-builder";

/**
 * Terminal anchor for a chain. Renders nothing visually unless `showWidget`
 * is true, in which case it shows a small "End" pill (centered on the node).
 */
export function GraphEndNode({ data }: NodeProps) {
  const node = data as WorkflowNodeData;
  if (node.kind !== "graphEnd") return null;

  return (
    <div className="relative size-px">
      <Handle type="target" position={Position.Top} style={HANDLE_STYLING} />
      {node.showWidget && (
        <div
          style={{
            transform: "translate(-50%, 8px)",
          }}
          className="pointer-events-none absolute left-0 top-0 inline-flex items-center gap-1 rounded-md border border-border bg-popover px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shadow-sm"
        >
          <Flag className="size-2.5" />
          End
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={HANDLE_STYLING} />
    </div>
  );
}
