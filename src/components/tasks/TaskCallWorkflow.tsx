/* oxlint-disable react-doctor/rerender-state-only-in-handlers -- `minimized` IS read during render at `if (minimized) { return ... }`. */
"use client";

import { useEffect, useId, useState, Fragment } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  Link2,
  Pill,
  Sparkles,
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
import {
  ManualRxComposer,
  areAllValid as areAllRxValid,
  type Medication,
} from "@/components/prescriptions/manual-rx";
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

export type PrescriptionChoice = "erx" | "internal" | "none";

export type ClinicalDecision = "approve" | "reject";

export interface TaskOutcomeSubmission {
  outcomeId: TaskOutcomeId;
  /**
   * How the doctor issued the prescription — via ERX (electronic
   * prescription) or internally (composed in this dialog). Only meaningful
   * when the outcome creates a consultation (i.e. `reached`).
   */
  prescriptionChoice?: PrescriptionChoice;
  /**
   * Doctor's decision on the clinical record at finalisation time.
   * `approve` triggers the approve mutation; `reject` is recorded in the
   * audit note only (there is no backend reject endpoint).
   */
  clinicalDecision?: ClinicalDecision;
  /**
   * Manual-script line items composed in the wrap-up dialog. Populated only
   * when `prescriptionChoice === "internal"`. Persistence is handled downstream.
   */
  prescriptionMeds?: Medication[];
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
    title: "Reached patient - finalised",
    description: "Patient answered. Notes complete. Consultation ready to finalise.",
    status: "completed",
    variant: "success",
  },
  {
    id: "voicemail",
    title: "Voicemail / no answer",
    description: "No answer - retry later.",
    status: "in_progress",
    variant: "info",
  },
  {
    id: "callback",
    title: "Patient asked to call back",
    description: "Schedule a callback.",
    status: "in_progress",
    variant: "info",
  },
  {
    id: "wrong-time",
    title: "Reached but bad timing",
    description: "Busy - retry later today.",
    status: "in_progress",
    variant: "info",
  },
  {
    id: "abandoned",
    title: "Abandon task - not appropriate",
    description: "Closed without consultation.",
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
      .join("") || "-"
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
  const [seconds, setSeconds] = useState(() => initialCallData?.durationSeconds ?? 0);
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
                  placeholder="Write as you talk - every keystroke saves to the draft consultation. Try the snippets below."
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
  const [prescriptionChoice, setPrescriptionChoice] =
    useState<PrescriptionChoice>("erx");
  const [rxMeds, setRxMeds] = useState<Medication[]>([]);
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
  // Manual script must have at least one fully-valid medication card before we
  // let the doctor finalise. Other prescription choices skip this gate.
  const requiresValidRxMeds =
    selected === "reached" && prescriptionChoice === "internal";
  const isInvalid =
    (requiresReason && !followupNote.trim()) ||
    (requiresManualNotes && !manualNotes.trim()) ||
    (requiresValidRxMeds && !areAllRxValid(rxMeds));

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
    willCreateConsultation && !readinessLoading && !effectiveClinicalApproved;

  // Rejecting the clinical record auto-selects "None" for prescription
  // (you can't prescribe against a rejected record). Step 3 stays
  // interactive in case the doctor changes their mind.
  function handleClinicalDecisionChange(next: ClinicalDecision) {
    setClinicalDecision(next);
    if (next === "reject") {
      setPrescriptionChoice("none");
    }
  }

  const patientName = task.patientName || "patient";
  const patientFirstName = patientName.split(" ")[0] || patientName;
  const profileHref = `/patients/${encodeURIComponent(task.patientId)}`;

  function buildSubmission(): TaskOutcomeSubmission {
    return {
      outcomeId: selected,
      prescriptionChoice: selected === "reached" ? prescriptionChoice : undefined,
      clinicalDecision: selected === "reached" ? clinicalDecision : undefined,
      prescriptionMeds:
        selected === "reached" && prescriptionChoice === "internal"
          ? rxMeds
          : undefined,
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
          err instanceof Error ? err.message : "Failed to approve clinical record."
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
          className={cn(
            "max-h-[calc(100dvh-1rem)] gap-0 overflow-hidden p-0 transition-[max-width] duration-200",
            selected === "reached" && prescriptionChoice === "internal"
              ? "sm:max-w-6xl"
              : "sm:max-w-4xl"
          )}
        >
          <DialogHeader className="gap-0 border-b border-border px-5 py-3">
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border",
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
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-semibold">
                  {isManual
                    ? `How did the call with ${patientFirstName} go?`
                    : `How did the call with ${patientFirstName} end?`}
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs text-muted-foreground">
                  {isManual
                    ? "Record a call you've already made (in person, by phone, or outside Aircall)."
                    : `Call lasted ${callData?.durationLabel ?? "00:00"} · ${
                        callData?.notes
                          ? `${callData.notes.length} chars of notes`
                          : "no notes yet"
                      }`}
                </DialogDescription>
              </div>
              <a
                href={profileHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                aria-label="Open patient profile in new tab"
                title="Open patient profile"
              >
                Open patient
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          </DialogHeader>

          <div
            className={cn(
              "grid min-h-0 grid-cols-1",
              selected === "reached" && prescriptionChoice === "internal"
                ? "md:grid-cols-[16rem_minmax(0,1fr)_22rem]"
                : "md:grid-cols-[18rem_1fr]"
            )}
          >
            {/* LEFT — outcome picker */}
            <div className="border-b border-border px-3.5 py-3.5 md:border-r md:border-b-0">
              <p className={OVERLINE_CLASS}>Outcome</p>
              <div className="mt-2.5 space-y-1.5">
                {OUTCOMES.map((item, index) => {
                  const active = selected === item.id;
                  return (
                    <Fragment key={item.id}>
                      {index === 1 && (
                        <div
                          className="flex items-center gap-2 pt-2 pb-1"
                          aria-hidden="true"
                        >
                          <span className={OVERLINE_CLASS}>Alternatives</span>
                          <span className="h-px flex-1 bg-border" />
                        </div>
                      )}
                      <button
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
                    </Fragment>
                  );
                })}
              </div>
            </div>

            {/* RIGHT — numbered steps */}
            <div className="min-w-0 max-h-[min(78vh,38rem)] space-y-3.5 overflow-y-auto px-5 py-4">
              {selected === "reached" ? (
                <>
                  <StepBlock number={1} title="Consultation note" required>
                    <Textarea
                      id={manualNotesId}
                      value={manualNotes}
                      onChange={(event) => setManualNotes(event.target.value)}
                      placeholder="Summary, BP / pulse, adherence, next steps…"
                      className="min-h-24 bg-background text-sm leading-relaxed"
                    />
                    {!isManual && (
                      <p className="mt-2 flex items-start gap-1.5 text-xs leading-snug text-muted-foreground">
                        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
                        <span>
                          The call recording will be saved to this patient&apos;s
                          profile shortly after the call ends.
                        </span>
                      </p>
                    )}
                    {isManual && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <label htmlFor={manualDurationId} className={OVERLINE_CLASS}>
                          Duration
                        </label>
                        <Input
                          id={manualDurationId}
                          value={manualDuration}
                          onChange={(event) => setManualDuration(event.target.value)}
                          placeholder="e.g. 4 min"
                          className="h-8 w-28 bg-background text-sm"
                        />
                        <span className="text-xs text-muted-foreground">
                          (optional)
                        </span>
                      </div>
                    )}
                  </StepBlock>

                  <StepBlock number={2} title="Clinical decision">
                    <ClinicalStatusRow
                      task={task}
                      clinicalRecord={clinicalRecord}
                      loading={readinessLoading}
                      decision={clinicalDecision}
                      onDecisionChange={handleClinicalDecisionChange}
                    />
                  </StepBlock>

                  <StepBlock
                    number={3}
                    title="Prescription"
                    headerRight={
                      <PrescriptionSegmentedToggle
                        value={prescriptionChoice}
                        onChange={setPrescriptionChoice}
                      />
                    }
                  >
                    {prescriptionChoice === "internal" ? (
                      <InternalRxSummaryCard
                        count={rxMeds.length}
                        allValid={areAllRxValid(rxMeds)}
                      />
                    ) : (
                      <PrescriptionActionCard
                        choice={prescriptionChoice}
                        onOpenParchment={() => setParchmentOpen(true)}
                      />
                    )}
                  </StepBlock>
                </>
              ) : (
                <div>
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
                    className="mt-2 min-h-20 bg-background text-sm leading-relaxed"
                  />
                </div>
              )}
            </div>

            {/* RIGHT — manual rx composer side panel (only when internal selected) */}
            {selected === "reached" && prescriptionChoice === "internal" && (
              <aside className="hidden min-w-0 max-h-[min(78vh,38rem)] flex-col overflow-hidden border-t border-border bg-muted/30 md:flex md:border-t-0 md:border-l">
                <header className="flex items-center justify-between gap-2 border-b border-border bg-card/60 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Internal prescription</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Compose medications for this consultation.
                    </p>
                  </div>
                  <Pill className="size-4 shrink-0 text-muted-foreground" />
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                  <ManualRxComposer value={rxMeds} onChange={setRxMeds} />
                </div>
              </aside>
            )}
          </div>

          <DialogFooter className="mx-0 mb-0 items-center justify-end gap-2 rounded-none border-t border-border bg-card px-5 py-2.5 sm:flex-row sm:justify-end">
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
              You can still create the consultation, but it will be flagged for review.
              Continue?
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

function DecisionRadioPill({
  active,
  onClick,
  label,
  tone,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  tone: "primary" | "neutral";
  disabled?: boolean;
}) {
  const activeTone =
    tone === "primary"
      ? "border-primary bg-primary/10 text-primary"
      : "border-foreground/40 bg-background text-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60",
        active
          ? activeTone
          : "border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <span
        className={cn(
          "flex size-4 items-center justify-center rounded-full border",
          active
            ? tone === "primary"
              ? "border-primary"
              : "border-foreground"
            : "border-input bg-background"
        )}
        aria-hidden="true"
      >
        {active && (
          <span
            className={cn(
              "size-2 rounded-full",
              tone === "primary" ? "bg-primary" : "bg-foreground"
            )}
          />
        )}
      </span>
      {label}
    </button>
  );
}

const PRESCRIPTION_SEGMENTS: ReadonlyArray<{
  value: PrescriptionChoice;
  label: string;
  icon?: typeof Link2;
}> = [
  { value: "erx", label: "ERX", icon: Link2 },
  { value: "internal", label: "Internal" },
  { value: "none", label: "None" },
];

function PrescriptionSegmentedToggle({
  value,
  onChange,
  disabled,
}: {
  value: PrescriptionChoice;
  onChange: (next: PrescriptionChoice) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Prescription delivery"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted p-1 text-xs font-medium",
        disabled && "opacity-60"
      )}
    >
      {PRESCRIPTION_SEGMENTS.map((segment) => {
        const Icon = segment.icon;
        const active = value === segment.value;
        return (
          <button
            key={segment.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(segment.value)}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-md px-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed",
              active
                ? "bg-background text-foreground shadow-xs ring-1 ring-border/60"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {Icon && <Icon className="size-3.5" />}
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}

function InternalRxSummaryCard({
  count,
  allValid,
}: {
  count: number;
  allValid: boolean;
}) {
  const empty = count === 0;
  const incomplete = !empty && !allValid;
  const body = empty
    ? "Use the panel on the right to add medications."
    : incomplete
      ? `${count} medication${count === 1 ? "" : "s"} added · finish required fields in the side panel.`
      : `${count} medication${count === 1 ? "" : "s"} ready to save with this consultation.`;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-md",
          empty || incomplete
            ? "bg-muted text-muted-foreground"
            : "bg-primary/10 text-primary"
        )}
      >
        <Pill className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">Internal prescription</p>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function PrescriptionActionCard({
  choice,
  disabled,
  onOpenParchment,
}: {
  choice: Exclude<PrescriptionChoice, "internal">;
  disabled?: boolean;
  onOpenParchment: () => void;
}) {
  const config = (() => {
    switch (choice) {
      case "erx":
        return {
          Icon: Link2,
          iconTone: "bg-primary/10 text-primary",
          title: "Send via ERX",
          body: "Opens in a new tab. The script returns to us manually - you can still finalise here.",
          action: (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-md px-3 text-sm"
              onClick={onOpenParchment}
              disabled={disabled}
            >
              Open ERX
              <ExternalLink className="size-3.5" />
            </Button>
          ),
        };
      case "none":
      default:
        return {
          Icon: Check,
          iconTone: "bg-muted text-muted-foreground",
          title: "No script this consultation",
          body: "Consultation finalises as a check-in only.",
          action: null as React.ReactNode,
        };
    }
  })();

  const { Icon, iconTone, title, body, action } = config;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-md",
          iconTone
        )}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{body}</p>
      </div>
      {action && <div className="ml-2 shrink-0 self-center">{action}</div>}
    </div>
  );
}

function StepBlock({
  number,
  title,
  children,
  disabled,
  disabledHint,
  required,
  headerRight,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
  disabledHint?: string;
  required?: boolean;
  headerRight?: React.ReactNode;
}) {
  return (
    <section className={cn(disabled && "opacity-60")}>
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
          {required && (
            <span aria-hidden="true" className="ml-1 text-status-danger-fg">
              *
            </span>
          )}
        </h3>
        {disabled && disabledHint && (
          <span className="text-xs font-normal text-muted-foreground">
            {disabledHint}
          </span>
        )}
        {headerRight && <div className="ml-auto">{headerRight}</div>}
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
  const clinicalHref = clinicalRecord?.id
    ? `/patients/${encodeURIComponent(task.patientId)}/clinical?selected=${encodeURIComponent(clinicalRecord.id)}`
    : `/patients/${encodeURIComponent(task.patientId)}/clinical`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <StatusBadge variant={clinicalVariant}>{clinicalLabel}</StatusBadge>
        {!alreadyApproved && canDecide && (
          <span className="text-xs text-muted-foreground">
            Applied when you finalise - nothing changes until then.
          </span>
        )}
        <a
          href={clinicalHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded text-xs font-medium text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
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
          Already approved - no action needed.
        </p>
      ) : canDecide ? (
        <div className="flex flex-wrap items-center gap-2">
          <DecisionRadioPill
            active={decision === "approve"}
            onClick={() => onDecisionChange("approve")}
            label="Approve"
            tone="primary"
          />
          <DecisionRadioPill
            active={decision === "reject"}
            onClick={() => onDecisionChange("reject")}
            label="Reject"
            tone="neutral"
          />
        </div>
      ) : (
        <p className="text-xs leading-snug text-muted-foreground">
          No clinical record to review.
        </p>
      )}
    </div>
  );
}
