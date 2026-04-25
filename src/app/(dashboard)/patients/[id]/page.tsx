"use client";

import { use } from "react";
import { usePatient, useLatestClinicalData } from "@/lib/hooks/use-patients";
import { OverviewTab } from "./components/tabs/OverviewTab";
import { useRouter } from "next/navigation";

export default function PatientOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: patientData } = usePatient(id);
  const patient = patientData?.data?.patient;
  const router = useRouter();

  return (
    <OverviewTab
      patient={patient}
      patientId={id}
      onTabChange={(tab) => router.push(`/patients/${id}/${tab}`, { scroll: false })}
    />
  );
}
