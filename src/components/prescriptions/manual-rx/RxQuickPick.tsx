"use client";

import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";

import type { FormularyItem } from "./data";

export interface RxQuickPickProps {
  item: FormularyItem;
  onAdd: (item: FormularyItem) => void;
}

/** Single quick-add chip for the cessation quick-pick row. */
export function RxQuickPick({ item, onAdd }: RxQuickPickProps) {
  const scheduleClass =
    item.schedule === "S4"
      ? "border-status-warning-border bg-status-warning-bg text-status-warning-fg"
      : "border-status-info-border bg-status-info-bg text-status-info-fg";
  return (
    <button
      type="button"
      onClick={() => onAdd(item)}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-sm border border-border bg-popover px-3 text-xs font-medium text-foreground transition-colors",
        "hover:border-primary/40 hover:bg-muted",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      )}
      aria-label={`Add ${item.name} ${item.strength} ${item.schedule}`}
    >
      <Plus className="size-3" aria-hidden="true" />
      <span>{item.strength}</span>
      <span
        className={cn(
          "rounded-sm border px-1 py-px text-[10px] font-semibold leading-none",
          scheduleClass
        )}
      >
        {item.schedule}
      </span>
    </button>
  );
}
