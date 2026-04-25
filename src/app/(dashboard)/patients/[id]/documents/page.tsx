"use client";

import { use } from "react";
import { DocumentsTab } from "@/components/patients/DocumentsTab";

export default function DocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return <DocumentsTab patientId={id} />;
}
