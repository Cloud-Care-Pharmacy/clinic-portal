"use client";

import { cn } from "@/lib/utils";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface WeekGridSkeletonProps {
  rows?: number;
}

export function WeekGridSkeleton({ rows = 6 }: WeekGridSkeletonProps) {
  return (
    <div className="overflow-x-auto">
      <div
        style={
          {
            "--col-doc": "220px",
            "--col-day": "110px",
            "--row-h": "84px",
            display: "grid",
            gridTemplateColumns:
              "var(--col-doc) repeat(7, minmax(var(--col-day), 1fr))",
            minWidth: "max-content",
          } as React.CSSProperties
        }
      >
        {/* Header row */}
        <div
          className="sticky left-0 top-0 z-[4] border-b border-r px-3.5 py-2.5 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground"
          style={{
            background: "var(--table-header)",
            borderColor: "var(--table-separator)",
          }}
        >
          Doctor
        </div>
        {DOW.map((dow, i) => (
          <div
            key={dow}
            className={cn(
              "sticky top-0 z-[3] border-b px-3.5 py-2.5",
              i < 6 && "border-r"
            )}
            style={{
              background:
                i >= 5
                  ? "color-mix(in srgb, var(--muted) 60%, var(--table-header))"
                  : "var(--table-header)",
              borderColor: "var(--table-separator)",
            }}
          >
            <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              {dow}
            </div>
            <div className="mt-1 h-3.5 w-14 animate-pulse rounded bg-muted" />
          </div>
        ))}

        {/* Data rows */}
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <SkeletonRow key={rowIdx} />
        ))}
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <>
      <div
        className="sticky left-0 z-[2] flex items-center gap-3 border-b border-r px-3 py-2.5"
        style={{
          background: "var(--card)",
          borderColor: "var(--table-separator)",
          height: "var(--row-h)",
        }}
      >
        <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-3.5 w-32 animate-pulse rounded bg-muted" />
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        </div>
      </div>
      {Array.from({ length: 7 }).map((_, dayIdx) => (
        <div
          key={dayIdx}
          className={cn(
            "flex flex-col gap-1.5 border-b p-2",
            dayIdx < 6 && "border-r"
          )}
          style={{
            background:
              dayIdx >= 5
                ? "color-mix(in srgb, var(--muted) 35%, var(--background))"
                : "var(--background)",
            borderColor: "var(--table-separator)",
            height: "var(--row-h)",
          }}
        >
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          <div className="h-2.5 w-12 animate-pulse rounded bg-muted/70" />
        </div>
      ))}
    </>
  );
}
