"use client";

import { ConsultationsTab } from "../components/tabs/ConsultationsTab";
import { usePatientShell } from "../components/PatientShellContext";

export function ConsultationsPageClient({
  patientId,
  selectedConsultationId,
}: {
  patientId: string;
  selectedConsultationId?: string;
}) {
  const { displayName } = usePatientShell();

  return (
    <ConsultationsTab
      patientId={patientId}
      patientName={displayName}
      selectedConsultationId={selectedConsultationId}
    />
  );
}
