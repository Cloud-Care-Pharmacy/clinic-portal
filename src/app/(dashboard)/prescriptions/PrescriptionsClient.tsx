"use client";

import { useState } from "react";
import { DataGrid, type GridColDef, type GridRowParams } from "@mui/x-data-grid";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { usePatients } from "@/lib/hooks/use-patients";
import { usePrescriptions } from "@/lib/hooks/use-prescriptions";
import { dataGridSx } from "@/lib/datagrid-theme";
import {
  PrescriptionDetailSheet,
  formatPrescriptionReference,
} from "@/components/prescriptions/PrescriptionDetailSheet";
import type { ParchmentPrescription } from "@/types";

const ENTITY_ID = process.env.NEXT_PUBLIC_DEFAULT_ENTITY_ID ?? "";

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
    field: "issuedAt",
    headerName: "Issued",
    width: 120,
    valueFormatter: (value: string) => new Date(value).toLocaleDateString("en-AU"),
  },
  {
    field: "expiresAt",
    headerName: "Expires",
    width: 120,
    valueFormatter: (value: string) => new Date(value).toLocaleDateString("en-AU"),
  },
  {
    field: "status",
    headerName: "Status",
    width: 120,
    renderCell: (params) => <StatusBadge status={params.value} />,
  },
];

function PrescriptionGrid({ patientId }: { patientId: string }) {
  const { data, isLoading, error } = usePrescriptions(patientId);
  const [selected, setSelected] = useState<ParchmentPrescription | null>(null);

  if (isLoading)
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );

  if (error)
    return (
      <div className="text-destructive text-sm">
        Failed to load prescriptions: {error.message}
      </div>
    );

  const prescriptions = data?.data?.prescriptions ?? [];

  if (prescriptions.length === 0)
    return (
      <EmptyState
        title="No prescriptions"
        description="This patient has no prescriptions on record."
      />
    );

  return (
    <>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <DataGrid
          rows={prescriptions}
          columns={prescriptionColumns}
          autoHeight
          disableRowSelectionOnClick
          disableColumnMenu
          columnHeaderHeight={44}
          pageSizeOptions={[10, 25]}
          rowHeight={56}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          onRowClick={(params: GridRowParams<ParchmentPrescription>) =>
            setSelected(params.row)
          }
          sx={dataGridSx}
        />
      </div>
      <PrescriptionDetailSheet
        prescription={selected}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

export function PrescriptionsClient() {
  const { data: patientsData, isLoading } = usePatients(ENTITY_ID || undefined);
  const patients = patientsData?.data?.patients ?? [];
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");

  return (
    <div className="space-y-6">
      <PageHeader title="Prescriptions" />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Patient</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-10 w-64" />
          ) : patients.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No patients found. Add a patient first.
            </p>
          ) : (
            <Select
              value={selectedPatientId}
              onValueChange={(v) => {
                if (v) setSelectedPatientId(v);
              }}
            >
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Choose a patient…" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.original_email} ({p.id.slice(0, 8)}…)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {selectedPatientId && (
        <ErrorBoundary>
          <PrescriptionGrid patientId={selectedPatientId} />
        </ErrorBoundary>
      )}
    </div>
  );
}
