import type {
  PatientNote,
  PatientNotesResponse,
  NoteCategory,
  UpdatePatientNotePayload,
} from "@/types";
import {
  queryOptions,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

// ---- Fetch helpers (via auth proxy → prescription-gateway) ----

function notesUrl(patientId: string, noteId?: string) {
  const base = `/api/proxy/patients/${encodeURIComponent(patientId)}/notes`;
  return noteId ? `${base}/${encodeURIComponent(noteId)}` : base;
}

async function fetchNotes(patientId: string): Promise<PatientNotesResponse> {
  const res = await fetch(notesUrl(patientId));
  if (!res.ok) throw new Error("Failed to fetch notes");
  return res.json();
}

async function createNote(
  patientId: string,
  body: {
    title: string;
    content: string;
    category: NoteCategory;
    isPinned: boolean;
    authorName: string;
    authorRole: string;
  }
): Promise<{ success: boolean; data: PatientNote }> {
  const res = await fetch(notesUrl(patientId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to create note" }));
    throw new Error(err.error ?? "Failed to create note");
  }
  return res.json();
}

async function togglePin(
  patientId: string,
  noteId: string
): Promise<{ success: boolean; data: PatientNote }> {
  const res = await fetch(notesUrl(patientId, noteId), { method: "PATCH" });
  if (!res.ok) throw new Error("Failed to toggle pin");
  return res.json();
}

async function updateNote(
  patientId: string,
  noteId: string,
  body: UpdatePatientNotePayload
): Promise<{ success: boolean; data: PatientNote }> {
  const res = await fetch(notesUrl(patientId, noteId), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to update note" }));
    throw new Error(err.error ?? "Failed to update note");
  }
  return res.json();
}

async function deleteNote(
  patientId: string,
  noteId: string
): Promise<{ success: boolean }> {
  const res = await fetch(notesUrl(patientId, noteId), { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete note");
  return res.json();
}

// ---- Hooks ----

export function patientNotesQueryOptions(patientId: string) {
  return queryOptions({
    queryKey: ["patient-notes", patientId],
    queryFn: () => fetchNotes(patientId),
  });
}

export function usePatientNotes(
  patientId: string | undefined,
  initialData?: PatientNotesResponse
) {
  return useQuery({
    ...patientNotesQueryOptions(patientId ?? ""),
    enabled: !!patientId,
    initialData,
  });
}

export function useCreateNote(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      title: string;
      content: string;
      category: NoteCategory;
      isPinned: boolean;
      authorName: string;
      authorRole: string;
    }) => createNote(patientId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-notes", patientId] });
    },
  });
}

export function useTogglePin(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => togglePin(patientId, noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-notes", patientId] });
    },
  });
}

export function useUpdateNote(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      noteId,
      data,
    }: {
      noteId: string;
      data: UpdatePatientNotePayload;
    }) => updateNote(patientId, noteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-notes", patientId] });
    },
  });
}

export function useDeleteNote(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => deleteNote(patientId, noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-notes", patientId] });
    },
  });
}
