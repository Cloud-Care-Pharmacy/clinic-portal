import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {/* Tab list */}
        <Skeleton className="h-10 w-72 rounded-md" />
        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
        {/* Overview + Recent activity */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
          <Skeleton className="col-span-1 lg:col-span-4 h-80 rounded-xl" />
          <Skeleton className="col-span-1 lg:col-span-3 h-80 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
