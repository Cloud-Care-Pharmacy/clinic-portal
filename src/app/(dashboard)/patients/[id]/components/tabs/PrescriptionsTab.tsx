"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { DataGrid, type GridColDef, type GridRowParams } from "@mui/x-data-grid";
import { dataGridSx } from "@/lib/datagrid-theme";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { usePrescriptions } from "@/lib/hooks/use-prescriptions";
import {
  PrescriptionDetailSheet,
  formatPrescriptionReference,
} from "@/components/prescriptions/PrescriptionDetailSheet";
import { WritePrescriptionDialog } from "@/components/prescriptions/WritePrescriptionDialog";
import type { ListPrescriptionsResponse, PatientPrescription } from "@/types";

const prescriptionColumns: GridColDef<PatientPrescription>[] = [
  {
    field: "id",
    headerName: "Prescription",
    flex: 1,
    minWidth: 190,
    renderCell: (params) => {
      const secondary = params.row.consultationId
        ? `Consultation ${params.row.consultationId.slice(0, 8)}…`
        : "Patient-initiated";
      return (
        <div className="min-w-0 py-2">
          <p
            className="truncate text-sm font-medium"
            title={formatPrescriptionReference(params.row)}
          >
            {formatPrescriptionReference(params.row)}
          </p>
          <p
            className="truncate text-xs text-muted-foreground font-mono"
            title={secondary}
          >
            {secondary}
          </p>
        </div>
      );
    },
  },
  {
    field: "prescriberName",
    headerName: "Prescribed by",
    width: 180,
    valueFormatter: (value: string | null | undefined) => value ?? "—",
  },
  {
    field: "status",
    headerName: "Status",
    width: 120,
    renderCell: (params) => <StatusBadge status={params.value} />,
  },
  {
    field: "prescriptionDate",
    headerName: "Date",
    width: 140,
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
  initialPrescriptions?: ListPrescriptionsResponse;
}

export function PrescriptionsTab({
  patientId,
  selectedPrescriptionId,
  initialPrescriptions,
}: PrescriptionsTabProps) {
  const { push, replace } = useRouter();
  const { data, isLoading } = usePrescriptions(patientId, initialPrescriptions);
  const [selectedFromRow, setSelectedFromRow] = useState<PatientPrescription | null>(
    null
  );
  const [writeOpen, setWriteOpen] = useState(false);

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
    replace(`/patients/${encodeURIComponent(patientId)}/prescriptions`, {
      scroll: false,
    });
  }

  function openPrescription(prescription: PatientPrescription) {
    setSelectedFromRow(prescription);
    push(selectedPrescriptionHref(prescription.id), { scroll: false });
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setWriteOpen(true)}>
          <Plus className="size-4" />
          New prescription
        </Button>
      </div>

      {prescriptions.length === 0 ? (
        <EmptyState
          title="No prescriptions"
          description="No prescriptions on record yet. Click ‘New prescription’ to write one."
        />
      ) : (
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
                sortModel: [{ field: "prescriptionDate", sort: "desc" }],
              },
            }}
            onRowClick={(params: GridRowParams<PatientPrescription>) =>
              openPrescription(params.row)
            }
            sx={dataGridSx}
          />
        </div>
      )}

      <PrescriptionDetailSheet
        patientId={patientId}
        prescription={selected}
        onClose={clearSelectedPrescription}
      />

      <WritePrescriptionDialog
        open={writeOpen}
        onOpenChange={setWriteOpen}
        patientId={patientId}
      />
    </div>
  );
}
