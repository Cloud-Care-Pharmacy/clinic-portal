"use client";

import { use } from "react";
import { OverviewTab } from "./components/tabs/OverviewTab";

export default function PatientOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return <OverviewTab patientId={id} />;
}
