"use client";

import { use, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { usePatient, useLatestClinicalData } from "@/lib/hooks/use-patients";
import { computeRedFlags } from "@/components/patients/red-flag-utils";
import { useBreadcrumbOverrides } from "@/components/providers/BreadcrumbProvider";
import { PatientHeader } from "./components/PatientHeader";
import { RedFlagAlert } from "./components/RedFlagAlert";
import { OverviewTab } from "./components/tabs/OverviewTab";
import { ConsultationsTab } from "./components/tabs/ConsultationsTab";
import { PrescriptionsTab } from "./components/tabs/PrescriptionsTab";
import { ClinicalHistoryTab } from "./components/tabs/ClinicalHistoryTab";
import { ActivityTab } from "./components/tabs/ActivityTab";
import { NotesTab } from "@/components/patients/NotesTab";
import { DocumentsTab } from "@/components/patients/DocumentsTab";

const VALID_TABS = [
  "overview",
  "consultations",
  "prescriptions",
  "documents",
  "clinical",
  "notes",
  "activity",
] as const;
type TabValue = (typeof VALID_TABS)[number];

interface PatientDetailClientProps {
  id: string;
}

export default function PatientDetailClient({ id }: PatientDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = (searchParams.get("tab") as TabValue) || "overview";
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

  const handleTabChange = useCallback(
    (tab: string | number | null) => {
      if (!tab) return;
      const value = String(tab);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", value);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Patient Header */}
      <PatientHeader
        patient={patient}
        displayName={displayName}
        redFlags={redFlags}
        isLoading={isLoading}
      />

      {/* Red-flag alert */}
      {redFlags?.hasRedFlag && <RedFlagAlert redFlags={redFlags} />}

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList className="overflow-x-auto max-w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="consultations">Consultations</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="clinical">Clinical History</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab
            patient={patient}
            patientId={id}
            onTabChange={(tab) => handleTabChange(tab)}
          />
        </TabsContent>

        <TabsContent value="consultations">
          <ErrorBoundary>
            <ConsultationsTab patientId={id} patientName={displayName} />
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

        <TabsContent value="clinical">
          <ErrorBoundary>
            <ClinicalHistoryTab patientId={id} />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="notes">
          <ErrorBoundary>
            <NotesTab patientId={id} />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="activity">
          <ErrorBoundary>
            <ActivityTab patientId={id} />
          </ErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}
