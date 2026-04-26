"use client";

import { use } from "react";
import { ConsultationsTab } from "../components/tabs/ConsultationsTab";
import { usePatientShell } from "../components/PatientShellContext";

export default function ConsultationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ selected?: string }>;
}) {
  const { id } = use(params);
  const { selected } = use(searchParams);
  const { displayName } = usePatientShell();

  return (
    <ConsultationsTab
      patientId={id}
      patientName={displayName}
      selectedConsultationId={selected}
    />
  );
}
