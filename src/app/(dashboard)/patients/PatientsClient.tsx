"use client";

import { usePatients } from "@/lib/hooks/use-patients";
import { PatientTable } from "@/components/patients/PatientTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import type { PatientsListResponse } from "@/types";

interface PatientsClientProps {
  entityId: string;
  initialPatients?: PatientsListResponse;
}

export function PatientsClient({ entityId, initialPatients }: PatientsClientProps) {
  const { data, isLoading, error } = usePatients(
    entityId || undefined,
    undefined,
    initialPatients
  );

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
