"use client";

import { use } from "react";
import { ConsultationsTab } from "../components/tabs/ConsultationsTab";
import { usePatientShell } from "../components/PatientShellContext";

export default function ConsultationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { displayName } = usePatientShell();

  return <ConsultationsTab patientId={id} patientName={displayName} />;
}
