"use client";

import { use } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { ExpandableIconButton } from "@/components/shared/ExpandableIconButton";
import { usePrescriptions } from "@/lib/hooks/use-prescriptions";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { dataGridSx } from "@/lib/utils";
import type { ParchmentPrescription } from "@/types";
import { usePatient, useLatestClinicalData } from "@/lib/hooks/use-patients";
import { NotesTab } from "@/components/patients/NotesTab";
import { ProfileTab } from "@/components/patients/ProfileTab";
import { MedicalHistoryTab } from "@/components/patients/MedicalHistoryTab";
import { DocumentsTab } from "@/components/patients/DocumentsTab";
import { computeRedFlags } from "@/components/patients/red-flag-utils";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin, User, Copy, ShieldAlert, CalendarCheck, Stethoscope } from "lucide-react";
import { useBreadcrumbOverrides } from "@/components/providers/BreadcrumbProvider";
import { useConsultations, useUpdateConsultation } from "@/lib/hooks/use-consultations";
import { NewConsultationSheet } from "@/components/consultations/NewConsultationSheet";
import { ConsultationDetailSheet } from "@/components/consultations/ConsultationDetailSheet";
import type { Consultation, ConsultationType } from "@/types";
import { useEffect, useState } from "react";

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
      <EmptyState
        title="No prescriptions"
        description="This patient has no prescriptions on record."
      />
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
      sx={dataGridSx}
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
  const { data: patientData, isLoading } = usePatient(id);
  const patient = patientData?.data?.patient;
  const { data: latestClinical } = useLatestClinicalData(id);
  const redFlags = latestClinical?.data?.clinicalData
    ? computeRedFlags(latestClinical.data.clinicalData)
    : null;
  const { setOverride, clearOverride } = useBreadcrumbOverrides();

  const fullName = [patient?.first_name, patient?.last_name].filter(Boolean).join(" ");
  const displayName =
    fullName ||
    (patient?.original_email
      ? patient.original_email.split("@")[0].replace(/[._+]/g, " ")
      : "Loading…");

  useEffect(() => {
    if (displayName && displayName !== "Loading…") {
      setOverride(`/patients/${id}`, displayName);
    }
    return () => clearOverride(`/patients/${id}`);
  }, [displayName, id, setOverride, clearOverride]);

  const locationParts = [patient?.city, patient?.state, patient?.postcode].filter(
    Boolean
  );
  const locationText =
    locationParts.length > 0 ? locationParts.join(", ") : "Not available";

  return (
    <div className="space-y-6">
      {/* Compact Profile Header */}
      <Card>
        <CardContent className="px-6 py-4">
          <div className="flex flex-col gap-3">
            {/* Row 1: avatar, name, ID, contact icons */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                  {patient?.first_name ? (
                    patient.first_name.charAt(0).toUpperCase()
                  ) : patient?.original_email ? (
                    patient.original_email.charAt(0).toUpperCase()
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                </div>
                <h2 className="text-lg font-semibold leading-tight">{displayName}</h2>
                <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-2.5 h-8 font-mono text-xs text-muted-foreground">
                  {patient?.halaxy_patient_id ?? id.slice(0, 8)}
                  <Copy className="size-3.5" />
                </span>
                {redFlags?.hasRedFlag && (
                  <Badge variant="destructive" className="gap-1">
                    <ShieldAlert className="size-3" />
                    Red Flag — Doctor Review
                  </Badge>
                )}
                <div className="flex items-center gap-1.5">
                  <ExpandableIconButton
                    icon={<Mail className="size-4" />}
                    label={patient?.original_email ?? ""}
                    ariaLabel={`Email: ${patient?.original_email ?? "Not available"}`}
                    disabled={!patient?.original_email}
                  />
                  <ExpandableIconButton
                    icon={<Phone className="size-4" />}
                    label={patient?.mobile ?? "Not available"}
                    ariaLabel={`Phone: ${patient?.mobile ?? "Not available"}`}
                    disabled={!patient?.mobile}
                  />
                </div>
              </div>
            </div>

            {/* Row 2: location, status, created date */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {locationText}
              </span>
              <StatusBadge status="pending" />
              {patient?.created_at && (
                <span className="text-xs">
                  Created {new Date(patient.created_at).toLocaleDateString("en-AU")}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="notes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="medical-history">Medical History</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="consultations">Consultations</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab patient={patient} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="medical-history">
          <ErrorBoundary>
            <MedicalHistoryTab patientId={id} />
          </ErrorBoundary>
        </TabsContent>

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
            <DocumentsTab patientId={id} />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="consultations">
          <ConsultationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
