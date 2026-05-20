"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import type {
  ListPrescriptionsResponse,
  PatientPrescription,
  PatientsListResponse,
} from "@/types";

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
    field: "prescriptionDate",
    headerName: "Date",
    width: 130,
    valueFormatter: (value: string) => new Date(value).toLocaleDateString("en-AU"),
  },
  {
    field: "status",
    headerName: "Status",
    width: 120,
    renderCell: (params) => <StatusBadge status={params.value} />,
  },
];

function PrescriptionGrid({
  patientId,
  initialPrescriptions,
}: {
  patientId: string;
  initialPrescriptions?: ListPrescriptionsResponse;
}) {
  const { data, isLoading, error } = usePrescriptions(
    patientId,
    initialPrescriptions
  );
  const [selected, setSelected] = useState<PatientPrescription | null>(null);

  const prescriptions = data?.data?.prescriptions ?? [];

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

  return (
    <>
      {prescriptions.length === 0 ? (
        <EmptyState
          title="No prescriptions"
          description="No prescriptions on record for this patient yet."
        />
      ) : (
        <div className="rounded-sm border border-border bg-card overflow-hidden">
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
              sorting: { sortModel: [{ field: "prescriptionDate", sort: "desc" }] },
            }}
            onRowClick={(params: GridRowParams<PatientPrescription>) =>
              setSelected(params.row)
            }
            sx={dataGridSx}
          />
        </div>
      )}

      <PrescriptionDetailSheet
        patientId={patientId}
        prescription={selected}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

interface PrescriptionsClientProps {
  entityId: string;
  selectedPatientId: string;
  initialPatients?: PatientsListResponse;
  initialPrescriptions?: ListPrescriptionsResponse;
}

export function PrescriptionsClient({
  entityId,
  selectedPatientId,
  initialPatients,
  initialPrescriptions,
}: PrescriptionsClientProps) {
  const { push } = useRouter();
  const { data: patientsData, isLoading } = usePatients(
    entityId || undefined,
    undefined,
    initialPatients
  );
  const patients = patientsData?.data?.patients ?? [];

  function selectPatient(patientId: string) {
    push(`/prescriptions?patientId=${encodeURIComponent(patientId)}`, {
      scroll: false,
    });
  }

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
                if (v) selectPatient(v);
              }}
            >
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Choose a patient…" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.originalEmail} ({p.id.slice(0, 8)}…)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {selectedPatientId && (
        <ErrorBoundary>
          <div className="space-y-4">
            <PrescriptionGrid
              patientId={selectedPatientId}
              initialPrescriptions={initialPrescriptions}
            />
          </div>
        </ErrorBoundary>
      )}
    </div>
  );
}
