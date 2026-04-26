"use client";

import { use } from "react";
import { NotesTab } from "@/components/patients/NotesTab";

export default function NotesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ action?: string; selected?: string }>;
}) {
  const { id } = use(params);
  const { action, selected } = use(searchParams);

  return (
    <NotesTab
      patientId={id}
      initialAction={action === "new" ? "new" : undefined}
      selectedNoteId={selected}
    />
  );
}
