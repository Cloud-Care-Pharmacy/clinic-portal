"use client";

import { cn } from "@/lib/utils";

const SWATCHES = [
  {
    label: "Available",
    bg: "var(--status-success-bg)",
    border: "var(--status-success-border)",
  },
  {
    label: "In consultation",
    bg: "var(--status-warning-bg)",
    border: "var(--status-warning-border)",
  },
  {
    label: "On leave",
    bg: "var(--status-danger-bg)",
    border: "var(--status-danger-border)",
  },
  {
    label: "Off duty",
    bg: "var(--background)",
    border: "var(--border)",
  },
];

export function RosterLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground",
        className
      )}
    >
      {SWATCHES.map((s) => (
        <span key={s.label} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block size-2.5  rounded-sm border"
            style={{ background: s.bg, borderColor: s.border }}
          />
          {s.label}
        </span>
      ))}
    </div>
  );
}
