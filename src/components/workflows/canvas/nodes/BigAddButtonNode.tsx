"use client";

import { Plus } from "lucide-react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { BIG_ADD_BUTTON_SIZE, HANDLE_STYLING, NODE_W } from "../lib/canvas-consts";
import { useCanvasContext } from "../lib/canvas-context";
import type { WorkflowNodeData } from "../lib/graph-builder";

/**
 * Large `+` button rendered in place of an empty router branch or loop body.
 */
export function BigAddButtonNode({ data, id }: NodeProps) {
  const node = data as WorkflowNodeData;
  const ctx = useCanvasContext();
  if (node.kind !== "bigAddButton") return null;

  return (
    <div
      style={{ width: NODE_W, height: BIG_ADD_BUTTON_SIZE }}
      className="grid place-items-center"
    >
      <Handle type="target" position={Position.Top} style={HANDLE_STYLING} />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          ctx.onRequestInsert(
            {
              afterFlatIndex: node.afterFlatIndex,
              parentStepName: node.parentStepName,
              branchIndex: node.branchIndex,
            },
            { x: 0, y: 0 }
          );
        }}
        onMouseDown={(e) => e.stopPropagation()}
        style={{ width: BIG_ADD_BUTTON_SIZE, height: BIG_ADD_BUTTON_SIZE }}
        className="pointer-events-auto grid place-items-center rounded-md border border-border bg-popover text-muted-foreground shadow-sm transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
        aria-label="Add step here"
      >
        <Plus className="size-3" />
      </button>
      <Handle type="source" position={Position.Bottom} style={HANDLE_STYLING} />
      {/* Suppress unused-var lint for `id` */}
      {false && <span data-id={id} />}
    </div>
  );
}
