"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { DataGrid, type GridColDef, type GridRowParams } from "@mui/x-data-grid";
import { dataGridSx } from "@/lib/datagrid-theme";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { usePrescriptions, useSyncPrescriptions } from "@/lib/hooks/use-prescriptions";
import {
  PrescriptionDetailSheet,
  formatPrescriptionReference,
} from "@/components/prescriptions/PrescriptionDetailSheet";
import type { ListPrescriptionsResponse, PatientPrescription } from "@/types";

const prescriptionColumns: GridColDef<PatientPrescription>[] = [
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
          className="truncate text-xs text-muted-foreground font-mono"
          title={params.row.parchmentPrescriptionId}
        >
          {params.row.parchmentPrescriptionId}
        </p>
      </div>
    ),
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
  const router = useRouter();
  const { data, isLoading } = usePrescriptions(patientId, initialPrescriptions);
  const sync = useSyncPrescriptions(patientId);
  const [selectedFromRow, setSelectedFromRow] = useState<PatientPrescription | null>(
    null
  );

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

  function openPrescription(prescription: PatientPrescription) {
    setSelectedFromRow(prescription);
    router.push(selectedPrescriptionHref(prescription.id), { scroll: false });
  }

  function handleRefresh() {
    sync.mutate(undefined, {
      onSuccess: (res) => {
        const { synced, created, updated } = res.data.sync;
        toast.success(
          `Synced ${synced} prescriptions (${created} new, ${updated} updated)`
        );
      },
      onError: (err: Error) => toast.error(err.message),
    });
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
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={sync.isPending}
        >
          <RefreshCw className={`size-4 ${sync.isPending ? "animate-spin" : ""}`} />
          {sync.isPending ? "Syncing…" : "Refresh from Parchment"}
        </Button>
      </div>

      {prescriptions.length === 0 ? (
        <EmptyState
          title="No prescriptions"
          description="No prescriptions on record yet. Click ‘Refresh from Parchment’ to pull the latest."
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
    </div>
  );
}
