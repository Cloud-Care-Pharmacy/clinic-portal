"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADD_BUTTON_SIZE } from "../lib/canvas-consts";

interface AddButtonProps {
  onClick: () => void;
  className?: string;
  /** Hide visually (still occupies layout). */
  hidden?: boolean;
  size?: number;
}

/**
 * Inline `+` button rendered inside an edge via `<EdgeLabelRenderer>`. Stops
 * propagation so the canvas doesn't deselect the active step.
 */
export function AddButton({
  onClick,
  className,
  hidden,
  size = ADD_BUTTON_SIZE,
}: AddButtonProps) {
  if (hidden) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      style={{ width: size, height: size }}
      className={cn(
        "pointer-events-auto grid place-items-center rounded-md",
        "border border-border bg-popover text-muted-foreground shadow-sm",
        "transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground",
        className,
      )}
      aria-label="Insert step here"
    >
      <Plus className="size-3" />
    </button>
  );
}
