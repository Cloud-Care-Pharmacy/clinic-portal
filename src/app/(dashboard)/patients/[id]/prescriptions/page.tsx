"use client";

import { use } from "react";
import { PrescriptionsTab } from "../components/tabs/PrescriptionsTab";

export default function PrescriptionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return <PrescriptionsTab patientId={id} />;
}
