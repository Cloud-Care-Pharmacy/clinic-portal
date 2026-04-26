"use client";

import { use } from "react";
import { PrescriptionsTab } from "../components/tabs/PrescriptionsTab";

export default function PrescriptionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ selected?: string }>;
}) {
  const { id } = use(params);
  const { selected } = use(searchParams);

  return <PrescriptionsTab patientId={id} selectedPrescriptionId={selected} />;
}
