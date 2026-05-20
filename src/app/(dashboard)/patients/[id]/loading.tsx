import { Skeleton } from "@/components/ui/skeleton";

export default function PatientDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header card */}
      <Skeleton className="h-40 w-full rounded-sm" />
      {/* Tab nav */}
      <Skeleton className="h-13 w-96 rounded-sm" />
      {/* Tab content */}
      <Skeleton className="h-64 w-full rounded-sm" />
    </div>
  );
}
