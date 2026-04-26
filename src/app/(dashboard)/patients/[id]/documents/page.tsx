"use client";

import { use } from "react";
import { DocumentsTab } from "@/components/patients/DocumentsTab";

export default function DocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ action?: string; selected?: string }>;
}) {
  const { id } = use(params);
  const { action, selected } = use(searchParams);

  return (
    <DocumentsTab
      patientId={id}
      initialAction={action === "upload" ? "upload" : undefined}
      selectedDocumentId={selected}
    />
  );
}
