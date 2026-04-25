"use client";

import { use } from "react";
import { ClinicalHistoryTab } from "../components/tabs/ClinicalHistoryTab";

export default function ClinicalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return <ClinicalHistoryTab patientId={id} />;
}
