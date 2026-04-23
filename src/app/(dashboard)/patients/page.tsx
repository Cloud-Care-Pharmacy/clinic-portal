"use client";

import { usePatients } from "@/lib/hooks/use-patients";
import { PatientTable } from "@/components/patients/PatientTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";

const ENTITY_ID = process.env.NEXT_PUBLIC_DEFAULT_ENTITY_ID ?? "";

export default function PatientsPage() {
  const { data, isLoading, error } = usePatients(ENTITY_ID || undefined);

  return (
    <div className="space-y-6">
      <PageHeader title="Patients" />
      <ErrorBoundary>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            Failed to load patients: {error.message}
          </div>
        ) : (
          <PatientTable patients={data?.data?.patients ?? []} />
        )}
      </ErrorBoundary>
    </div>
  );
}
