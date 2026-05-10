"use client";

import { Plus } from "lucide-react";

interface EmptyCanvasProps {
  onAddTrigger: () => void;
}

export function EmptyCanvas({ onAddTrigger }: EmptyCanvasProps) {
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{
        backgroundColor: "var(--background)",
        backgroundImage:
          "radial-gradient(circle, var(--border) 1.4px, transparent 1.4px)",
        backgroundSize: "24px 24px",
      }}
    >
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onAddTrigger}
          className="group grid size-24 place-items-center rounded-2xl border-2 border-dashed border-input transition-colors hover:border-primary"
        >
          <Plus className="size-7 text-muted-foreground transition-colors group-hover:text-primary" />
        </button>
        <span className="text-sm font-semibold text-muted-foreground">
          Add first step…
        </span>
      </div>
    </div>
  );
}
