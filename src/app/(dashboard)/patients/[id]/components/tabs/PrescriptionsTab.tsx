"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataGrid, type GridColDef, type GridRowParams } from "@mui/x-data-grid";
import { dataGridSx } from "@/lib/datagrid-theme";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { usePrescriptions } from "@/lib/hooks/use-prescriptions";
import {
  PrescriptionDetailSheet,
  formatPrescriptionReference,
} from "@/components/prescriptions/PrescriptionDetailSheet";
import type { ParchmentPrescription } from "@/types";

const prescriptionColumns: GridColDef<ParchmentPrescription>[] = [
  {
    field: "id",
    headerName: "Prescription",
    flex: 1,
    minWidth: 190,
    renderCell: (params) => (
      <div className="min-w-0 py-2">
        <p
          className="truncate text-sm font-medium"
          title={formatPrescriptionReference(params.row)}
        >
          {formatPrescriptionReference(params.row)}
        </p>
        <p
          className="truncate text-xs text-muted-foreground"
          title={params.row.product}
        >
          {params.row.product}
        </p>
      </div>
    ),
  },
  {
    field: "medications",
    headerName: "Items",
    width: 90,
    align: "right",
    headerAlign: "right",
    renderCell: (params) => (
      <span className="w-full text-right tabular-nums">
        {params.row.medications.length}
      </span>
    ),
  },
  {
    field: "prescriberName",
    headerName: "Prescribed by",
    width: 160,
    valueFormatter: (value: string | undefined) => value ?? "—",
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
  selectedPrescriptionId?: string;
}

export function PrescriptionsTab({
  patientId,
  selectedPrescriptionId,
}: PrescriptionsTabProps) {
  const router = useRouter();
  const { data, isLoading, error } = usePrescriptions(patientId);
  const [selectedFromRow, setSelectedFromRow] = useState<ParchmentPrescription | null>(
    null
  );

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
  const selected = selectedPrescriptionId
    ? (prescriptions.find(
        (prescription) => prescription.id === selectedPrescriptionId
      ) ?? null)
    : selectedFromRow;

  function selectedPrescriptionHref(prescriptionId: string) {
    return `/patients/${encodeURIComponent(patientId)}/prescriptions?selected=${encodeURIComponent(prescriptionId)}`;
  }

  function clearSelectedPrescription() {
    setSelectedFromRow(null);
    router.replace(`/patients/${encodeURIComponent(patientId)}/prescriptions`, {
      scroll: false,
    });
  }

  function openPrescription(prescription: ParchmentPrescription) {
    setSelectedFromRow(prescription);
    router.push(selectedPrescriptionHref(prescription.id), { scroll: false });
  }

  if (error || prescriptions.length === 0) {
    return (
      <EmptyState
        title="No prescriptions"
        description="This patient has no prescriptions on record."
      />
    );
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <DataGrid
          rows={prescriptions}
          columns={prescriptionColumns}
          autoHeight
          pagination
          disableRowSelectionOnClick
          disableColumnMenu
          columnHeaderHeight={44}
          pageSizeOptions={[10, 25, 50]}
          rowHeight={56}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
            sorting: {
              sortModel: [{ field: "issuedAt", sort: "desc" }],
            },
          }}
          onRowClick={(params: GridRowParams<ParchmentPrescription>) =>
            openPrescription(params.row)
          }
          sx={dataGridSx}
        />
      </div>
      <PrescriptionDetailSheet
        prescription={selected}
        onClose={clearSelectedPrescription}
      />
    </>
  );
}
