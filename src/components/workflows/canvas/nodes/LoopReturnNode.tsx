"use client";

import { Handle, Position } from "@xyflow/react";
import { HANDLE_STYLING, NODE_W } from "../lib/canvas-consts";

/**
 * Invisible spacer used by the loop graph to anchor the right-side return
 * arc. Has no visual representation but participates in bounding-box
 * calculations.
 */
export function LoopReturnNode() {
  return (
    <div
      style={{ width: NODE_W, height: 1 }}
      className="pointer-events-none bg-transparent"
    >
      <Handle type="target" position={Position.Top} style={HANDLE_STYLING} />
      <Handle type="source" position={Position.Bottom} style={HANDLE_STYLING} />
    </div>
  );
}
