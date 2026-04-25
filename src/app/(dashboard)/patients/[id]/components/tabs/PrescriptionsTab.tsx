"use client";

import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { dataGridSx } from "@/lib/datagrid-theme";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { usePrescriptions } from "@/lib/hooks/use-prescriptions";
import type { ParchmentPrescription } from "@/types";

const prescriptionColumns: GridColDef<ParchmentPrescription>[] = [
  { field: "product", headerName: "Medication", flex: 1, minWidth: 180 },
  { field: "dosage", headerName: "Strength", width: 120 },
  {
    field: "quantity",
    headerName: "Schedule",
    width: 120,
    valueFormatter: (value: number | undefined) => (value ? `${value} tabs` : "—"),
  },
  {
    field: "repeats",
    headerName: "Refills",
    width: 100,
    valueFormatter: (value: number | undefined) => value ?? 0,
  },
  {
    field: "status",
    headerName: "Status",
    width: 120,
    renderCell: (params) => <StatusBadge status={params.value} />,
  },
  {
    field: "issuedAt",
    headerName: "Issued",
    width: 130,
    valueFormatter: (value: string) =>
      new Date(value).toLocaleDateString("en-AU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
  },
];

interface PrescriptionsTabProps {
  patientId: string;
}

export function PrescriptionsTab({ patientId }: PrescriptionsTabProps) {
  const { data, isLoading, error } = usePrescriptions(patientId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  const prescriptions = data?.data?.prescriptions ?? [];

  if (error || prescriptions.length === 0) {
    return (
      <EmptyState
        title="No prescriptions"
        description="This patient has no prescriptions on record."
      />
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <DataGrid
        rows={prescriptions}
        columns={prescriptionColumns}
        autoHeight
        disableRowSelectionOnClick
        pageSizeOptions={[10, 25]}
        rowHeight={56}
        initialState={{
          pagination: { paginationModel: { pageSize: 10 } },
          sorting: {
            sortModel: [{ field: "issuedAt", sort: "desc" }],
          },
        }}
        sx={dataGridSx}
      />
    </div>
  );
}
