"use client";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface MonthGridSkeletonProps {
  weeks?: number;
}

export function MonthGridSkeleton({ weeks = 6 }: MonthGridSkeletonProps) {
  const total = weeks * 7;
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
      }}
    >
      {DOW.map((d) => (
        <div
          key={d}
          className="border-b border-r px-2 py-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground last:border-r-0"
          style={{
            background: "var(--table-header)",
            borderColor: "var(--table-separator)",
          }}
        >
          {d}
        </div>
      ))}
      {Array.from({ length: total }).map((_, i) => {
        const col = i % 7;
        const isWeekend = col >= 5;
        return (
          <div
            key={i}
            className="flex min-h-[120px] flex-col gap-1 border-b border-r px-2.5 py-2 last:border-r-0"
            style={{
              background: isWeekend
                ? "color-mix(in srgb, var(--muted) 35%, var(--background))"
                : "var(--background)",
              borderColor: "var(--table-separator)",
            }}
          >
            <div className="flex items-start justify-between gap-1">
              <div className="h-3.5 w-5 animate-pulse rounded bg-muted" />
              <div className="h-3 w-8 animate-pulse rounded bg-muted/70" />
            </div>
            <div className="mt-1 space-y-1">
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-muted/80" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted/70" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
