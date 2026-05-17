/* oxlint-disable react-doctor/rerender-state-only-in-handlers -- `minimized` IS read during render at `if (minimized) { return ... }`. */
"use client";

import { useEffect, useId, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  Loader2,
  Pill,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ParchmentRedirectDialog } from "@/components/prescriptions/ParchmentRedirectDialog";
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
import {
  useApproveClinicalRecord,
  useLatestClinicalData,
  usePatient,
  useUpdatePatient,
} from "@/lib/hooks/use-patients";
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
  /**
   * Sub-outcome for `reached` (e.g. "finalised", "needs-followup",
   * "escalate", "refer-out"). Carried into the consultation outcome string
   * and task audit note.
   */
  subOutcomeId?: ReachedSubOutcomeId;
  status: TaskStatus;
  notes?: string;
  followupNote?: string;
  durationLabel?: string;
  durationSeconds?: number;
}

type TaskOutcomeId = "reached" | "voicemail" | "callback" | "wrong-time" | "abandoned";

export type ReachedSubOutcomeId =
  | "finalised"
  | "needs-followup"
  | "escalate"
  | "refer-out";

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

const REACHED_SUBOUTCOMES: Array<{
  id: ReachedSubOutcomeId;
  title: string;
  description: string;
  status: TaskStatus;
  variant: "success" | "warning" | "danger" | "info" | "neutral";
  statusLabel?: string;
}> = [
  {
    id: "finalised",
    title: "Finalised — consultation complete",
    description: "Notes complete. Ready to finalise the consultation.",
    status: "completed",
    variant: "success",
    statusLabel: "Completed",
  },
  {
    id: "needs-followup",
    title: "Needs follow-up",
    description: "Partial consult — will continue in a follow-up call.",
    status: "in_progress",
    variant: "info",
    statusLabel: "In progress",
  },
  {
    id: "escalate",
    title: "Escalate to senior clinician",
    description: "Refer internally for clinical review.",
    status: "in_progress",
    variant: "info",
    statusLabel: "In progress",
  },
  {
    id: "refer-out",
    title: "Refer out (GP / specialist)",
    description: "Send the patient externally. Consultation logged as referral.",
    status: "completed",
    variant: "success",
    statusLabel: "Completed",
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
  if (isTaskOverdue(task) && !["completed", "cancelled"].includes(task.status)) {
    return "overdue";
  }

  return TASK_STATUS_LABELS[task.status].toLowerCase();
}

function LiveStatusDot({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex size-2.5 items-center justify-center",
        className
      )}
      aria-hidden="true"
    >
      <span className="absolute inline-flex size-full rounded-full bg-(--feedback-success) opacity-40 motion-safe:animate-ping motion-safe:animation-duration-[1.4s] motion-reduce:hidden" />
      <span className="relative inline-flex size-2 rounded-full bg-(--feedback-success)" />
    </span>
  );
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
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const [discardNotesOpen, setDiscardNotesOpen] = useState(false);
  const [prescriptionOpen, setPrescriptionOpen] = useState(false);
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
        <LiveStatusDot />
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
                        Mute, hold, transfer, hang up, in the Aircall extension
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
                        {displayTitle}, {taskReferenceStatus}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-(--feedback-success)">
                    <LiveStatusDot />
                    Connected
                  </p>
                  <p className="mt-1 font-mono text-2xl font-semibold tabular-nums tracking-wider">
                    {durationLabel}
                  </p>
                </div>
              </section>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className={OVERLINE_CLASS}>Consultation notes, draft</span>
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
                    I&apos;ve hung up, finalise
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </DialogFooter>
            </div>
            {detailsOpen && (
              <TaskPatientDetails
                task={task}
                openPrescriptionAction={() => setPrescriptionOpen(true)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ParchmentRedirectDialog
        open={prescriptionOpen}
        onOpenChange={setPrescriptionOpen}
        patientId={task.patientId}
        patientName={patientName}
      />

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

function TaskPatientDetails({
  task,
  openPrescriptionAction,
}: {
  task: Task;
  openPrescriptionAction: () => void;
}) {
  const conditions = taskMetadataList(task, ["conditions", "medicalConditions"]);

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
      <PrescriptionActionSection onNewPrescription={openPrescriptionAction} />
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

function PrescriptionActionSection({
  onNewPrescription,
}: {
  onNewPrescription: () => void;
}) {
  return (
    <section className="border-b border-border p-4">
      <p className={OVERLINE_CLASS}>Prescriptions</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Start a new Parchment prescribing session for this patient.
      </p>
      <Button
        type="button"
        variant="outline"
        className="mt-3 h-9 w-full justify-start rounded-xl px-3 text-sm"
        onClick={onNewPrescription}
      >
        <Pill className="size-4" />
        New prescription
        <ExternalLink className="ml-auto size-3.5 text-muted-foreground" />
      </Button>
    </section>
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
  const [reachedSub, setReachedSub] = useState<ReachedSubOutcomeId>("finalised");
  const [manualNotes, setManualNotes] = useState("");
  const [followupNote, setFollowupNote] = useState("");
  const [manualDuration, setManualDuration] = useState("");
  const [confirmFinaliseOpen, setConfirmFinaliseOpen] = useState(false);
  const manualNotesId = useId();
  const manualDurationId = useId();

  const patientQuery = usePatient(task?.patientId);
  const clinicalQuery = useLatestClinicalData(task?.patientId);
  const updatePatientMutation = useUpdatePatient(task?.patientId ?? "");
  const approveClinicalMutation = useApproveClinicalRecord(task?.patientId ?? "");

  if (!open || !task) return null;

  const isManual = mode === "manual";
  const outcome = OUTCOMES.find((item) => item.id === selected) ?? OUTCOMES[0];
  const reachedSubOutcome =
    REACHED_SUBOUTCOMES.find((item) => item.id === reachedSub) ?? REACHED_SUBOUTCOMES[0];

  // For "reached" the sub-outcome drives status; for all others the top-level
  // outcome status applies.
  const effectiveStatus: TaskStatus =
    selected === "reached" ? reachedSubOutcome.status : outcome.status;
  const effectiveSubOutcome: ReachedSubOutcomeId | undefined =
    selected === "reached" ? reachedSub : undefined;

  const requiresReason = selected === "abandoned";
  const requiresNotes =
    selected === "reached" &&
    (isManual || effectiveStatus === "completed") &&
    // Only require notes when we are creating a finalised consultation.
    effectiveStatus === "completed";
  const isInvalid =
    (requiresReason && !followupNote.trim()) ||
    (requiresNotes && isManual && !manualNotes.trim());

  // Readiness checks: patient.patientStatus and latest clinical record review.
  const patient = patientQuery.data?.data?.patient;
  const clinicalRecord = clinicalQuery.data?.data?.clinicalData;
  const patientStatusValue = patient?.patientStatus?.toLowerCase() ?? "";
  const patientApproved = patientStatusValue === "approved";
  const clinicalApproved = clinicalRecord?.reviewStatus === "approved";
  const readinessLoading = patientQuery.isLoading || clinicalQuery.isLoading;
  const willCreateConsultation = effectiveStatus === "completed";
  const finaliseBlocked =
    willCreateConsultation &&
    !readinessLoading &&
    (!patientApproved || !clinicalApproved);

  function buildSubmission(): TaskOutcomeSubmission {
    return {
      outcomeId: selected,
      subOutcomeId: effectiveSubOutcome,
      status: effectiveStatus,
      notes: isManual ? manualNotes.trim() : (callData?.notes.trim() ?? ""),
      followupNote: followupNote.trim() || undefined,
      durationLabel: isManual ? manualDuration.trim() : callData?.durationLabel,
      durationSeconds: isManual ? undefined : callData?.durationSeconds,
    };
  }

  function handleSubmit() {
    if (isInvalid) return;
    if (finaliseBlocked) {
      setConfirmFinaliseOpen(true);
      return;
    }
    submitAction(buildSubmission());
  }

  function confirmFinalise() {
    setConfirmFinaliseOpen(false);
    submitAction(buildSubmission());
  }

  const submitLabel = submitting
    ? "Saving…"
    : effectiveStatus === "completed"
      ? isManual
        ? "Save consultation"
        : "Finalise consultation"
      : "Save & close";

  return (
    <>
      <Dialog open={open} onOpenChange={() => undefined}>
        <DialogContent
          showCloseButton={false}
          overlayClassName="bg-foreground/40"
          className="max-h-[calc(100dvh-1rem)] gap-0 overflow-hidden p-0 sm:max-w-225"
        >
          <DialogHeader className="gap-0 border-b border-border px-5 py-4">
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
            <DialogDescription className="mt-1.5 leading-5">
              {isManual
                ? "Use this when you've already spoken to the patient (in person, by phone, or outside Aircall) and just need to record the result."
                : `Call lasted ${callData?.durationLabel ?? "00:00"} · ${
                    callData?.notes
                      ? `${callData.notes.length} chars of notes`
                      : "no notes yet"
                  }`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 grid-cols-1 md:grid-cols-[17rem_1fr]">
            {/* LEFT — outcome picker */}
            <div className="border-b border-border px-4 py-4 md:border-r md:border-b-0">
              <p className={OVERLINE_CLASS}>Outcome</p>
              <div className="mt-3 space-y-1.5">
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

            {/* RIGHT — readiness, sub-outcomes, notes */}
            <div className="min-w-0 max-h-[min(75vh,38rem)] overflow-y-auto px-5 py-4">
              <ReadinessPanel
                task={task}
                patient={patient}
                clinicalRecord={clinicalRecord}
                loading={readinessLoading}
                onPatientStatusChange={(next) => {
                  updatePatientMutation.mutate(
                    { patientStatus: next },
                    {
                      onSuccess: () =>
                        toast.success(`Patient status set to ${next}.`),
                      onError: (err) =>
                        toast.error(
                          err instanceof Error
                            ? err.message
                            : "Failed to update patient status."
                        ),
                    }
                  );
                }}
                patientStatusSaving={updatePatientMutation.isPending}
                onApproveClinical={() => {
                  if (!clinicalRecord?.id) return;
                  approveClinicalMutation.mutate(
                    { recordId: clinicalRecord.id },
                    {
                      onSuccess: () =>
                        toast.success("Clinical record approved."),
                      onError: (err) =>
                        toast.error(
                          err instanceof Error
                            ? err.message
                            : "Failed to approve clinical record."
                        ),
                    }
                  );
                }}
                approvingClinical={approveClinicalMutation.isPending}
              />

              {finaliseBlocked && (
                <div className="mt-3 flex gap-2.5 rounded-lg border border-status-warning-border bg-status-warning-bg px-3 py-2.5 text-status-warning-fg">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <p className="text-xs leading-5">
                    {!patientApproved && !clinicalApproved
                      ? "Patient and clinical record are not yet approved."
                      : !patientApproved
                        ? "Patient status is not yet approved."
                        : "Clinical record is not yet approved."}{" "}
                    You can still finalise, but you&apos;ll be asked to confirm.
                  </p>
                </div>
              )}

              {selected === "reached" && (
                <div className="mt-4">
                  <p className={OVERLINE_CLASS}>Consultation outcome</p>
                  <div className="mt-2 space-y-1.5">
                    {REACHED_SUBOUTCOMES.map((item) => {
                      const active = reachedSub === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setReachedSub(item.id)}
                          className={cn(
                            "flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left transition-all duration-100 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
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
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {item.description}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selected === "reached" && isManual && (
                <div className="mt-4">
                  <label htmlFor={manualNotesId} className={OVERLINE_CLASS}>
                    Consultation notes
                  </label>
                  <Textarea
                    id={manualNotesId}
                    value={manualNotes}
                    onChange={(event) => setManualNotes(event.target.value)}
                    placeholder="What did you discuss? Findings, plan, prescriptions, follow-up…"
                    className="mt-2 min-h-[clamp(6rem,16vh,9.5rem)] bg-background text-sm"
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <label htmlFor={manualDurationId} className={OVERLINE_CLASS}>
                      Call duration
                    </label>
                    <Input
                      id={manualDurationId}
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
                <div className="mt-4">
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
            </div>
          </div>

          <DialogFooter className="mx-0 mb-0 items-center justify-between gap-3 rounded-none border-t border-border bg-card px-5 py-3 sm:flex-row sm:justify-between">
            <p className="max-w-xs text-xs leading-5 text-muted-foreground">
              {effectiveStatus === "completed"
                ? "This will create a finalised consultation linked to the task."
                : "Notes are kept with the task so you can resume from Claimed."}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                className="h-9 rounded-xl px-4 text-sm"
                onClick={cancelAction}
                disabled={submitting}
              >
                {isManual ? "Cancel" : "Back to call"}
              </Button>
              <Button
                className="h-9 rounded-xl px-4 text-sm"
                onClick={handleSubmit}
                disabled={isInvalid || submitting}
              >
                <span>{submitLabel}</span>
                {!submitting && isManual && effectiveStatus === "completed" && (
                  <span data-icon="inline-end" aria-hidden="true">
                    →
                  </span>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmFinaliseOpen} onOpenChange={setConfirmFinaliseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalise without full approval?</AlertDialogTitle>
            <AlertDialogDescription>
              {!patientApproved && !clinicalApproved
                ? "Neither the patient status nor the clinical record is approved yet."
                : !patientApproved
                  ? "The patient status is not approved yet."
                  : "The clinical record has not been approved yet."}{" "}
              You can still create the consultation, but it will be flagged for
              review. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>
              Go back
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmFinalise} disabled={submitting}>
              Finalise anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const PATIENT_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "current", label: "Current" },
  { value: "approved", label: "Approved" },
  { value: "inactive", label: "Inactive" },
];

function patientStatusVariantFor(
  value: string | undefined
): "success" | "warning" | "neutral" {
  const lower = value?.toLowerCase();
  if (lower === "approved") return "success";
  if (lower === "pending" || lower === "review") return "warning";
  return "neutral";
}

function ReadinessPanel({
  task,
  patient,
  clinicalRecord,
  loading,
  onPatientStatusChange,
  patientStatusSaving,
  onApproveClinical,
  approvingClinical,
}: {
  task: Task;
  patient: PatientMapping | undefined;
  clinicalRecord:
    | {
        id?: string;
        reviewStatus?: "pending" | "approved";
        reviewedBy?: string | null;
        reviewedAt?: string | null;
      }
    | undefined;
  loading: boolean;
  onPatientStatusChange: (next: string) => void;
  patientStatusSaving: boolean;
  onApproveClinical: () => void;
  approvingClinical: boolean;
}) {
  const patientName = patient
    ? [patient.firstName, patient.lastName].filter(Boolean).join(" ") ||
      task.patientName ||
      "Patient"
    : task.patientName || "Patient";

  const rawStatus = patient?.patientStatus?.trim();
  const statusLower = rawStatus?.toLowerCase();
  // Normalise to a known option when possible so the Select shows a value.
  const matchedOption = PATIENT_STATUS_OPTIONS.find((opt) => opt.value === statusLower);
  const selectValue = matchedOption?.value ?? statusLower ?? "";
  const patientStatusVariant = patientStatusVariantFor(statusLower);
  const patientStatusLabel = matchedOption?.label
    ?? (rawStatus
      ? rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1)
      : loading
        ? "Loading…"
        : "Unknown");

  const clinicalReview = clinicalRecord?.reviewStatus;
  const clinicalLabel =
    clinicalReview === "approved"
      ? "Approved"
      : clinicalReview === "pending"
        ? "Pending review"
        : loading
          ? "Loading…"
          : "No clinical record";
  const clinicalVariant: "success" | "warning" | "neutral" =
    clinicalReview === "approved"
      ? "success"
      : clinicalReview === "pending"
        ? "warning"
        : "neutral";
  const clinicalReviewedAt = clinicalRecord?.reviewedAt
    ? formatTaskDate(clinicalRecord.reviewedAt)
    : undefined;
  const clinicalReviewedBy = clinicalRecord?.reviewedBy || undefined;
  const canApproveClinical =
    !!clinicalRecord?.id && clinicalReview === "pending";

  const profileHref = `/patients/${encodeURIComponent(task.patientId)}`;
  const clinicalHref = `/patients/${encodeURIComponent(task.patientId)}?tab=clinical`;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-3">
      <section>
        <p className={OVERLINE_CLASS}>Patient</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <p className="text-sm font-semibold">{patientName}</p>
          <a
            href={profileHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label="Open patient profile in new tab"
            title="Open patient profile"
          >
            <ExternalLink className="size-3.5" />
          </a>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Select
            value={selectValue || undefined}
            onValueChange={(v) => {
              if (!v || v === selectValue) return;
              onPatientStatusChange(v);
            }}
            disabled={loading || patientStatusSaving}
          >
            <SelectTrigger
              size="sm"
              className="h-8 w-40 bg-background text-xs"
              aria-label="Patient status"
            >
              <SelectValue placeholder={loading ? "Loading…" : "Set status"} />
            </SelectTrigger>
            <SelectContent>
              {PATIENT_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <StatusBadge variant={patientStatusVariant}>{patientStatusLabel}</StatusBadge>
          {patientStatusSaving && (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          )}
        </div>
      </section>

      <section className="border-t border-border/60 pt-3">
        <div className="flex items-center gap-2">
          <p className={OVERLINE_CLASS}>Clinical record</p>
          <a
            href={clinicalHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex size-5 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label="Open clinical record in new tab"
            title="Open clinical record"
          >
            <ExternalLink className="size-3" />
          </a>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <StatusBadge variant={clinicalVariant}>{clinicalLabel}</StatusBadge>
          {(clinicalReviewedAt || clinicalReviewedBy) && (
            <span className="text-xs text-muted-foreground">
              {clinicalReviewedAt}
              {clinicalReviewedAt && clinicalReviewedBy ? " · " : ""}
              {clinicalReviewedBy ? `by ${clinicalReviewedBy}` : ""}
            </span>
          )}
          {canApproveClinical && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="ml-auto h-7 rounded-md px-2.5 text-xs"
              onClick={onApproveClinical}
              disabled={approvingClinical}
            >
              {approvingClinical ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
              Approve
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
