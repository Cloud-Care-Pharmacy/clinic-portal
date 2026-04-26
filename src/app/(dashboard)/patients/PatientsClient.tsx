"use client";

import { useMemo, useState } from "react";
import type { GridSortModel } from "@mui/x-data-grid";
import { usePatients } from "@/lib/hooks/use-patients";
import { PatientTable } from "@/components/patients/PatientTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  PatientPmsStatusFilter,
  PatientsListResponse,
  PatientSortField,
} from "@/types";

const SORT_FIELD_MAP: Record<string, PatientSortField | undefined> = {
  patient_name: "last_name",
  original_email: undefined,
  date_of_birth: "date_of_birth",
  halaxy_patient_id: "halaxy_patient_id",
  created_at: "created_at",
};

interface PatientsClientProps {
  entityId: string;
  initialPatients?: PatientsListResponse;
}

export function PatientsClient({ entityId, initialPatients }: PatientsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState<PatientPmsStatusFilter[]>([]);
  const [sortModel, setSortModel] = useState<GridSortModel>([]);
  const sort = sortModel[0];
  const query = useMemo(
    () => ({
      limit: 50,
      offset: 0,
      search: searchQuery.trim() || undefined,
      pmsStatus: statusFilters.length === 1 ? statusFilters[0] : undefined,
      sort: sort?.field ? SORT_FIELD_MAP[sort.field] : undefined,
      order: sort?.sort ?? undefined,
    }),
    [searchQuery, sort?.field, sort?.sort, statusFilters]
  );
  const { data, isLoading, error } = usePatients(
    entityId || undefined,
    query,
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
          <PatientTable
            patients={data?.data?.patients ?? []}
            total={data?.data?.pagination.total}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilters={statusFilters}
            onStatusFiltersChange={setStatusFilters}
            sortModel={sortModel}
            onSortModelChange={setSortModel}
          />
        )}
      </ErrorBoundary>
    </div>
  );
}
