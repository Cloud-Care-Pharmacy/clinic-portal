import { api } from "@/lib/api";
import { NotesTab } from "@/components/patients/NotesTab";

export default async function NotesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ action?: string; selected?: string }>;
}) {
  const initialNotesP = params.then(({ id }) =>
    api.getPatientNotes(id).catch(() => undefined),
  );
  const [{ id }, { action, selected }, initialNotes] = await Promise.all([
    params,
    searchParams,
    initialNotesP,
  ]);

  return (
    <NotesTab
      patientId={id}
      initialAction={action === "new" ? "new" : undefined}
      selectedNoteId={selected}
      initialNotes={initialNotes}
    />
  );
}
