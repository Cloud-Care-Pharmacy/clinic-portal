import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  /** Number of rows to render */
  rows?: number;
  /** Number of columns to render */
  columns?: number;
  /** Show a header row */
  showHeader?: boolean;
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  showHeader = true,
}: TableSkeletonProps) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-border">
      {showHeader && (
        <div
          className="flex items-center gap-4 border-b border-border px-4"
          style={{ height: 44, backgroundColor: "var(--table-header)" }}
        >
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-3 rounded"
              style={{ width: `${60 + ((i * 23) % 40)}px` }}
            />
          ))}
        </div>
      )}
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="flex items-center gap-4 border-b border-border px-4 last:border-b-0"
          style={{ height: 56 }}
        >
          {Array.from({ length: columns }).map((_, col) => (
            <Skeleton
              key={col}
              className="h-3.5 rounded"
              style={{ width: `${80 + ((col * 37 + row * 13) % 60)}px` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
