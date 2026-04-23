"use client";

import { use } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { usePrescriptions } from "@/lib/hooks/use-prescriptions";
import { usePatientEmails } from "@/lib/hooks/use-emails";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import type { ParchmentPrescription, EmailRecord } from "@/types";
import { usePatients } from "@/lib/hooks/use-patients";
import { NotesTab } from "@/components/patients/NotesTab";
import { Mail, Phone, MapPin, Calendar, User, CreditCard, Hash } from "lucide-react";

const ENTITY_ID = process.env.NEXT_PUBLIC_DEFAULT_ENTITY_ID ?? "";

const prescriptionColumns: GridColDef<ParchmentPrescription>[] = [
  { field: "product", headerName: "Product", flex: 1, minWidth: 180 },
  { field: "dosage", headerName: "Dosage", width: 120 },
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
        border: "none",
        "& .MuiDataGrid-cell:focus": { outline: "none" },
        "& .MuiDataGrid-columnHeader:focus": { outline: "none" },
        "& .MuiDataGrid-columnHeaders": { backgroundColor: "var(--secondary)" },
        "& .MuiDataGrid-row:hover": { backgroundColor: "var(--secondary)" },
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
      <div className="text-red-600 text-sm">Failed to load emails: {error.message}</div>
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
        border: "none",
        "& .MuiDataGrid-cell:focus": { outline: "none" },
        "& .MuiDataGrid-columnHeader:focus": { outline: "none" },
        "& .MuiDataGrid-columnHeaders": { backgroundColor: "var(--secondary)" },
        "& .MuiDataGrid-row:hover": { backgroundColor: "var(--secondary)" },
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

function DetailField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm truncate">{value || "Not available"}</p>
      </div>
    </div>
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
      {/* Profile Header — always visible */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-6">
            {/* Top row: name + meta */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">
                    {patient?.original_email ?? "Loading…"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Generated email:{" "}
                    <code className="text-xs bg-secondary px-1 py-0.5 rounded">
                      {patient?.generated_email ?? "—"}
                    </code>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">ID: {id.slice(0, 8)}…</Badge>
                {patient?.created_at && (
                  <span className="text-xs text-muted-foreground">
                    Created {new Date(patient.created_at).toLocaleDateString("en-AU")}
                  </span>
                )}
              </div>
            </div>

            {/* Detail fields grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <DetailField
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                value={patient?.original_email}
              />
              <DetailField
                icon={<Phone className="h-4 w-4" />}
                label="Phone"
                value={null}
              />
              <DetailField
                icon={<Calendar className="h-4 w-4" />}
                label="Date of Birth"
                value={null}
              />
              <DetailField
                icon={<User className="h-4 w-4" />}
                label="Gender"
                value={null}
              />
              <DetailField
                icon={<MapPin className="h-4 w-4" />}
                label="Address"
                value={null}
              />
              <DetailField
                icon={<CreditCard className="h-4 w-4" />}
                label="Medicare Number"
                value={null}
              />
              <DetailField
                icon={<Hash className="h-4 w-4" />}
                label="PMS Patient ID"
                value={patient?.halaxy_patient_id}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="notes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="consultations">Consultations</TabsTrigger>
        </TabsList>

        <TabsContent value="notes">
          <ErrorBoundary>
            <NotesTab patientId={id} />
          </ErrorBoundary>
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
