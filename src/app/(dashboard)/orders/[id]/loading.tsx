import { Skeleton } from "@/components/ui/skeleton";

export default function OrderDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-16 w-full rounded-sm" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Skeleton className="h-72 w-full rounded-sm" />
        <Skeleton className="h-72 w-full rounded-sm" />
      </div>
    </div>
  );
}
