import { Skeleton } from "@/components/ui/skeleton";

interface CardSkeletonProps {
  /** Number of cards to render */
  count?: number;
  /** Height of each card */
  height?: number;
}

export function CardSkeleton({ count = 4, height = 128 }: CardSkeletonProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card p-5 space-y-3"
          style={{ minHeight: height }}
        >
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-6 w-24 rounded" />
          <Skeleton className="h-3 w-32 rounded" />
        </div>
      ))}
    </div>
  );
}
