import { api } from "@/lib/api";
import { NotesTab } from "@/components/patients/NotesTab";

export default async function NotesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ action?: string; selected?: string }>;
}) {
  const [{ id }, { action, selected }] = await Promise.all([params, searchParams]);
  const initialNotes = await api.getPatientNotes(id).catch(() => undefined);

  return (
    <NotesTab
      patientId={id}
      initialAction={action === "new" ? "new" : undefined}
      selectedNoteId={selected}
      initialNotes={initialNotes}
    />
  );
}
