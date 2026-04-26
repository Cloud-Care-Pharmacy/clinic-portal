"use client";

import { usePatients } from "@/lib/hooks/use-patients";
import { PatientTable } from "@/components/patients/PatientTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";

const ENTITY_ID = process.env.NEXT_PUBLIC_DEFAULT_ENTITY_ID ?? "";

export function PatientsClient() {
  const { data, isLoading, error } = usePatients(ENTITY_ID || undefined);

  return (
    <div className="space-y-6">
      <PageHeader title="Patients" />
      <p className="text-sm text-muted-foreground -mt-4">
        Manage your patients and their intake records here.
      </p>
      <ErrorBoundary>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-status-danger-border bg-status-danger-bg p-4 text-status-danger-fg">
            Failed to load patients: {error.message}
          </div>
        ) : (
          <PatientTable patients={data?.data?.patients ?? []} />
        )}
      </ErrorBoundary>
    </div>
  );
}
