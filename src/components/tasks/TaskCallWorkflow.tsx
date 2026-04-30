"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Clock,
  ExternalLink,
  FileText,
  Phone,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  formatTaskDate,
  formatTaskDueRelative,
  getTaskDisplayTitle,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
} from "@/components/tasks/task-format";
import { usePatient } from "@/lib/hooks/use-patients";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/types";

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
  icon: typeof Check;
}> = [
  {
    id: "reached",
    title: "Reached patient — finalised",
    description: "Patient answered. Notes complete. Consultation ready to finalise.",
    status: "completed",
    variant: "success",
    icon: Check,
  },
  {
    id: "voicemail",
    title: "Voicemail / no answer",
    description: "Couldn’t reach the patient. Task stays in progress.",
    status: "in_progress",
    variant: "warning",
    icon: Phone,
  },
  {
    id: "callback",
    title: "Patient asked to call back",
    description: "Schedule a callback. Notes remain attached to the task.",
    status: "in_progress",
    variant: "info",
    icon: Clock,
  },
  {
    id: "wrong-time",
    title: "Reached but bad timing",
    description: "Patient was busy. Save the attempt and call again later.",
    status: "in_progress",
    variant: "info",
    icon: Phone,
  },
  {
    id: "abandoned",
    title: "Abandoned — wrong number / refused",
    description: "Close the task without a completed consultation. Requires a reason.",
    status: "cancelled",
    variant: "neutral",
    icon: AlertCircle,
  },
];

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

function useSavingLabel() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savingLabel, setSavingLabel] = useState("Saved just now");

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    []
  );

  function markSaving() {
    setSavingLabel("Saving…");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setSavingLabel("Saved just now"), 600);
  }

  return { savingLabel, markSaving };
}

export function TaskCallDialog({
  task,
  open,
  onCancel,
  onHangUp,
}: {
  task: Task | null;
  open: boolean;
  onCancel: () => void;
  onHangUp: (callData: TaskCallData) => void;
}) {
  const [seconds, setSeconds] = useState(0);
  const [notes, setNotes] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const { savingLabel, markSaving } = useSavingLabel();
  const patientQuery = usePatient(task?.patientId);

  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, [open]);

  if (!open || !task) return null;

  const durationLabel = formatDuration(seconds);
  const phone = patientQuery.data?.data?.patient?.mobile?.trim() || undefined;
  const patientName = task.patientName || "Patient";
  const displayTitle = getTaskDisplayTitle(task.taskType, task.title);

  function handleNoteChange(value: string) {
    setNotes(value);
    markSaving();
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
        <span className="size-2 rounded-full bg-status-success-fg" aria-hidden="true" />
        <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
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
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}
    >
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-foreground/55 backdrop-blur-sm"
        className={cn(
          "max-h-[calc(100vh-3rem)] gap-0 overflow-hidden p-0 sm:max-w-145",
          detailsOpen && "sm:max-w-220"
        )}
      >
        <div className="flex min-h-0">
          <div className="flex min-w-0 flex-1 flex-col">
            <DialogHeader className="border-b border-border p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="relative flex size-9 items-center justify-center rounded-lg border border-status-success-border bg-status-success-bg text-xs font-bold text-status-success-fg">
                    <span className="absolute -top-1 -right-1 size-2 rounded-full bg-status-success-fg" />
                    AC
                  </span>
                  <div>
                    <p className="overline text-status-success-fg">
                      On call via Aircall
                    </p>
                    <DialogTitle className="mt-1 text-lg font-semibold">
                      {patientName}
                    </DialogTitle>
                    <DialogDescription className="mt-1 font-mono text-xs">
                      {phone ?? "No phone number on this task"}
                    </DialogDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-semibold tabular-nums">
                    {durationLabel}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setMinimized(true)}
                    aria-label="Minimize call"
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="border-b border-border bg-muted px-5 py-3 text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  Mute, hold, transfer, and hang-up live in your Aircall extension.
                </span>
                {phone ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      globalThis.location.href = `tel:${phone}`;
                    }}
                  >
                    <ExternalLink className="size-3.5" />
                    Open Aircall
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-base font-semibold text-secondary-foreground">
                  {taskInitials(task)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{displayTitle}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {TASK_TYPE_LABELS[task.taskType]} · Due {formatTaskDate(task.dueAt)}
                  </p>
                </div>
              </div>

              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="overline">Consultation notes</label>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Check className="size-3" />
                  {savingLabel}
                </span>
              </div>
              <Textarea
                value={notes}
                onChange={(event) => handleNoteChange(event.target.value)}
                placeholder="Write as you talk — every keystroke saves to this draft consultation."
                className="min-h-52 resize-y bg-background text-sm"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {["BP", "Symptoms", "Plan", "Rx", "Follow-up"].map((label) => (
                  <Button
                    key={label}
                    type="button"
                    variant="dashed"
                    size="xs"
                    className="rounded-full"
                    onClick={() => insertSnippet(label)}
                  >
                    + {label}
                  </Button>
                ))}
              </div>
            </div>

            <DialogFooter className="items-center justify-between gap-3 p-5">
              <Button
                variant="outline"
                onClick={() => setDetailsOpen((value) => !value)}
              >
                <UserRound className="size-4" />
                {detailsOpen ? "Hide patient details" : "Open patient details"}
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={onCancel}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() =>
                    onHangUp({ durationSeconds: seconds, durationLabel, notes })
                  }
                >
                  I&apos;ve hung up — finalise
                </Button>
              </div>
            </DialogFooter>
          </div>

          {detailsOpen && <TaskPatientDetails task={task} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TaskPatientDetails({ task }: { task: Task }) {
  const conditions = taskMetadataList(task, ["conditions", "medicalConditions"]);
  const medications = taskMetadataList(task, ["medications", "activeMedications"]);
  const allergies = taskMetadataList(task, ["allergies"]);

  return (
    <aside className="w-80 shrink-0 overflow-y-auto border-l border-border bg-card">
      <section className="border-b border-border p-4">
        <p className="overline">Task context</p>
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
        <p className="overline">Due</p>
        <p className="mt-2 text-sm font-medium">{formatTaskDate(task.dueAt)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatTaskDueRelative(task.dueAt, task.status)}
        </p>
      </section>
      <section className="p-4">
        <p className="overline">Notes</p>
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
      <p className="overline">{title}</p>
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
  onCancel,
  onSubmit,
  submitting,
}: {
  task: Task | null;
  mode: TaskOutcomeMode;
  callData?: TaskCallData;
  open: boolean;
  onCancel: () => void;
  onSubmit: (submission: TaskOutcomeSubmission) => void;
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
    onSubmit({
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
        overlayClassName="bg-foreground/55 backdrop-blur-sm"
        className="max-h-[calc(100vh-3rem)] gap-0 overflow-hidden p-0 sm:max-w-150"
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
                "overline",
                isManual ? "text-status-info-fg" : "text-status-warning-fg"
              )}
            >
              {isManual
                ? "Manual log · record an existing call"
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
              ? "Use this for calls already completed outside the live Aircall flow."
              : `Call lasted ${callData?.durationLabel ?? "00:00"} · ${
                  callData?.notes
                    ? `${callData.notes.length} chars of notes`
                    : "no notes yet"
                }`}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[44vh] overflow-y-auto p-4">
          <div className="space-y-2">
            {OUTCOMES.map((item) => {
              const Icon = item.icon;
              const active = selected === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item.id)}
                  className={cn(
                    "flex min-h-16 w-full items-start gap-3 rounded-lg border p-3 text-left transition-all duration-100 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    active
                      ? "border-primary bg-card"
                      : "border-transparent hover:bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border",
                      item.variant === "success" &&
                        "border-status-success-border bg-status-success-bg text-status-success-fg",
                      item.variant === "warning" &&
                        "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
                      item.variant === "info" &&
                        "border-status-info-border bg-status-info-bg text-status-info-fg",
                      item.variant === "neutral" &&
                        "border-status-neutral-border bg-status-neutral-bg text-status-neutral-fg"
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      {item.title}
                      <StatusBadge variant={item.variant}>
                        {TASK_STATUS_LABELS[item.status]}
                      </StatusBadge>
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "mt-1 flex size-4 shrink-0 items-center justify-center rounded-full border",
                      active ? "border-primary bg-primary" : "border-input"
                    )}
                    aria-hidden="true"
                  >
                    {active && (
                      <span className="size-1.5 rounded-full bg-primary-foreground" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {isManual && selected === "reached" && (
          <div className="border-t border-border px-5 py-4">
            <label className="overline">Consultation notes</label>
            <Textarea
              value={manualNotes}
              onChange={(event) => setManualNotes(event.target.value)}
              placeholder="What did you discuss? Findings, plan, prescriptions, follow-up…"
              className="mt-2 min-h-28 bg-background text-sm"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="overline">Call duration</label>
              <input
                value={manualDuration}
                onChange={(event) => setManualDuration(event.target.value)}
                placeholder="e.g. 4 min"
                className="h-8 w-36 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <span className="text-xs text-muted-foreground">Optional</span>
            </div>
          </div>
        )}

        {(selected === "voicemail" ||
          selected === "callback" ||
          selected === "wrong-time" ||
          selected === "abandoned") && (
          <div className="border-t border-border px-5 py-4">
            <label className="overline">
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
            <Button variant="ghost" onClick={onCancel} disabled={submitting}>
              {isManual ? "Cancel" : "Back to call"}
            </Button>
            <Button onClick={handleSubmit} disabled={isInvalid || submitting}>
              {submitting
                ? "Saving…"
                : outcome.status === "completed"
                  ? isManual
                    ? "Save consultation"
                    : "Finalise consultation"
                  : "Save & close"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
