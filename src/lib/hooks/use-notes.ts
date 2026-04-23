import type { PatientNote, PatientNotesResponse, NoteCategory } from "@/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ---- Fetch helpers ----

async function fetchNotes(patientId: string): Promise<PatientNotesResponse> {
  const res = await fetch(`/api/notes/${encodeURIComponent(patientId)}`);
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
  const res = await fetch(`/api/notes/${encodeURIComponent(patientId)}`, {
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
  const res = await fetch(
    `/api/notes/${encodeURIComponent(patientId)}/${encodeURIComponent(noteId)}`,
    { method: "PATCH" }
  );
  if (!res.ok) throw new Error("Failed to toggle pin");
  return res.json();
}

async function deleteNote(
  patientId: string,
  noteId: string
): Promise<{ success: boolean }> {
  const res = await fetch(
    `/api/notes/${encodeURIComponent(patientId)}/${encodeURIComponent(noteId)}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error("Failed to delete note");
  return res.json();
}

// ---- Hooks ----

export function usePatientNotes(patientId: string | undefined) {
  return useQuery({
    queryKey: ["patient-notes", patientId],
    queryFn: () => fetchNotes(patientId!),
    enabled: !!patientId,
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

export function useDeleteNote(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => deleteNote(patientId, noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-notes", patientId] });
    },
  });
}
