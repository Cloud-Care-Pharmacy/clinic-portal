"use client";

import { use } from "react";
import { ClinicalHistoryTab } from "../components/tabs/ClinicalHistoryTab";

export default function ClinicalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ selected?: string; action?: string }>;
}) {
  const { id } = use(params);
  const { selected, action } = use(searchParams);

  return (
    <ClinicalHistoryTab
      patientId={id}
      selectedClinicalId={selected}
      reviewMode={action === "review"}
    />
  );
}
