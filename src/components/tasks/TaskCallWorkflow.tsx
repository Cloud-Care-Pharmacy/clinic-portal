"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronDown,
  FileText,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useUnsavedChangesGuard } from "@/components/tasks/use-unsaved-changes-guard";
import {
  formatTaskDate,
  formatTaskDueRelative,
  getTaskDisplayTitle,
  getTaskPatientPhone,
  isTaskOverdue,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
} from "@/components/tasks/task-format";
import { usePatient } from "@/lib/hooks/use-patients";
import { cn } from "@/lib/utils";
import type { PatientMapping, Task, TaskStatus } from "@/types";

export interface TaskCallData {
  durationSeconds: number;
  durationLabel: string;
  notes: string;
}

export type TaskOutcomeMode = "hangup" | "manual";

export interface TaskOutcomeSubmission {
  outcomeId: TaskOutcomeId;
  status: TaskStatus;
  notes?: string;
  followupNote?: string;
  durationLabel?: string;
  durationSeconds?: number;
}

type TaskOutcomeId = "reached" | "voicemail" | "callback" | "wrong-time" | "abandoned";

const OUTCOMES: Array<{
  id: TaskOutcomeId;
  title: string;
  description: string;
  status: TaskStatus;
  variant: "success" | "warning" | "danger" | "info" | "neutral";
  statusLabel?: string;
}> = [
  {
    id: "reached",
    title: "Reached patient — finalised",
    description: "Patient answered. Notes complete. Consultation ready to finalise.",
    status: "completed",
    variant: "success",
  },
  {
    id: "voicemail",
    title: "Voicemail / no answer",
    description: "Couldn't reach the patient. Will retry. Task stays in progress.",
    status: "in_progress",
    variant: "info",
  },
  {
    id: "callback",
    title: "Patient asked to call back",
    description: "Schedule a callback. Notes saved as draft.",
    status: "in_progress",
    variant: "info",
  },
  {
    id: "wrong-time",
    title: "Reached but bad timing",
    description: "Patient busy. Will call again later today.",
    status: "in_progress",
    variant: "info",
  },
  {
    id: "abandoned",
    title: "Abandon task — not appropriate",
    description: "Task closed without consultation. Captures the reason in audit log.",
    status: "cancelled",
    variant: "warning",
    statusLabel: "Closed",
  },
];

const OVERLINE_CLASS =
  "text-[0.6875rem] leading-[1.2] font-medium uppercase tracking-[0.08em] text-[color-mix(in_srgb,var(--sidebar-foreground)_40%,transparent)]";

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function taskInitials(task: Task) {
  const value = task.patientName || task.patientId;
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "—"
  );
}

function taskMetadataList(task: Task, keys: string[]) {
  const metadata = task.metadata;
  if (!metadata) return [];

  for (const key of keys) {
    const value = metadata[key];
    if (Array.isArray(value))
      return value.filter((item): item is string => typeof item === "string");
    if (typeof value === "string" && value.trim()) return [value];
  }

  return [];
}

function taskMetadataString(task: Task, keys: string[]) {
  const metadata = task.metadata;
  if (!metadata) return undefined;

  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }

  return undefined;
}

function formatPatientAge(dateOfBirth?: string | null) {
  if (!dateOfBirth) return undefined;

  const date = new Date(dateOfBirth);
  if (Number.isNaN(date.getTime())) return undefined;

  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > date.getMonth() ||
    (today.getMonth() === date.getMonth() && today.getDate() >= date.getDate());

  if (!hasBirthdayPassed) age -= 1;
  return age >= 0 ? String(age) : undefined;
}

function formatGenderInitial(value?: string | null) {
  if (!value?.trim()) return undefined;
  const normalized = value.trim().toLowerCase();

  if (normalized.startsWith("f")) return "F";
  if (normalized.startsWith("m")) return "M";
  return value.trim().slice(0, 1).toUpperCase();
}

function formatPatientLocation(patient: PatientMapping | undefined, task: Task) {
  const city =
    patient?.city?.trim() || taskMetadataString(task, ["city", "suburb", "town"]);
  const state = patient?.state?.trim() || taskMetadataString(task, ["state", "region"]);
  const postcode = patient?.postcode?.trim() || taskMetadataString(task, ["postcode"]);

  if (city && state) return `${city}, ${state}`;
  if (city) return city;
  if (state && postcode) return `${state} ${postcode}`;
  return state || postcode || undefined;
}

function formatPatientDetailsLine({
  patient,
  task,
  phone,
}: {
  patient?: PatientMapping;
  task: Task;
  phone?: string;
}) {
  const age =
    formatPatientAge(patient?.dateOfBirth) ||
    taskMetadataString(task, ["age", "patientAge"]);
  const sex = formatGenderInitial(
    patient?.gender || taskMetadataString(task, ["sex", "gender", "patientSex"])
  );
  const ageSex = [age, sex].filter(Boolean).join("·");
  const location = formatPatientLocation(patient, task);

  return [phone, ageSex, location].filter(Boolean).join(" · ");
}

function formatTaskReferenceStatus(task: Task) {
  if (isTaskOverdue(task.dueAt) && !["completed", "cancelled"].includes(task.status)) {
    return "overdue";
  }

  return TASK_STATUS_LABELS[task.status].toLowerCase();
}

export function TaskCallDialog({
  task,
  open,
  cancelAction,
  hangUpAction,
}: {
  task: Task | null;
  open: boolean;
  cancelAction: () => void;
  hangUpAction: (callData: TaskCallData) => void;
}) {
  const [seconds, setSeconds] = useState(0);
  const [notes, setNotes] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [discardNotesOpen, setDiscardNotesOpen] = useState(false);
  const patientQuery = usePatient(task?.patientId);
  const hasUnsavedNotes = notes.trim().length > 0;

  useUnsavedChangesGuard({
    active: open && hasUnsavedNotes,
    message: "Discard unsaved call notes?",
  });

  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, [open]);

  if (!open || !task) return null;

  const durationLabel = formatDuration(seconds);
  const patient = patientQuery.data?.data?.patient;
  const phone = patient?.mobile?.trim() || getTaskPatientPhone(task) || undefined;
  const patientName = task.patientName || "Patient";
  const displayTitle = getTaskDisplayTitle(task.taskType, task.title);
  const patientDetailsLine =
    formatPatientDetailsLine({ patient, task, phone }) || "Patient details unavailable";
  const taskReferenceStatus = formatTaskReferenceStatus(task);

  function handleNoteChange(value: string) {
    setNotes(value);
  }

  function requestCancel() {
    if (hasUnsavedNotes) {
      setDiscardNotesOpen(true);
      return;
    }

    cancelAction();
  }

  function discardNotes() {
    setDiscardNotesOpen(false);
    cancelAction();
  }

  function insertSnippet(label: string) {
    const snippets: Record<string, string> = {
      BP: "BP: ",
      Symptoms: "Symptoms: ",
      Plan: "Plan:\n  • ",
      Rx: "Rx: ",
      "Follow-up": "Follow-up: ",
    };
    const prefix = notes && !notes.endsWith("\n") ? "\n" : "";
    handleNoteChange(`${notes}${prefix}${snippets[label] ?? `${label}: `}`);
  }

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        className="fixed right-6 bottom-6 z-60 flex h-14 min-w-60 items-center gap-3 rounded-full border border-border bg-popover px-4 text-left shadow-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span
          className="size-2 rounded-full bg-(--feedback-success)"
          aria-hidden="true"
        />
        <span className="flex size-8 items-center justify-center rounded-full bg-status-accent-bg text-xs font-semibold text-status-accent-fg">
          {taskInitials(task)}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {patientName.split(" ")[0]}
        </span>
        <span className="font-mono text-xs text-muted-foreground">{durationLabel}</span>
      </button>
    );
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) requestCancel();
        }}
      >
        <DialogContent
          showCloseButton={false}
          className={cn(
            "max-h-[calc(100vh-3rem)] gap-0 overflow-hidden border border-border p-0 shadow-xl sm:max-w-135",
            detailsOpen && "sm:max-w-215"
          )}
        >
          <div className="flex min-h-0">
            <div className="flex min-w-0 flex-1 flex-col">
              <DialogHeader className="border-b border-border px-5 py-2.5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-(--feedback-success) text-xs font-bold text-(--feedback-success-foreground)">
                      AC
                    </span>
                    <div>
                      <DialogTitle className="text-sm font-semibold tracking-wide">
                        AIRCALL · ACTIVE CALL
                      </DialogTitle>
                      <DialogDescription className="mt-0.5 text-xs">
                        Mute, hold, transfer, hang up — in the Aircall extension
                      </DialogDescription>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="rounded-lg bg-background focus-visible:border-border focus-visible:ring-2 focus-visible:ring-border/60"
                    onClick={() => setMinimized(true)}
                    aria-label="Minimize call"
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                </div>
              </DialogHeader>

              <section className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
                <div className="flex min-w-0 items-center gap-4">
                  <span className="flex size-13 shrink-0 items-center justify-center rounded-full bg-status-accent-bg text-base font-semibold text-status-accent-fg">
                    {taskInitials(task)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold" title={patientName}>
                      {patientName}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {patientDetailsLine}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      For task:{" "}
                      <span className="font-semibold text-foreground">
                        {displayTitle} — {taskReferenceStatus}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-(--feedback-success)">
                    <span className="size-2 rounded-full bg-(--feedback-success)" />
                    Connected
                  </p>
                  <p className="mt-1 font-mono text-2xl font-semibold tabular-nums tracking-wider">
                    {durationLabel}
                  </p>
                </div>
              </section>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className={OVERLINE_CLASS}>Consultation notes — draft</label>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Check className="size-3.5" />
                    Saved just now
                  </span>
                </div>
                <Textarea
                  value={notes}
                  onChange={(event) => handleNoteChange(event.target.value)}
                  placeholder="Write as you talk — every keystroke saves to the draft consultation. Try the snippets below."
                  className="min-h-40 resize-y bg-background text-sm leading-relaxed"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {["BP", "Symptoms", "Plan", "Rx", "Follow-up"].map((label) => (
                    <Button
                      key={label}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full px-3 text-muted-foreground"
                      onClick={() => insertSnippet(label)}
                    >
                      +{label}
                    </Button>
                  ))}
                </div>
              </div>

              <DialogFooter className="mx-0 mb-0 items-center justify-between gap-3 rounded-none bg-card px-5 py-3 sm:flex-row">
                <Button
                  variant="outline"
                  className="h-9 rounded-xl px-4 text-sm"
                  onClick={() => setDetailsOpen((value) => !value)}
                >
                  <UserRound className="size-4" />
                  {detailsOpen ? "Hide patient details" : "Open patient details"}
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="h-9 rounded-xl px-4 text-sm"
                    onClick={requestCancel}
                  >
                    Cancel call
                  </Button>
                  <Button
                    className="h-9 rounded-xl px-4 text-sm"
                    onClick={() =>
                      hangUpAction({ durationSeconds: seconds, durationLabel, notes })
                    }
                  >
                    I&apos;ve hung up — finalise
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </DialogFooter>
            </div>

            {detailsOpen && <TaskPatientDetails task={task} />}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={discardNotesOpen} onOpenChange={setDiscardNotesOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard call notes?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear the notes entered for this call before an outcome is
              selected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={discardNotes}>
              Discard notes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function TaskPatientDetails({ task }: { task: Task }) {
  const conditions = taskMetadataList(task, ["conditions", "medicalConditions"]);
  const medications = taskMetadataList(task, ["medications", "activeMedications"]);
  const allergies = taskMetadataList(task, ["allergies"]);

  return (
    <aside className="w-80 shrink-0 overflow-y-auto border-l border-border bg-card">
      <section className="border-b border-border p-4">
        <p className={OVERLINE_CLASS}>Task context</p>
        <p className="mt-2 text-sm font-semibold">
          {getTaskDisplayTitle(task.taskType, task.title)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {TASK_TYPE_LABELS[task.taskType]} · {TASK_STATUS_LABELS[task.status]}
        </p>
      </section>
      <DetailSection
        title="Active conditions"
        items={conditions}
        empty="None recorded"
      />
      <DetailSection
        title="Active medications"
        items={medications}
        empty="None recorded"
      />
      <DetailSection title="Allergies" items={allergies} empty="None recorded" />
      <section className="border-b border-border p-4">
        <p className={OVERLINE_CLASS}>Due</p>
        <p className="mt-2 text-sm font-medium">{formatTaskDate(task.dueAt)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatTaskDueRelative(task.dueAt, task.status)}
        </p>
      </section>
      <section className="p-4">
        <p className={OVERLINE_CLASS}>Notes</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {task.description || "No extra task notes were provided."}
        </p>
      </section>
    </aside>
  );
}

function DetailSection({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <section className="border-b border-border p-4">
      <p className={OVERLINE_CLASS}>{title}</p>
      {items.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {items.map((item) => (
            <StatusBadge key={item} variant="neutral">
              {item}
            </StatusBadge>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}

export function TaskOutcomeDialog({
  task,
  mode,
  callData,
  open,
  cancelAction,
  submitAction,
  submitting,
}: {
  task: Task | null;
  mode: TaskOutcomeMode;
  callData?: TaskCallData;
  open: boolean;
  cancelAction: () => void;
  submitAction: (submission: TaskOutcomeSubmission) => void;
  submitting?: boolean;
}) {
  const [selected, setSelected] = useState<TaskOutcomeId>("reached");
  const [manualNotes, setManualNotes] = useState("");
  const [followupNote, setFollowupNote] = useState("");
  const [manualDuration, setManualDuration] = useState("");

  if (!open || !task) return null;

  const isManual = mode === "manual";
  const outcome = OUTCOMES.find((item) => item.id === selected) ?? OUTCOMES[0];
  const requiresReason = selected === "abandoned";
  const requiresManualNotes = isManual && selected === "reached";
  const isInvalid =
    (requiresReason && !followupNote.trim()) ||
    (requiresManualNotes && !manualNotes.trim());

  function handleSubmit() {
    if (isInvalid) return;
    submitAction({
      outcomeId: selected,
      status: outcome.status,
      notes: isManual ? manualNotes.trim() : (callData?.notes.trim() ?? ""),
      followupNote: followupNote.trim() || undefined,
      durationLabel: isManual ? manualDuration.trim() : callData?.durationLabel,
      durationSeconds: isManual ? undefined : callData?.durationSeconds,
    });
  }

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-foreground/40"
        className="max-h-[calc(100dvh-1rem)] gap-0 overflow-hidden p-0 sm:max-w-150"
      >
        <DialogHeader className="border-b border-border p-5">
          <div className="mb-3 flex items-center gap-2">
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full border",
                isManual
                  ? "border-status-info-border bg-status-info-bg text-status-info-fg"
                  : "border-status-warning-border bg-status-warning-bg text-status-warning-fg"
              )}
            >
              {isManual ? (
                <FileText className="size-4" />
              ) : (
                <AlertCircle className="size-4" />
              )}
            </span>
            <span
              className={cn(
                OVERLINE_CLASS,
                isManual ? "text-status-info-fg" : "text-status-warning-fg"
              )}
            >
              {isManual
                ? "Manual log · record a call you've already made"
                : "Required · pick an outcome"}
            </span>
          </div>
          <DialogTitle className="text-xl font-semibold">
            {isManual
              ? `Log call outcome — ${task.patientName || "patient"}`
              : `How did the call with ${(task.patientName || "the patient").split(" ")[0]} end?`}
          </DialogTitle>
          <DialogDescription className="mt-2">
            {isManual
              ? "Use this when you've already spoken to the patient (in person, by phone, or outside Aircall) and just need to record the result."
              : `Call lasted ${callData?.durationLabel ?? "00:00"} · ${
                  callData?.notes
                    ? `${callData.notes.length} chars of notes`
                    : "no notes yet"
                }`}
          </DialogDescription>
        </DialogHeader>

        <div className="p-4">
          <div className="space-y-1.5">
            {OUTCOMES.map((item) => {
              const active = selected === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-all duration-100 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    active
                      ? "border-primary bg-card"
                      : "border-transparent hover:bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "mt-1 flex size-4 shrink-0 items-center justify-center rounded-full border",
                      active
                        ? "border-primary bg-primary"
                        : "border-input bg-background"
                    )}
                    aria-hidden="true"
                  >
                    {active && (
                      <span className="size-1.5 rounded-full bg-primary-foreground" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      {item.title}
                      <StatusBadge variant={item.variant}>
                        {item.statusLabel ?? TASK_STATUS_LABELS[item.status]}
                      </StatusBadge>
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {isManual && selected === "reached" && (
          <div className="px-5 pt-1 pb-4">
            <label className={OVERLINE_CLASS}>Consultation notes</label>
            <Textarea
              value={manualNotes}
              onChange={(event) => setManualNotes(event.target.value)}
              placeholder="What did you discuss? Findings, plan, prescriptions, follow-up…"
              className="mt-2 min-h-[clamp(6rem,16vh,9.5rem)] bg-background text-sm"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className={OVERLINE_CLASS}>Call duration</label>
              <Input
                value={manualDuration}
                onChange={(event) => setManualDuration(event.target.value)}
                placeholder="e.g. 4 min"
                className="w-36 bg-background text-sm"
              />
              <span className="text-xs text-muted-foreground">(optional)</span>
            </div>
          </div>
        )}

        {(selected === "voicemail" ||
          selected === "callback" ||
          selected === "wrong-time" ||
          selected === "abandoned") && (
          <div className="px-5 pt-1 pb-4">
            <label className={OVERLINE_CLASS}>
              {selected === "abandoned" ? "Reason required" : "Follow-up note"}
            </label>
            <Textarea
              value={followupNote}
              onChange={(event) => setFollowupNote(event.target.value)}
              placeholder={
                selected === "abandoned"
                  ? "Why is this task being closed?"
                  : "Optional note for the next attempt."
              }
              className="mt-2 min-h-20 bg-background text-sm"
            />
          </div>
        )}

        <DialogFooter className="items-center justify-between gap-3 p-5">
          <p className="max-w-xs text-xs text-muted-foreground">
            {outcome.status === "completed"
              ? "This will create a finalised consultation linked to the task."
              : "Notes are kept with the task so you can resume from My tasks."}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={cancelAction} disabled={submitting}>
              {isManual ? "Cancel" : "Back to call"}
            </Button>
            <Button onClick={handleSubmit} disabled={isInvalid || submitting}>
              <span>
                {submitting
                  ? "Saving…"
                  : outcome.status === "completed"
                    ? isManual
                      ? "Save consultation"
                      : "Finalise consultation"
                    : "Save & close"}
              </span>
              {!submitting && isManual && outcome.status === "completed" && (
                <span data-icon="inline-end" aria-hidden="true">
                  →
                </span>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
