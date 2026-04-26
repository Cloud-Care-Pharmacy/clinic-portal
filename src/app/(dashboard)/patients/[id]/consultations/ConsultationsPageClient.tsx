"use client";

import { ConsultationsTab } from "../components/tabs/ConsultationsTab";
import { usePatientShell } from "../components/PatientShellContext";
import type { ConsultationsListResponse } from "@/types";

export function ConsultationsPageClient({
  patientId,
  selectedConsultationId,
  initialConsultations,
}: {
  patientId: string;
  selectedConsultationId?: string;
  initialConsultations?: ConsultationsListResponse;
}) {
  const { displayName } = usePatientShell();

  return (
    <ConsultationsTab
      patientId={patientId}
      patientName={displayName}
      selectedConsultationId={selectedConsultationId}
      initialConsultations={initialConsultations}
    />
  );
}
