"use client";

import { use } from "react";
import { usePatient } from "@/lib/hooks/use-patients";
import { ConsultationsTab } from "../components/tabs/ConsultationsTab";

export default function ConsultationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: patientData } = usePatient(id);
  const patient = patientData?.data?.patient;

  const fullName = [patient?.first_name, patient?.last_name]
    .filter(Boolean)
    .join(" ");
  const displayName =
    fullName ||
    (patient?.original_email
      ? patient.original_email.split("@")[0].replace(/[._+]/g, " ")
      : "");

  return <ConsultationsTab patientId={id} patientName={displayName} />;
}
