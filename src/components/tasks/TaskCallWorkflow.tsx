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
} from "@/lib/hooks/use-patients";
import { cn } from "@/lib/utils";
import type { PatientMapping, Task, TaskStatus } from "@/types";

export interface TaskCallData {
  durationSeconds: number;
  durationLabel: string;
  notes: string;
}

export type TaskOutcomeMode = "hangup" | "manual";

export type PrescriptionChoice = "parchment" | "manual";

export type ClinicalDecision = "approve" | "reject";

export interface TaskOutcomeSubmission {
  outcomeId: TaskOutcomeId;
  /**
   * How the doctor issued the prescription — via Parchment (script returns
   * to us asynchronously) or manually (handwritten/external). Only meaningful
   * when the outcome creates a consultation (i.e. `reached`).
   */
  prescriptionChoice?: PrescriptionChoice;
  /**
   * Doctor's decision on the clinical record at finalisation time.
   * `approve` triggers the approve mutation; `reject` is recorded in the
   * audit note only (there is no backend reject endpoint).
   */
  clinicalDecision?: ClinicalDecision;
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
  "text-xs leading-[1.2] font-medium uppercase tracking-[0.08em] text-[color-mix(in_srgb,var(--sidebar-foreground)_40%,transparent)]";

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
  initialCallData,
  cancelAction,
  hangUpAction,
}: {
  task: Task | null;
  open: boolean;
  /**
   * When resuming a call after returning from the outcome dialog, this seeds
   * the timer and notes textarea so the call continues from where it was.
   */
  initialCallData?: TaskCallData;
  cancelAction: () => void;
  hangUpAction: (callData: TaskCallData) => void;
}) {
  const [seconds, setSeconds] = useState(
    () => initialCallData?.durationSeconds ?? 0
  );
  const [notes, setNotes] = useState(() => initialCallData?.notes ?? "");
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
  /**
   * When the user goes back to the call (hangup mode), we hand back the
   * latest TaskCallData so the call dialog can resume the timer and keep the
   * notes the doctor just edited. The argument is omitted in manual mode.
   */
  cancelAction: (resumeWith?: TaskCallData) => void;
  submitAction: (submission: TaskOutcomeSubmission) => void;
  submitting?: boolean;
}) {
  const [selected, setSelected] = useState<TaskOutcomeId>("reached");
  // Seed Step 1's textarea from the call notes so anything typed during the
  // call carries over to the consultation note. The dialog re-mounts each
  // time it opens (parent passes a fresh `key`), so this initialiser runs
  // once per outcome session.
  const [manualNotes, setManualNotes] = useState(() => callData?.notes ?? "");
  const [followupNote, setFollowupNote] = useState("");
  const [manualDuration, setManualDuration] = useState("");
  const [prescriptionChoice, setPrescriptionChoice] = useState<
    PrescriptionChoice | undefined
  >(undefined);
  const [clinicalDecision, setClinicalDecision] = useState<
    ClinicalDecision | undefined
  >(undefined);
  const [parchmentOpen, setParchmentOpen] = useState(false);
  const [confirmFinaliseOpen, setConfirmFinaliseOpen] = useState(false);
  const manualNotesId = useId();
  const manualDurationId = useId();

  const patientQuery = usePatient(task?.patientId);
  const clinicalQuery = useLatestClinicalData(task?.patientId);
  const approveClinicalMutation = useApproveClinicalRecord(task?.patientId ?? "");

  if (!open || !task) return null;

  const isManual = mode === "manual";
  const outcome = OUTCOMES.find((item) => item.id === selected) ?? OUTCOMES[0];

  const effectiveStatus: TaskStatus = outcome.status;
  const requiresReason = selected === "abandoned";
  // Manual mode requires the doctor to type notes when they reached the patient.
  const requiresManualNotes = isManual && selected === "reached";
  const isInvalid =
    (requiresReason && !followupNote.trim()) ||
    (requiresManualNotes && !manualNotes.trim());

  // Readiness checks: latest clinical record review only. Patient status is
  // no longer edited from this dialog.
  const clinicalRecord = clinicalQuery.data?.data?.clinicalData;
  const clinicalAlreadyApproved = clinicalRecord?.reviewStatus === "approved";
  const readinessLoading = patientQuery.isLoading || clinicalQuery.isLoading;
  const willCreateConsultation = effectiveStatus === "completed";
  // Effective clinical outcome after the user's decision is applied at
  // finalisation: approved if already approved server-side, or if the doctor
  // chose Approve in this dialog.
  const effectiveClinicalApproved =
    clinicalAlreadyApproved || clinicalDecision === "approve";
  const finaliseBlocked =
    willCreateConsultation &&
    !readinessLoading &&
    !effectiveClinicalApproved;

  // Prescribing requires an approved clinical record. If the doctor rejects
  // the record, Step 3 is disabled and the displayed choice falls back to
  // "none" so submission can't leak a stale value.
  const prescriptionDisabled = clinicalDecision === "reject";
  const effectivePrescriptionChoice = prescriptionDisabled
    ? undefined
    : prescriptionChoice;

  const patientName = task.patientName || "patient";
  const profileHref = `/patients/${encodeURIComponent(task.patientId)}`;

  function buildSubmission(): TaskOutcomeSubmission {
    return {
      outcomeId: selected,
      prescriptionChoice:
        selected === "reached" ? effectivePrescriptionChoice : undefined,
      clinicalDecision: selected === "reached" ? clinicalDecision : undefined,
      status: effectiveStatus,
      // Step 1's textarea is the single source of truth for the note (seeded
      // from callData.notes on mount, edited freely afterwards).
      notes: manualNotes.trim(),
      followupNote: followupNote.trim() || undefined,
      durationLabel: isManual ? manualDuration.trim() : callData?.durationLabel,
      durationSeconds: isManual ? undefined : callData?.durationSeconds,
    };
  }

  // Build the call-data hand-back when going "Back to call", so the timer
  // resumes and the latest notes carry over.
  function buildResumeData(): TaskCallData | undefined {
    if (isManual || !callData) return undefined;
    return {
      durationSeconds: callData.durationSeconds,
      durationLabel: callData.durationLabel,
      notes: manualNotes,
    };
  }

  function handleCancel() {
    cancelAction(buildResumeData());
  }

  // Apply any deferred side-effects (currently: approve clinical record), then
  // delegate to the parent's submitAction. Failures abort submission so the
  // dialog stays open with a toast.
  async function applyAndSubmit() {
    if (
      selected === "reached" &&
      clinicalDecision === "approve" &&
      clinicalRecord?.id &&
      !clinicalAlreadyApproved
    ) {
      try {
        await approveClinicalMutation.mutateAsync({
          recordId: clinicalRecord.id,
        });
        toast.success("Clinical record approved.");
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Failed to approve clinical record."
        );
        return;
      }
    }
    submitAction(buildSubmission());
  }

  function handleSubmit() {
    if (isInvalid) return;
    if (finaliseBlocked) {
      setConfirmFinaliseOpen(true);
      return;
    }
    void applyAndSubmit();
  }

  function confirmFinalise() {
    setConfirmFinaliseOpen(false);
    void applyAndSubmit();
  }

  const submitInFlight = submitting || approveClinicalMutation.isPending;

  const submitLabel = submitInFlight
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
          className="max-h-[calc(100dvh-1rem)] gap-0 overflow-hidden p-0 sm:max-w-4xl"
        >
          <DialogHeader className="gap-0 border-b border-border px-5 py-3">
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border",
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
              <DialogTitle className="text-base font-semibold">
                {isManual
                  ? `Log call outcome — ${patientName}`
                  : `Call ended — ${patientName}`}
              </DialogTitle>
              <a
                href={profileHref}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                aria-label="Open patient profile in new tab"
                title="Open patient profile"
              >
                Open patient
                <ExternalLink className="size-3.5" />
              </a>
            </div>
            <DialogDescription className="mt-1 text-xs text-muted-foreground">
              {isManual
                ? "Record a call you've already made (in person, by phone, or outside Aircall)."
                : `Call lasted ${callData?.durationLabel ?? "00:00"} · ${
                    callData?.notes
                      ? `${callData.notes.length} chars of notes`
                      : "no notes yet"
                  }`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 grid-cols-1 md:grid-cols-[18rem_1fr]">
            {/* LEFT — outcome picker */}
            <div className="border-b border-border px-3.5 py-3.5 md:border-r md:border-b-0">
              <p className={OVERLINE_CLASS}>Outcome</p>
              <div className="mt-2.5 space-y-1.5">
                {OUTCOMES.map((item) => {
                  const active = selected === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelected(item.id)}
                      className={cn(
                        "flex w-full items-start gap-2.5 rounded-md border px-2.5 py-2 text-left transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                        active
                          ? "border-primary bg-card"
                          : "border-transparent hover:bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
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
                        <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold leading-tight">
                          {item.title}
                          <StatusBadge variant={item.variant}>
                            {item.statusLabel ?? TASK_STATUS_LABELS[item.status]}
                          </StatusBadge>
                        </span>
                        <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                          {item.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RIGHT — numbered steps */}
            <div className="min-w-0 max-h-[min(78vh,38rem)] space-y-3.5 overflow-y-auto px-5 py-4">
              {selected === "reached" ? (
                <>
                  <StepBlock number={1} title="Consultation note">
                    <Textarea
                      id={manualNotesId}
                      value={manualNotes}
                      onChange={(event) => setManualNotes(event.target.value)}
                      placeholder={
                        isManual
                          ? "What was discussed, decided, plan, next steps…"
                          : "Add or refine notes for the consultation…"
                      }
                      className="min-h-24 bg-background text-sm leading-relaxed"
                    />
                    {isManual && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <label
                          htmlFor={manualDurationId}
                          className={OVERLINE_CLASS}
                        >
                          Duration
                        </label>
                        <Input
                          id={manualDurationId}
                          value={manualDuration}
                          onChange={(event) =>
                            setManualDuration(event.target.value)
                          }
                          placeholder="e.g. 4 min"
                          className="h-8 w-28 bg-background text-sm"
                        />
                        <span className="text-xs text-muted-foreground">
                          (optional)
                        </span>
                      </div>
                    )}
                  </StepBlock>

                  <StepBlock number={2} title="Clinical status">
                    <ClinicalStatusRow
                      task={task}
                      clinicalRecord={clinicalRecord}
                      loading={readinessLoading}
                      decision={clinicalDecision}
                      onDecisionChange={setClinicalDecision}
                    />
                  </StepBlock>

                  <StepBlock
                    number={3}
                    title="Prescription"
                    disabled={prescriptionDisabled}
                    disabledHint={
                      prescriptionDisabled
                        ? "Unavailable — clinical record rejected"
                        : undefined
                    }
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <PrescriptionChoiceButton
                        active={effectivePrescriptionChoice === "parchment"}
                        onClick={() => setPrescriptionChoice("parchment")}
                        label="Parchment"
                        disabled={prescriptionDisabled}
                      />
                      <PrescriptionChoiceButton
                        active={effectivePrescriptionChoice === "manual"}
                        onClick={() => setPrescriptionChoice("manual")}
                        label="Manual"
                        disabled={prescriptionDisabled}
                      />
                      {!prescriptionDisabled &&
                        effectivePrescriptionChoice === "parchment" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="ml-auto h-8 rounded-md px-3 text-sm"
                            onClick={() => setParchmentOpen(true)}
                          >
                            <Pill className="size-4" />
                            Open Parchment
                            <ExternalLink className="size-3.5" />
                          </Button>
                        )}
                    </div>
                    {!prescriptionDisabled &&
                      effectivePrescriptionChoice === "parchment" && (
                        <p className="mt-2 text-xs leading-snug text-muted-foreground">
                          Parchment opens in a new tab. The script returns to us
                          manually — you can still finalise the consultation here.
                        </p>
                      )}
                  </StepBlock>
                </>
              ) : (
                <div>
                  <label className={OVERLINE_CLASS}>
                    {selected === "abandoned"
                      ? "Reason required"
                      : "Follow-up note"}
                  </label>
                  <Textarea
                    value={followupNote}
                    onChange={(event) => setFollowupNote(event.target.value)}
                    placeholder={
                      selected === "abandoned"
                        ? "Why is this task being closed?"
                        : "Optional note for the next attempt."
                    }
                    className="mt-2 min-h-20 bg-background text-sm leading-relaxed"
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mx-0 mb-0 items-center justify-between gap-2 rounded-none border-t border-border bg-card px-5 py-2.5 sm:flex-row sm:justify-between">
            <p className="max-w-sm text-xs leading-snug text-muted-foreground">
              {effectiveStatus === "completed"
                ? "Creates a finalised consultation linked to the task."
                : "Notes are kept with the task so you can resume from Claimed."}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                className="h-9 rounded-lg px-3.5 text-sm"
                onClick={handleCancel}
                disabled={submitInFlight}
              >
                {isManual ? "Cancel" : "Back to call"}
              </Button>
              <Button
                className="h-9 rounded-lg px-3.5 text-sm"
                onClick={handleSubmit}
                disabled={isInvalid || submitInFlight}
              >
                <span>{submitLabel}</span>
                {!submitInFlight && isManual && effectiveStatus === "completed" && (
                  <span data-icon="inline-end" aria-hidden="true">
                    →
                  </span>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ParchmentRedirectDialog
        open={parchmentOpen}
        onOpenChange={setParchmentOpen}
        patientId={task.patientId}
        patientName={patientName}
      />

      <AlertDialog open={confirmFinaliseOpen} onOpenChange={setConfirmFinaliseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalise without approval?</AlertDialogTitle>
            <AlertDialogDescription>
              {clinicalDecision === "reject"
                ? "You rejected the clinical record. "
                : "The clinical record has not been approved. "}
              You can still create the consultation, but it will be flagged for
              review. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitInFlight}>Go back</AlertDialogCancel>
            <AlertDialogAction onClick={confirmFinalise} disabled={submitInFlight}>
              Finalise anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function PrescriptionChoiceButton({
  active,
  onClick,
  label,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60",
        active
          ? "border-primary bg-primary/10 text-foreground"
          : "border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
      aria-pressed={active}
    >
      <span
        className={cn(
          "flex size-3 items-center justify-center rounded-full border",
          active ? "border-primary bg-primary" : "border-input bg-background"
        )}
        aria-hidden="true"
      >
        {active && (
          <span className="size-1 rounded-full bg-primary-foreground" />
        )}
      </span>
      {label}
    </button>
  );
}

function StepBlock({
  number,
  title,
  children,
  disabled,
  disabledHint,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
  disabledHint?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border border-border bg-background px-3.5 py-3",
        disabled && "opacity-60"
      )}
    >
      <header className="mb-2.5 flex items-center gap-2">
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
            disabled
              ? "bg-muted text-muted-foreground"
              : "bg-primary text-primary-foreground"
          )}
        >
          {number}
        </span>
        <h3
          className={cn(
            "text-sm font-semibold",
            disabled ? "text-muted-foreground" : "text-foreground"
          )}
        >
          {title}
        </h3>
        {disabled && disabledHint && (
          <span className="text-xs font-normal text-muted-foreground">
            {disabledHint}
          </span>
        )}
      </header>
      <div className={cn(disabled && "pointer-events-none select-none")}>
        {children}
      </div>
    </section>
  );
}

function ClinicalStatusRow({
  task,
  clinicalRecord,
  loading,
  decision,
  onDecisionChange,
}: {
  task: Task;
  clinicalRecord:
    | {
        id?: string;
        reviewStatus?: "pending" | "approved";
        reviewedBy?: string | null;
        reviewedAt?: string | null;
      }
    | undefined;
  loading: boolean;
  decision: ClinicalDecision | undefined;
  onDecisionChange: (next: ClinicalDecision) => void;
}) {
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
  const alreadyApproved = clinicalReview === "approved";
  const canDecide = !!clinicalRecord?.id && clinicalReview === "pending";
  const clinicalHref = `/patients/${encodeURIComponent(task.patientId)}?tab=clinical`;

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge variant={clinicalVariant}>{clinicalLabel}</StatusBadge>
        <a
          href={clinicalHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          aria-label="Open clinical record in new tab"
          title="Open clinical record"
        >
          View record
          <ExternalLink className="size-3" />
        </a>
        {(clinicalReviewedAt || clinicalReviewedBy) && (
          <span className="text-xs text-muted-foreground">
            {clinicalReviewedAt}
            {clinicalReviewedAt && clinicalReviewedBy ? " · " : ""}
            {clinicalReviewedBy ? `by ${clinicalReviewedBy}` : ""}
          </span>
        )}
      </div>

      {alreadyApproved ? (
        <p className="text-xs leading-snug text-muted-foreground">
          Already approved — no action needed.
        </p>
      ) : canDecide ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <PrescriptionChoiceButton
              active={decision === "approve"}
              onClick={() => onDecisionChange("approve")}
              label="Approve"
            />
            <PrescriptionChoiceButton
              active={decision === "reject"}
              onClick={() => onDecisionChange("reject")}
              label="Reject"
            />
          </div>
          <p className="text-xs leading-snug text-muted-foreground">
            Your decision is applied when you finalise the consultation —
            nothing changes server-side until then.
          </p>
          {decision !== "approve" && (
            <div className="flex gap-2 rounded-md border border-status-warning-border bg-status-warning-bg px-3 py-2 text-status-warning-fg">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <p className="text-xs leading-snug">
                Clinical record will not be approved. You can still finalise —
                you&apos;ll be asked to confirm.
              </p>
            </div>
          )}
        </>
      ) : (
        <p className="text-xs leading-snug text-muted-foreground">
          No clinical record to review.
        </p>
      )}
    </div>
  );
}
