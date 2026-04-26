import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function ProfileLoading() {
  return (
    <div className="space-y-6">
      {/* Profile header card */}
      <Card>
        <CardContent className="px-6 py-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-9 w-9 rounded-md" />
                <Skeleton className="h-9 w-9 rounded-md" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="flex items-center gap-3 border-t pt-3">
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-1.5 flex-1 rounded-full" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Skeleton className="h-10 w-72 rounded-md" />

      {/* Tab content */}
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}
