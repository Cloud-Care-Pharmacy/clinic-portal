"use client";

import { useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { NewTaskSheet } from "@/components/tasks/NewTaskSheet";
import { PageHeader } from "@/components/shared/PageHeader";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { MeModeToggle } from "@/components/tasks/MeModeToggle";
import { TaskDetailSheet } from "@/components/tasks/TaskDetailSheet";
import { TaskTable } from "@/components/tasks/TaskTable";
import { TaskQueueBulkActions } from "@/components/tasks/TaskQueueBulkActions";
import {
  TaskQueuePresetBar,
  FALLBACK_TASK_PRESETS,
} from "@/components/tasks/TaskQueuePresetBar";
import {
  TaskCallDialog,
  TaskOutcomeDialog,
  type TaskCallData,
  type TaskOutcomeMode,
  type TaskOutcomeSubmission,
} from "@/components/tasks/TaskCallWorkflow";
import {
  useCreateConsultation,
  useDeleteConsultation,
  useUpdateConsultation,
} from "@/lib/hooks/use-consultations";
import {
  createPrescription,
  CreatePrescriptionError,
} from "@/lib/hooks/use-prescriptions";
import type { Medication as ManualRxMedication } from "@/components/prescriptions/manual-rx/types";
import type {
  CreatePrescriptionMedicationInput,
  PrescriptionMedicationForm,
  PrescriptionMedicationRoute,
} from "@/types";
import {
  useAllTasks,
  useClaimTasks,
  useTaskPresets,
  useUpdateTask,
} from "@/lib/hooks/use-tasks";
import { patientQueryOptions } from "@/lib/hooks/use-patients";
import { useProfile } from "@/lib/hooks/use-profile";
import type {
  BulkTaskResult,
  ConsultationType,
  Task,
  TaskQueuePresetDef,
  TasksListResponse,
} from "@/types";

interface TasksClientProps {
  entityId: string;
  initialTasks?: TasksListResponse;
}

const EMPTY_TASKS: Task[] = [];
const EMPTY_STRING_ARRAY: string[] = [];

function pluralizeTask(count: number) {
  return `task${count === 1 ? "" : "s"}`;
}

function outcomeDetails(items: string[]) {
  const details = Array.from(new Set(items.filter(Boolean))).slice(0, 3);
  if (items.length > details.length) {
    details.push("More details are available in the task history.");
  }
  return details.join("\n");
}

function showBulkClaimResult(result: BulkTaskResult) {
  const successMessages: string[] = [];
  if (result.claimed.length > 0) {
    successMessages.push(
      `Claimed ${result.claimed.length} ${pluralizeTask(result.claimed.length)}.`
    );
  }
  if (result.started.length > 0) {
    successMessages.push(
      `Started ${result.started.length} ${pluralizeTask(result.started.length)}.`
    );
  }

  if (successMessages.length > 0) toast.success(successMessages.join(" "));

  if (result.skipped.length > 0) {
    toast.info(
      `Skipped ${result.skipped.length} ${pluralizeTask(result.skipped.length)}.`,
      {
        description: outcomeDetails(result.skipped.map((item) => item.reason)),
      }
    );
  }

  if (result.failed.length > 0) {
    toast.error(
      `Failed ${result.failed.length} ${pluralizeTask(result.failed.length)}.`,
      {
        description: outcomeDetails(result.failed.map((item) => item.error)),
      }
    );
  }
}

function isUnassigned(task: Task) {
  return !task.assignedUserId && !task.assignedRole;
}

function asArray(value: unknown): string[] | undefined {
  if (Array.isArray(value))
    return value.filter((v): v is string => typeof v === "string");
  if (typeof value === "string") return [value];
  return undefined;
}

/** Resolve the literal "<self>" placeholder used in preset filter values. */
function resolveAssignedUserId(value: unknown, currentUserId?: string) {
  if (value === "<self>") return currentUserId ?? undefined;
  if (typeof value === "string") return value;
  return undefined;
}

function isSelfAssignedFilter(value: unknown, currentUserId?: string) {
  return value === "<self>" || (Boolean(currentUserId) && value === currentUserId);
}

function matchesTaskQueuePreset(
  task: Task,
  filter: Record<string, unknown>,
  currentUserId: string | undefined,
  meModeActive: boolean
) {
  const statuses = asArray(filter.status);
  if (statuses && !statuses.includes(task.status)) return false;

  // Unassigned presets always show every unassigned task — Me mode does not apply.
  const isUnassignedPreset =
    "assignedUserId" in filter && filter.assignedUserId === null;

  if ("assignedUserId" in filter) {
    const raw = filter.assignedUserId;
    if (raw === null) {
      if (!isUnassigned(task)) return false;
    } else if (isSelfAssignedFilter(raw, currentUserId)) {
      // Self-scoped presets (Claimed/Completed) become "assigned to anyone"
      // when Me mode is off, then Me mode narrows them to the current user below.
      if (isUnassigned(task)) return false;
    } else {
      const resolved = resolveAssignedUserId(raw, currentUserId);
      if (!resolved) return false;
      if (task.assignedUserId !== resolved) return false;
    }
  }

  if (
    meModeActive &&
    !isUnassignedPreset &&
    (!currentUserId || task.assignedUserId !== currentUserId)
  ) {
    return false;
  }

  return true;
}

function taskConsultationType(task: Task): ConsultationType {
  if (task.taskType === "review_intake") return "initial";
  if (task.taskType === "schedule_consultation") return "initial";
  if (task.taskType === "manual") return "follow-up";
  return "follow-up";
}

function taskNoteForOutcome(
  task: Task,
  submission: TaskOutcomeSubmission,
  mode: TaskOutcomeMode
) {
  const parts = [
    `Outcome: ${submission.outcomeId}`,
    `Mode: ${mode}`,
    submission.clinicalDecision
      ? `Clinical decision: ${submission.clinicalDecision}`
      : undefined,
    submission.prescriptionChoice
      ? `Prescription: ${submission.prescriptionChoice}`
      : undefined,
    submission.durationLabel ? `Duration: ${submission.durationLabel}` : undefined,
    submission.notes ? `Notes: ${submission.notes}` : undefined,
    submission.followupNote ? `Follow-up: ${submission.followupNote}` : undefined,
    task.description ? `Previous task note: ${task.description}` : undefined,
  ].filter(Boolean);

  return parts.join("\n");
}

const MANUAL_RX_FORM_MAP: Record<ManualRxMedication["form"], PrescriptionMedicationForm> = {
  Tablet: "tablet",
  Solution: "solution",
  Patch: "patch",
  Spray: "spray",
  Gum: "other",
  Lozenge: "other",
};

const MANUAL_RX_ROUTE_MAP: Record<ManualRxMedication["form"], PrescriptionMedicationRoute> = {
  Tablet: "oral",
  Solution: "oral",
  Patch: "transdermal",
  Spray: "buccal",
  Gum: "buccal",
  Lozenge: "buccal",
};

function toCallApiMed(m: ManualRxMedication): CreatePrescriptionMedicationInput {
  return {
    name: m.name.trim(),
    strength: m.strength.trim() || null,
    form: MANUAL_RX_FORM_MAP[m.form],
    schedule: m.schedule,
    sig: m.sig.trim(),
    qty: Number.parseInt(m.qty, 10) || 0,
    repeats: Number.parseInt(m.repeats, 10) || 0,
    brandSub: m.brandSub,
    pbs: m.pbs,
    authority: m.authority,
    pbsCode: null,
    routeAdministration: MANUAL_RX_ROUTE_MAP[m.form],
  };
}

export function TasksClient({ entityId, initialTasks }: TasksClientProps) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  // Internal `users.id` (NOT Clerk's authId) — required for consultations.doctorId.
  const profileQuery = useProfile();
  const currentInternalUserId = profileQuery.data?.data?.profile?.id;

  const presetsQuery = useTaskPresets();
  const presets = useMemo(() => {
    const raw = presetsQuery.data?.data.presets ?? FALLBACK_TASK_PRESETS;
    // Drop any "all" preset and override backend-supplied labels for portal terminology.
    return raw.flatMap((preset) => {
      if (preset.id === "all") return [];
      if (preset.id === "mine_active") return [{ ...preset, label: "Claimed" }];
      if (preset.id === "unassigned") {
        // Unassigned should surface every unassigned task regardless of status.
        const { status: _status, ...rest } = preset.filter as Record<string, unknown>;
        return [{ ...preset, filter: rest }];
      }
      return [preset];
    });
  }, [presetsQuery.data]);

  const [activePreset, setActivePreset] = useState<string>("mine_active");
  const [meModeActive, setMeModeActive] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeCall, setActiveCall] = useState<{
    task: Task;
    initial?: TaskCallData;
  } | null>(null);
  const [outcomeState, setOutcomeState] = useState<{
    task: Task;
    mode: TaskOutcomeMode;
    callData?: TaskCallData;
  } | null>(null);
  const [pendingClaimUpdates, setPendingClaimUpdates] = useState<
    Record<string, { assignee?: boolean; status?: boolean }>
  >({});
  const [pendingActionIds, setPendingActionIds] = useState<string[]>([]);

  const claimTasksMutation = useClaimTasks();
  const updateTaskMutation = useUpdateTask();
  const createConsultationMutation = useCreateConsultation();
  const updateConsultationMutation = useUpdateConsultation();
  const deleteConsultationMutation = useDeleteConsultation();

  const { data, isLoading, error } = useAllTasks(
    { sort: "dueAt", order: "asc" },
    initialTasks
  );
  const tasks = data?.data.tasks ?? EMPTY_TASKS;
  const summaryTasks = data?.data.tasks ?? initialTasks?.data.tasks ?? EMPTY_TASKS;
  const activePresetDef = useMemo(
    () =>
      presets.find((preset) => preset.id === activePreset) ??
      presets.find((preset) => preset.id === "mine_active") ??
      presets[0],
    [activePreset, presets]
  );
  const queueTasks = useMemo(() => {
    if (!activePresetDef) return EMPTY_TASKS;
    return tasks.filter((task) =>
      matchesTaskQueuePreset(
        task,
        activePresetDef.filter,
        currentInternalUserId,
        meModeActive
      )
    );
  }, [activePresetDef, currentInternalUserId, meModeActive, tasks]);

  const effectiveSelectedIds = useMemo(() => {
    if (selectedIds.length === 0) return EMPTY_STRING_ARRAY;
    const visibleIds = new Set(queueTasks.map((task) => task.taskId));
    return selectedIds.filter((id) => visibleIds.has(id));
  }, [selectedIds, queueTasks]);

  const presetCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const preset of presets) {
      counts[preset.id] = summaryTasks.filter((task) =>
        matchesTaskQueuePreset(task, preset.filter, currentInternalUserId, meModeActive)
      ).length;
    }
    return counts;
  }, [currentInternalUserId, meModeActive, summaryTasks, presets]);
  const presetCountsLoading =
    isLoading || presetsQuery.isLoading || profileQuery.isLoading;

  function applyPreset(preset: TaskQueuePresetDef) {
    setActivePreset(preset.id);
    setSelectedIds([]);
  }

  function switchPresetById(id: string) {
    const preset = presets.find((p) => p.id === id);
    if (preset) applyPreset(preset);
    else setActivePreset(id);
  }

  async function claimTaskIds(ids: string[], action: "claim" | "claim_and_start") {
    if (ids.length === 0) return;
    if (!currentInternalUserId) {
      toast.error(
        profileQuery.isLoading
          ? "Your staff profile is still loading. Try again in a moment."
          : "Unable to claim tasks because your staff profile was not found."
      );
      return;
    }

    const pending: Record<string, { assignee: boolean; status: boolean }> = {};
    for (const id of ids) {
      pending[id] = {
        assignee: true,
        status: action === "claim_and_start",
      };
    }
    setPendingClaimUpdates((prev) => ({ ...prev, ...pending }));
    setPendingActionIds((prev) => Array.from(new Set([...prev, ...ids])));

    try {
      const result = await claimTasksMutation.mutateAsync({
        taskIds: ids,
        action,
        assignedUserId: currentInternalUserId,
      });
      showBulkClaimResult(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to claim tasks.");
    } finally {
      setPendingClaimUpdates((prev) => {
        const next = { ...prev };
        for (const id of ids) delete next[id];
        return next;
      });
      setPendingActionIds((prev) => prev.filter((id) => !ids.includes(id)));
      setSelectedIds([]);
    }
  }

  async function handleClaimSelected() {
    await claimTaskIds(effectiveSelectedIds, "claim");
  }

  async function handleClaimTask(task: Task) {
    await claimTaskIds([task.taskId], "claim");
  }

  async function handleCallTask(task: Task) {
    setPendingActionIds((prev) => Array.from(new Set([...prev, task.taskId])));
    try {
      const patientResponse = await queryClient.fetchQuery(
        patientQueryOptions(task.patientId)
      );
      const phone = patientResponse?.data?.patient?.mobile?.trim();
      if (!phone) {
        toast.error("No phone number on file for this patient.");
        return;
      }

      if (task.status === "open") {
        await updateTaskMutation.mutateAsync({
          taskId: task.taskId,
          status: "in_progress",
        });
      }
      setActiveCall({
        task: {
          ...task,
          status: task.status === "open" ? "in_progress" : task.status,
        },
      });
      globalThis.location.href = `tel:${phone.replace(/[^\d+]/g, "")}`;
      toast.info("Dial started. Pick an outcome when the call ends.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start call.");
    } finally {
      setPendingActionIds((prev) => prev.filter((id) => id !== task.taskId));
    }
  }

  async function handleManualLog(task: Task) {
    if (!currentInternalUserId) {
      toast.error(
        profileQuery.isLoading
          ? "Your staff profile is still loading. Try again in a moment."
          : "Unable to log an outcome because your staff profile was not found."
      );
      return;
    }

    setPendingActionIds((prev) => Array.from(new Set([...prev, task.taskId])));
    try {
      if (isUnassigned(task)) {
        await claimTasksMutation.mutateAsync({
          taskIds: [task.taskId],
          action: "claim",
          assignedUserId: currentInternalUserId,
        });
      }
      setOutcomeState({
        task: { ...task, assignedUserId: currentInternalUserId },
        mode: "manual",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to prepare manual log.");
    } finally {
      setPendingActionIds((prev) => prev.filter((id) => id !== task.taskId));
    }
  }

  function handleHangUp(callData: TaskCallData) {
    if (!activeCall) return;
    setOutcomeState({ task: activeCall.task, mode: "hangup", callData });
    setActiveCall(null);
  }

  async function handleOutcomeSubmit(submission: TaskOutcomeSubmission) {
    if (!outcomeState) return;
    const { task, mode } = outcomeState;
    setPendingActionIds((prev) => Array.from(new Set([...prev, task.taskId])));

    try {
      if (submission.status === "completed") {
        // Attribute the consultation to the user assigned to the task. Falls back
        // to the current user (e.g. admin completing on someone's behalf, or an
        // unassigned task being completed inline).
        const doctorId = task.assignedUserId ?? currentInternalUserId;
        const consultation = await createConsultationMutation.mutateAsync({
          patientId: task.patientId,
          doctorId,
          scheduledAt: new Date().toISOString(),
          type: taskConsultationType(task),
          duration: submission.durationSeconds,
          notes: submission.notes || submission.followupNote,
        });

        try {
          await updateConsultationMutation.mutateAsync({
            id: consultation.data.consultation.id,
            status: "completed",
            outcome: submission.prescriptionChoice
              ? `${submission.outcomeId}:${submission.prescriptionChoice}`
              : submission.outcomeId,
            notes: submission.notes || submission.followupNote || null,
            duration: submission.durationSeconds ?? null,
          });
        } catch (updateErr) {
          // Roll back the orphan consultation so the list does not show a phantom
          // "scheduled" record left behind by the failed completion patch.
          await deleteConsultationMutation
            .mutateAsync(consultation.data.consultation.id)
            .catch(() => undefined);
          throw updateErr;
        }

        // Persist any prescription drafted during the call. The call modal
        // collects medications in its own composer, but TasksClient owns the
        // submit lifecycle, so the actual POST happens here.
        if (
          submission.prescriptionChoice === "internal" &&
          submission.prescriptionMeds &&
          submission.prescriptionMeds.length > 0
        ) {
          try {
            await createPrescription(task.patientId, {
              consultationId: consultation.data.consultation.id,
              prescriberId: doctorId,
              medications: submission.prescriptionMeds.map(toCallApiMed),
            });
            queryClient.invalidateQueries({
              queryKey: ["prescriptions", task.patientId],
            });
            queryClient.invalidateQueries({
              queryKey: ["patient-counts", task.patientId],
            });
            queryClient.invalidateQueries({
              queryKey: ["patient-activity", task.patientId],
            });
          } catch (rxErr) {
            const rxMessage =
              rxErr instanceof CreatePrescriptionError
                ? rxErr.message
                : rxErr instanceof Error
                  ? rxErr.message
                  : "Failed to save prescription.";
            // Consultation is already completed; surface a non-blocking warning
            // so the clinician knows the script did not persist.
            toast.error(`Consultation saved, but prescription failed: ${rxMessage}`);
          }
        }
      }

      await updateTaskMutation.mutateAsync({
        taskId: task.taskId,
        status: submission.status,
        note: taskNoteForOutcome(task, submission, mode),
      });

      setOutcomeState(null);
      toast.success(
        submission.status === "completed"
          ? "Consultation finalised."
          : "Call outcome saved."
      );
      if (submission.status === "completed") switchPresetById("completed");
      else switchPresetById("mine_active");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save outcome.");
    } finally {
      setPendingActionIds((prev) => prev.filter((id) => id !== task.taskId));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Tasks" />
      <p className="-mt-4 max-w-3xl text-sm text-muted-foreground">
        Claim work from the unassigned queue, start a phone call, and log the structured
        outcome without leaving this screen.
      </p>

      <ErrorBoundary>
        {error ? (
          <div className="rounded-lg border border-status-danger-border bg-status-danger-bg p-4 text-status-danger-fg">
            Failed to load tasks: {error.message}
          </div>
        ) : (
          <TaskTable
            tasks={queueTasks}
            loading={isLoading}
            searchQuery={searchQuery}
            onSearchChange={(value) => {
              setSelectedIds([]);
              setSearchQuery(value);
            }}
            statusFilters={[]}
            onStatusFiltersChange={() => undefined}
            currentUserId={currentInternalUserId}
            priorityFilters={[]}
            onPriorityFiltersChange={() => undefined}
            typeFilters={[]}
            onTypeFiltersChange={() => undefined}
            roleFilters={[]}
            onRoleFiltersChange={() => undefined}
            onRowClick={setSelectedTask}
            selectionEnabled={activePreset === "unassigned"}
            selectedIds={effectiveSelectedIds}
            onSelectionChange={setSelectedIds}
            pendingUpdates={pendingClaimUpdates}
            pendingActionIds={pendingActionIds}
            showFilterControls={false}
            quickFilters={
              <TaskQueuePresetBar
                presets={presets}
                activePreset={activePreset}
                counts={presetCounts}
                countsLoading={presetCountsLoading}
                onPresetChange={applyPreset}
              />
            }
            onClaimTask={handleClaimTask}
            onCallTask={handleCallTask}
            onManualLogTask={handleManualLog}
            emptyTitle={
              activePreset === "unassigned"
                ? "All tasks are claimed"
                : activePreset === "mine_active"
                  ? "Your queue is clear"
                  : "No tasks in this view"
            }
            emptyDescription={
              activePreset === "unassigned"
                ? "Nice work. Check back later when new intake or follow-up work arrives."
                : activePreset === "mine_active"
                  ? "Try the Unassigned preset to claim more work."
                  : "Completed and closed work will appear here after outcomes are saved."
            }
            bulkActions={
              effectiveSelectedIds.length > 0 ? (
                <TaskQueueBulkActions
                  selectedCount={effectiveSelectedIds.length}
                  pending={claimTasksMutation.isPending}
                  canClaim={Boolean(currentInternalUserId)}
                  onClear={() => setSelectedIds([])}
                  onClaim={handleClaimSelected}
                />
              ) : undefined
            }
            trailing={
              effectiveSelectedIds.length === 0 ? (
                <>
                  <MeModeToggle
                    active={meModeActive}
                    onToggle={(next) => {
                      setSelectedIds([]);
                      setMeModeActive(next);
                    }}
                    imageUrl={user?.imageUrl}
                    disabled={!currentInternalUserId}
                  />
                  <Button onClick={() => setNewTaskOpen(true)}>
                    <Plus className="size-4" />
                    New task
                  </Button>
                </>
              ) : undefined
            }
          />
        )}
      </ErrorBoundary>

      <TaskDetailSheet
        task={selectedTask}
        open={Boolean(selectedTask)}
        onOpenChange={(open) => {
          if (!open) setSelectedTask(null);
        }}
        onCallTask={handleCallTask}
        onLogCall={handleManualLog}
      />

      {activeCall && (
        <TaskCallDialog
          key={activeCall.task.taskId}
          task={activeCall.task}
          initialCallData={activeCall.initial}
          open
          cancelAction={() => setActiveCall(null)}
          hangUpAction={handleHangUp}
        />
      )}

      {outcomeState && (
        <TaskOutcomeDialog
          key={`${outcomeState.task.taskId}-${outcomeState.mode}`}
          task={outcomeState.task}
          mode={outcomeState.mode}
          callData={outcomeState.callData}
          open
          submitting={
            updateTaskMutation.isPending ||
            createConsultationMutation.isPending ||
            updateConsultationMutation.isPending
          }
          cancelAction={(resumeWith) => {
            if (outcomeState.mode === "hangup") {
              setActiveCall({
                task: outcomeState.task,
                initial: resumeWith ?? outcomeState.callData,
              });
            }
            setOutcomeState(null);
          }}
          submitAction={handleOutcomeSubmit}
        />
      )}

      <NewTaskSheet
        open={newTaskOpen}
        onOpenChange={setNewTaskOpen}
        entityId={entityId}
      />
    </div>
  );
}
