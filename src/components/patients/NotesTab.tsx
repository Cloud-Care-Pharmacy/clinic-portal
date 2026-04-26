"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import {
  Pin,
  PinOff,
  Trash2,
  Pencil,
  StickyNote,
  Stethoscope,
  Pill,
  CalendarCheck,
  FileText,
  User,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppSheet } from "@/components/shared/AppSheet";
import { EmptyState } from "@/components/shared/EmptyState";
import { SimpleEditor } from "@/components/shared/SimpleEditor";
import { useLastDefined } from "@/lib/hooks/use-last-defined";
import {
  usePatientNotes,
  useCreateNote,
  useUpdateNote,
  useTogglePin,
  useDeleteNote,
} from "@/lib/hooks/use-notes";
import type { PatientNote, PatientNotesResponse, NoteCategory } from "@/types";

// ---- Schema ----

const noteSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z
    .string()
    .refine(
      (val) => val.replace(/<[^>]*>/g, "").trim().length > 0,
      "Note content is required"
    ),
  category: z.string().min(1, "Category is required"),
  isPinned: z.boolean(),
});

type NoteFormData = z.infer<typeof noteSchema>;

// ---- Constants ----

const CATEGORY_LABELS: Record<NoteCategory, string> = {
  clinical: "Clinical Observation",
  pharmacy: "Pharmacy Note",
  "follow-up": "Follow-up",
  general: "General",
};

const CATEGORY_COLORS: Record<NoteCategory, string> = {
  clinical: "bg-status-info-bg text-status-info-fg",
  pharmacy: "bg-status-success-bg text-status-success-fg",
  "follow-up": "bg-status-warning-bg text-status-warning-fg",
  general: "bg-status-neutral-bg text-status-neutral-fg",
};

// ---- AddNoteSheet ----

function AddNoteSheet({
  patientId,
  open,
  onOpenChange,
}: {
  patientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createNote = useCreateNote(patientId);
  const formId = useId();
  const form = useForm<NoteFormData>({
    defaultValues: { title: "", content: "", category: "general", isPinned: false },
  });
  const categoryValue = useWatch({ control: form.control, name: "category" });
  const isPinnedValue = useWatch({ control: form.control, name: "isPinned" });

  function onSubmit(data: NoteFormData) {
    const result = noteSchema.safeParse(data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof NoteFormData;
        form.setError(field, { message: issue.message });
      }
      return;
    }

    createNote.mutate(
      {
        title: result.data.title,
        content: result.data.content,
        category: result.data.category as NoteCategory,
        isPinned: result.data.isPinned,
        authorName: "Staff Member",
        authorRole: "staff",
      },
      {
        onSuccess: () => {
          toast.success("Note added");
          form.reset();
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(err.message);
        },
      }
    );
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Add Note"
      description="Add a clinical or general note for this patient."
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              form.reset();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={createNote.isPending}>
            {createNote.isPending ? "Saving…" : "Add note"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="note-title">Title</Label>
          <Input id="note-title" placeholder="Note title" {...form.register("title")} />
          {form.formState.errors.title && (
            <p className="text-sm text-destructive">
              {form.formState.errors.title.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="note-category">Category</Label>
          <Select
            value={categoryValue}
            onValueChange={(v) => {
              if (v) form.setValue("category", v);
            }}
          >
            <SelectTrigger id="note-category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="clinical">Clinical Observation</SelectItem>
              <SelectItem value="pharmacy">Pharmacy Note</SelectItem>
              <SelectItem value="follow-up">Follow-up</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 space-y-2">
          <Label>Note</Label>
          <SimpleEditor
            content={form.getValues("content")}
            onChange={(html) =>
              form.setValue("content", html, { shouldValidate: true })
            }
          />
          {form.formState.errors.content && (
            <p className="text-sm text-destructive">
              {form.formState.errors.content.message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 p-4">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold">Pin this note</p>
            <p className="text-xs text-muted-foreground">
              Pinned notes stay at the top of the notes list for quick access.
            </p>
          </div>
          <Switch
            checked={isPinnedValue}
            onCheckedChange={(checked) => form.setValue("isPinned", checked === true)}
          />
        </div>
      </form>
    </AppSheet>
  );
}

function EditNoteSheet({
  patientId,
  note,
  open,
  onOpenChange,
}: {
  patientId: string;
  note: PatientNote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateNote = useUpdateNote(patientId);
  const formId = useId();
  const form = useForm<NoteFormData>({
    defaultValues: {
      title: note?.title ?? "",
      content: note?.content ?? "",
      category: note?.category ?? "general",
      isPinned: note?.isPinned ?? false,
    },
  });
  const categoryValue = useWatch({ control: form.control, name: "category" });
  const isPinnedValue = useWatch({ control: form.control, name: "isPinned" });

  useEffect(() => {
    if (!note || !open) return;
    form.reset({
      title: note.title,
      content: note.content,
      category: note.category,
      isPinned: note.isPinned,
    });
  }, [form, note, open]);

  function onSubmit(data: NoteFormData) {
    if (!note) return;
    const result = noteSchema.safeParse(data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof NoteFormData;
        form.setError(field, { message: issue.message });
      }
      return;
    }

    updateNote.mutate(
      {
        noteId: note.id,
        data: {
          title: result.data.title,
          content: result.data.content,
          category: result.data.category as NoteCategory,
          isPinned: result.data.isPinned,
        },
      },
      {
        onSuccess: () => {
          toast.success("Note updated");
          onOpenChange(false);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Note"
      description="Update the note details."
      footer={
        <>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={updateNote.isPending}>
            {updateNote.isPending ? "Saving…" : "Save changes"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-note-title">Title</Label>
          <Input
            id="edit-note-title"
            placeholder="Note title"
            {...form.register("title")}
          />
          {form.formState.errors.title && (
            <p className="text-sm text-destructive">
              {form.formState.errors.title.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-note-category">Category</Label>
          <Select
            value={categoryValue}
            onValueChange={(v) => {
              if (v) form.setValue("category", v, { shouldDirty: true });
            }}
          >
            <SelectTrigger id="edit-note-category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="clinical">Clinical Observation</SelectItem>
              <SelectItem value="pharmacy">Pharmacy Note</SelectItem>
              <SelectItem value="follow-up">Follow-up</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Note</Label>
          <SimpleEditor
            content={form.getValues("content")}
            onChange={(html) =>
              form.setValue("content", html, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          />
          {form.formState.errors.content && (
            <p className="text-sm text-destructive">
              {form.formState.errors.content.message}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 p-4">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold">Pin this note</p>
            <p className="text-xs text-muted-foreground">
              Pinned notes stay at the top of the notes list for quick access.
            </p>
          </div>
          <Switch
            checked={isPinnedValue}
            onCheckedChange={(checked) =>
              form.setValue("isPinned", checked === true, { shouldDirty: true })
            }
          />
        </div>
      </form>
    </AppSheet>
  );
}

// ---- Note detail sheet ----

function NoteDetailSheet({
  note,
  open,
  onOpenChange,
}: {
  note: PatientNote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const stash = useLastDefined(note);

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={stash ? stash.title : ""}
      description={
        stash ? (
          <>
            {stash.authorName} ·{" "}
            {new Date(stash.createdAt).toLocaleString("en-AU", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </>
        ) : (
          ""
        )
      }
      footer={
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      }
    >
      {stash ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={`text-xs px-2 py-0.5 ${CATEGORY_COLORS[stash.category]}`}
            >
              {CATEGORY_LABELS[stash.category]}
            </Badge>
            {stash.isPinned && (
              <Badge variant="outline" className="text-xs px-2 py-0.5">
                <Pin className="mr-1.5 h-3 w-3" />
                Pinned
              </Badge>
            )}
          </div>

          <div
            className="prose prose-sm max-w-none text-sm text-foreground [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2"
            dangerouslySetInnerHTML={{ __html: stash.content }}
          />
        </div>
      ) : null}
    </AppSheet>
  );
}

// ---- Category Icons ----

const CATEGORY_ICONS: Record<NoteCategory, React.ReactNode> = {
  clinical: <Stethoscope className="h-4 w-4" />,
  pharmacy: <Pill className="h-4 w-4" />,
  "follow-up": <CalendarCheck className="h-4 w-4" />,
  general: <FileText className="h-4 w-4" />,
};

// ---- Helpers ----

function groupNotesByMonth(notes: PatientNote[]) {
  const groups: { label: string; notes: PatientNote[] }[] = [];
  const map = new Map<string, PatientNote[]>();

  for (const note of notes) {
    const date = new Date(note.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, "0")}`;
    const label = date.toLocaleString("en-AU", { month: "long", year: "numeric" });
    if (!map.has(key)) {
      map.set(key, []);
      groups.push({ label, notes: map.get(key)! });
    }
    map.get(key)!.push(note);
  }

  return groups;
}

// ---- NoteCard (timeline style) ----

function NoteCard({
  note,
  onEdit,
  onTogglePin,
  onDelete,
  isPinning,
  isDeleting,
}: {
  note: PatientNote;
  onEdit: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
  isPinning: boolean;
  isDeleting: boolean;
}) {
  return (
    <div className="flex gap-4 items-start">
      {/* Left icon */}
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground ${
          note.isPinned ? "border-status-warning-border text-status-warning-fg" : ""
        }`}
      >
        {CATEGORY_ICONS[note.category]}
      </div>

      {/* Card */}
      <Card
        className={`flex-1 ${
          note.isPinned ? "border-status-warning-border bg-status-warning-bg" : ""
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Author avatar */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                {/* Title */}
                <p className="text-sm font-semibold leading-tight">
                  {note.title}
                  {note.isPinned && (
                    <Pin className="inline-block ml-1.5 h-3 w-3 text-status-warning-fg" />
                  )}
                </p>

                {/* Content */}
                <div
                  className="text-sm text-muted-foreground prose prose-sm max-w-none [&_p]:my-0.5 [&_ul]:my-0.5 [&_ol]:my-0.5"
                  dangerouslySetInnerHTML={{ __html: note.content }}
                />

                {/* Author + timestamp */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-xs text-muted-foreground">
                    {note.authorName}
                  </span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(note.createdAt).toLocaleString("en-AU", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLORS[note.category]}`}
                  >
                    {CATEGORY_LABELS[note.category]}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={onEdit}
                title="Edit note"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={onTogglePin}
                disabled={isPinning}
                title={note.isPinned ? "Unpin note" : "Pin note"}
              >
                {note.isPinned ? (
                  <PinOff className="h-3.5 w-3.5" />
                ) : (
                  <Pin className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={onDelete}
                disabled={isDeleting}
                title="Delete note"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---- NotesTab (main export) ----

interface NotesTabProps {
  patientId: string;
  initialAction?: "new";
  selectedNoteId?: string;
  initialNotes?: PatientNotesResponse;
}

export function NotesTab({
  patientId,
  initialAction,
  selectedNoteId,
  initialNotes,
}: NotesTabProps) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PatientNote | null>(null);
  const { data, isLoading, error } = usePatientNotes(patientId, initialNotes);
  const togglePin = useTogglePin(patientId);
  const deleteNoteMutation = useDeleteNote(patientId);
  const addNoteOpen = sheetOpen || initialAction === "new";

  function handleSheetOpenChange(open: boolean) {
    setSheetOpen(open);
    if (!open && initialAction === "new") {
      router.replace(`/patients/${encodeURIComponent(patientId)}/notes`, {
        scroll: false,
      });
    }
  }

  function handleTogglePin(noteId: string) {
    togglePin.mutate(noteId, {
      onError: (err) => toast.error(err.message),
    });
  }

  function handleDelete(noteId: string) {
    deleteNoteMutation.mutate(noteId, {
      onSuccess: () => toast.success("Note deleted"),
      onError: (err) => toast.error(err.message),
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive text-sm">
        Failed to load notes: {error.message}
      </div>
    );
  }

  const notes = data?.data?.notes ?? [];
  const pinnedNotes = notes.filter((n) => n.isPinned);
  const unpinnedNotes = notes.filter((n) => !n.isPinned);
  const selectedNote = selectedNoteId
    ? (notes.find((note) => note.id === selectedNoteId) ?? null)
    : null;

  function clearSelectedNote() {
    if (selectedNoteId) {
      router.replace(`/patients/${encodeURIComponent(patientId)}/notes`, {
        scroll: false,
      });
    }
  }

  return (
    <div className="space-y-4">
      <AddNoteSheet
        patientId={patientId}
        open={addNoteOpen}
        onOpenChange={handleSheetOpenChange}
      />
      <NoteDetailSheet
        note={selectedNote}
        open={!!selectedNote}
        onOpenChange={(open) => {
          if (!open) clearSelectedNote();
        }}
      />
      <EditNoteSheet
        patientId={patientId}
        note={editTarget}
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      />

      {notes.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="No notes yet"
          description="Add your first note to start documenting patient interactions."
          actionLabel="Add Note"
          onAction={() => setSheetOpen(true)}
        />
      ) : (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setSheetOpen(true)}>
              <StickyNote className="mr-2 h-4 w-4" />
              Add Note
            </Button>
          </div>
          {/* Pinned section */}
          {pinnedNotes.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-center">
                <Badge variant="outline" className="text-xs px-3 py-1 rounded-full">
                  <Pin className="mr-1.5 h-3 w-3" />
                  Pinned
                </Badge>
              </div>
              {pinnedNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onEdit={() => setEditTarget(note)}
                  onTogglePin={() => handleTogglePin(note.id)}
                  onDelete={() => handleDelete(note.id)}
                  isPinning={togglePin.isPending && togglePin.variables === note.id}
                  isDeleting={
                    deleteNoteMutation.isPending &&
                    deleteNoteMutation.variables === note.id
                  }
                />
              ))}
            </div>
          )}

          {/* Timeline grouped by month */}
          {groupNotesByMonth(unpinnedNotes).map((group) => (
            <div key={group.label} className="space-y-3">
              <div className="flex justify-center">
                <Badge variant="outline" className="text-xs px-3 py-1 rounded-full">
                  {group.label}
                </Badge>
              </div>
              {group.notes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onEdit={() => setEditTarget(note)}
                  onTogglePin={() => handleTogglePin(note.id)}
                  onDelete={() => handleDelete(note.id)}
                  isPinning={togglePin.isPending && togglePin.variables === note.id}
                  isDeleting={
                    deleteNoteMutation.isPending &&
                    deleteNoteMutation.variables === note.id
                  }
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
