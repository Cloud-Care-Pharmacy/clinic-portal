"use client";

import { use } from "react";
import { NotesTab } from "@/components/patients/NotesTab";

export default function NotesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return <NotesTab patientId={id} />;
}
