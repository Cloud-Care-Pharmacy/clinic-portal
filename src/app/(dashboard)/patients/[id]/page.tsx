import { use, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import PatientDetailClient from "./PatientDetailClient";

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-10 w-96" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      }
    >
      <PatientDetailClient id={id} />
    </Suspense>
  );
}
