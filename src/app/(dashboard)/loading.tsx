import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic dashboard fallback skeleton — only used when a route segment does
 * not provide its own `loading.tsx`. Most sections override this with a
 * layout that matches their actual page.
 */
export default function DashboardFallbackLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
