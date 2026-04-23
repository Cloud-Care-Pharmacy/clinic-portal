"use client";

import { use } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { usePrescriptions } from "@/lib/hooks/use-prescriptions";
import { usePatientEmails } from "@/lib/hooks/use-emails";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import type { ParchmentPrescription, EmailRecord } from "@/types";
import { usePatients } from "@/lib/hooks/use-patients";

const ENTITY_ID = process.env.NEXT_PUBLIC_DEFAULT_ENTITY_ID ?? "";

const prescriptionColumns: GridColDef<ParchmentPrescription>[] = [
  { field: "product", headerName: "Product", flex: 1, minWidth: 180 },
  { field: "dosage", headerName: "Dosage", width: 120 },
  {
    field: "issuedAt",
    headerName: "Issued",
    width: 120,
    valueFormatter: (value: string) =>
      new Date(value).toLocaleDateString("en-AU"),
  },
  {
    field: "expiresAt",
    headerName: "Expires",
    width: 120,
    valueFormatter: (value: string) =>
      new Date(value).toLocaleDateString("en-AU"),
  },
  {
    field: "status",
    headerName: "Status",
    width: 120,
    renderCell: (params) => <StatusBadge status={params.value} />,
  },
];

const emailColumns: GridColDef<EmailRecord>[] = [
  { field: "from_address", headerName: "From", flex: 1, minWidth: 200 },
  { field: "subject", headerName: "Subject", flex: 1, minWidth: 200 },
  {
    field: "attachment_count",
    headerName: "Attachments",
    width: 110,
    type: "number",
  },
  {
    field: "received_at",
    headerName: "Received",
    width: 160,
    valueFormatter: (value: string) =>
      new Date(value).toLocaleString("en-AU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
  },
  {
    field: "status",
    headerName: "Status",
    width: 110,
    renderCell: (params) => <StatusBadge status={params.value} />,
  },
];

function PrescriptionsTab({ patientId }: { patientId: string }) {
  const { data, isLoading, error } = usePrescriptions(patientId);

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
      <div className="text-red-600 text-sm">
        Failed to load prescriptions: {error.message}
      </div>
    );

  const prescriptions = data?.data?.prescriptions ?? [];

  if (prescriptions.length === 0) {
    return (
      <EmptyState
        title="No prescriptions"
        description="This patient has no prescriptions on record."
      />
    );
  }

  return (
    <DataGrid
      rows={prescriptions}
      columns={prescriptionColumns}
      autoHeight
      disableRowSelectionOnClick
      pageSizeOptions={[10, 25]}
      initialState={{
        pagination: { paginationModel: { pageSize: 10 } },
      }}
      density="compact"
      sx={{
        "& .MuiDataGrid-cell:focus": { outline: "none" },
        "& .MuiDataGrid-columnHeader:focus": { outline: "none" },
      }}
    />
  );
}

function EmailsTab({ patientId }: { patientId: string }) {
  const { data, isLoading, error } = usePatientEmails(patientId);

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
      <div className="text-red-600 text-sm">
        Failed to load emails: {error.message}
      </div>
    );

  const emails = data?.data?.emails ?? [];

  if (emails.length === 0) {
    return (
      <EmptyState
        title="No documents"
        description="No emails or documents have been received for this patient."
      />
    );
  }

  return (
    <DataGrid
      rows={emails}
      columns={emailColumns}
      autoHeight
      disableRowSelectionOnClick
      pageSizeOptions={[10, 25]}
      initialState={{
        pagination: { paginationModel: { pageSize: 10 } },
      }}
      density="compact"
      sx={{
        "& .MuiDataGrid-cell:focus": { outline: "none" },
        "& .MuiDataGrid-columnHeader:focus": { outline: "none" },
      }}
    />
  );
}

function ConsultationsTab() {
  return (
    <EmptyState
      title="Consultations coming soon"
      description="Connect the consultation backend to see real data here."
    />
  );
}

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: patientsData } = usePatients(ENTITY_ID || undefined);
  const patient = patientsData?.data?.patients?.find((p) => p.id === id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient Detail"
        breadcrumbs={[
          { label: "Patients", href: "/patients" },
          { label: patient?.original_email ?? id },
        ]}
      />

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">
                {patient?.original_email ?? "Loading…"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Generated email:{" "}
                <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                  {patient?.generated_email ?? "—"}
                </code>
              </p>
              <p className="text-sm text-muted-foreground">
                PMS ID: {patient?.halaxy_patient_id ?? "Not linked"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">ID: {id.slice(0, 8)}…</Badge>
              {patient?.created_at && (
                <span className="text-xs text-muted-foreground">
                  Created{" "}
                  {new Date(patient.created_at).toLocaleDateString("en-AU")}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="prescriptions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="consultations">Consultations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Patient Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Email
                  </p>
                  <p className="text-sm">{patient?.original_email ?? "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Entity ID
                  </p>
                  <p className="text-sm">{patient?.entity_id ?? "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Patient ID
                  </p>
                  <p className="text-sm font-mono text-xs">{id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    PMS Patient ID
                  </p>
                  <p className="text-sm">
                    {patient?.halaxy_patient_id || "Not linked"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prescriptions">
          <ErrorBoundary>
            <PrescriptionsTab patientId={id} />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="documents">
          <ErrorBoundary>
            <EmailsTab patientId={id} />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="consultations">
          <ConsultationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
