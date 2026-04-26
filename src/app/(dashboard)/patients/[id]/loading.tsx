import { Skeleton } from "@/components/ui/skeleton";

export default function PatientDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header card */}
      <Skeleton className="h-40 w-full rounded-2xl" />
      {/* Tab nav */}
      <Skeleton className="h-13 w-96 rounded-[14px]" />
      {/* Tab content */}
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}
