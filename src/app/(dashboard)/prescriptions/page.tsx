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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { usePatients } from "@/lib/hooks/use-patients";
import { usePrescriptions } from "@/lib/hooks/use-prescriptions";
import { dataGridSx } from "@/lib/datagrid-theme";
import type { PatientMapping, ParchmentPrescription } from "@/types";

const ENTITY_ID = process.env.NEXT_PUBLIC_DEFAULT_ENTITY_ID ?? "";

const prescriptionColumns: GridColDef<ParchmentPrescription>[] = [
  { field: "product", headerName: "Product", flex: 1, minWidth: 180 },
  { field: "dosage", headerName: "Dosage", width: 120 },
  { field: "prescriberName", headerName: "Prescribed By", width: 160 },
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

function PrescriptionDetail({
  prescription,
  onClose,
}: {
  prescription: ParchmentPrescription | null;
  onClose: () => void;
}) {
  if (!prescription) return null;

  return (
    <Sheet open={!!prescription} onOpenChange={() => onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{prescription.product}</SheetTitle>
          <SheetDescription>Prescription detail</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 mt-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Dosage</p>
            <p>{prescription.dosage}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Status</p>
            <StatusBadge status={prescription.status} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Prescribed By</p>
            <p>{prescription.prescriberName ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Issued</p>
            <p>{new Date(prescription.issuedAt).toLocaleDateString("en-AU")}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Expires</p>
            <p>{new Date(prescription.expiresAt).toLocaleDateString("en-AU")}</p>
          </div>
          {prescription.notes && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Notes</p>
              <p className="text-sm">{prescription.notes}</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

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
          checkboxSelection
          disableRowSelectionOnClick
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
      <PrescriptionDetail prescription={selected} onClose={() => setSelected(null)} />
    </>
  );
}

export default function PrescriptionsPage() {
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
