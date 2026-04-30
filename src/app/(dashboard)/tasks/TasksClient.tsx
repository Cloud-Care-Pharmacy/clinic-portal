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
import { Skeleton } from "@/components/ui/skeleton";
import { TaskDetailSheet } from "@/components/tasks/TaskDetailSheet";
import { TaskTable, type TaskAssignmentFilter } from "@/components/tasks/TaskTable";
import { TaskQueueBulkActions } from "@/components/tasks/TaskQueueBulkActions";
import {
  TaskQueuePresetBar,
  type TaskQueuePreset,
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
  useUpdateConsultation,
} from "@/lib/hooks/use-consultations";
import { useAllTasks, useClaimTasks, useUpdateTask } from "@/lib/hooks/use-tasks";
import { patientQueryOptions } from "@/lib/hooks/use-patients";
import type {
  BulkTaskResult,
  ConsultationType,
  Task,
  TaskStatus,
  TasksListResponse,
} from "@/types";

interface TasksClientProps {
  entityId: string;
  initialTasks?: TasksListResponse;
}

const EMPTY_TASKS: Task[] = [];
const EMPTY_STRING_ARRAY: string[] = [];
const ACTIVE_STATUSES: TaskStatus[] = ["open", "in_progress"];
const COMPLETED_STATUSES: TaskStatus[] = ["completed", "cancelled"];

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

function isMine(task: Task, currentUserId?: string) {
  return Boolean(
    currentUserId && task.assignedUserId === currentUserId && !task.assignedRole
  );
}

function isUnassigned(task: Task) {
  return !task.assignedUserId && !task.assignedRole;
}

function isActive(task: Task) {
  return task.status === "open" || task.status === "in_progress";
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
    submission.durationLabel ? `Duration: ${submission.durationLabel}` : undefined,
    submission.notes ? `Notes: ${submission.notes}` : undefined,
    submission.followupNote ? `Follow-up: ${submission.followupNote}` : undefined,
    task.description ? `Previous task note: ${task.description}` : undefined,
  ].filter(Boolean);

  return parts.join("\n");
}

export function TasksClient({ entityId, initialTasks }: TasksClientProps) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const currentUserId = user?.id;
  const currentDoctorName =
    user?.fullName || user?.primaryEmailAddress?.emailAddress || "Current doctor";

  const [activePreset, setActivePreset] = useState<TaskQueuePreset>("unassigned");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState<TaskStatus[]>(ACTIVE_STATUSES);
  const [assignmentFilters, setAssignmentFilters] = useState<TaskAssignmentFilter[]>([
    "unassigned",
  ]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeCallTask, setActiveCallTask] = useState<Task | null>(null);
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

  const { data, isLoading, error } = useAllTasks(
    { sort: "dueAt", order: "asc" },
    initialTasks
  );
  const tasks = data?.data.tasks ?? EMPTY_TASKS;
  const summaryTasks = data?.data.tasks ?? initialTasks?.data.tasks ?? EMPTY_TASKS;

  const effectiveSelectedIds = useMemo(() => {
    if (selectedIds.length === 0) return EMPTY_STRING_ARRAY;
    const visibleIds = new Set(tasks.map((task) => task.taskId));
    return selectedIds.filter((id) => visibleIds.has(id));
  }, [selectedIds, tasks]);

  const presetCounts = useMemo(
    () => ({
      unassigned: summaryTasks.filter((task) => isUnassigned(task) && isActive(task))
        .length,
      mine_active: summaryTasks.filter(
        (task) => isMine(task, currentUserId) && isActive(task)
      ).length,
      completed: summaryTasks.filter(
        (task) =>
          isMine(task, currentUserId) && COMPLETED_STATUSES.includes(task.status)
      ).length,
    }),
    [currentUserId, summaryTasks]
  );

  function switchPreset(preset: TaskQueuePreset) {
    setActivePreset(preset);
    setSelectedIds([]);

    if (preset === "unassigned") {
      setStatusFilters(ACTIVE_STATUSES);
      setAssignmentFilters(["unassigned"]);
      return;
    }

    if (preset === "mine_active") {
      setStatusFilters(ACTIVE_STATUSES);
      setAssignmentFilters(["mine"]);
      return;
    }

    setStatusFilters(COMPLETED_STATUSES);
    setAssignmentFilters(["mine"]);
  }

  async function claimTaskIds(ids: string[], action: "claim" | "claim_and_start") {
    if (ids.length === 0) return;
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
      const result = await claimTasksMutation.mutateAsync({ taskIds: ids, action });
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
      setActiveCallTask({
        ...task,
        status: task.status === "open" ? "in_progress" : task.status,
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
    setPendingActionIds((prev) => Array.from(new Set([...prev, task.taskId])));
    try {
      if (isUnassigned(task)) {
        await claimTasksMutation.mutateAsync({
          taskIds: [task.taskId],
          action: "claim",
        });
      }
      setOutcomeState({
        task: { ...task, assignedUserId: currentUserId },
        mode: "manual",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to prepare manual log.");
    } finally {
      setPendingActionIds((prev) => prev.filter((id) => id !== task.taskId));
    }
  }

  function handleHangUp(callData: TaskCallData) {
    if (!activeCallTask) return;
    setOutcomeState({ task: activeCallTask, mode: "hangup", callData });
    setActiveCallTask(null);
  }

  async function handleOutcomeSubmit(submission: TaskOutcomeSubmission) {
    if (!outcomeState) return;
    const { task, mode } = outcomeState;
    setPendingActionIds((prev) => Array.from(new Set([...prev, task.taskId])));

    try {
      if (submission.status === "completed") {
        const consultation = await createConsultationMutation.mutateAsync({
          patientId: task.patientId,
          patientName: task.patientName || "Patient",
          doctorId: currentUserId,
          doctorName: currentDoctorName,
          scheduledAt: new Date().toISOString(),
          type: taskConsultationType(task),
          duration: submission.durationSeconds,
          notes: submission.notes || submission.followupNote,
        });

        await updateConsultationMutation.mutateAsync({
          id: consultation.data.consultation.id,
          status: "completed",
          completedAt: new Date().toISOString(),
          outcome: submission.outcomeId,
          notes: submission.notes || submission.followupNote || null,
          duration: submission.durationSeconds ?? null,
        });
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
      if (submission.status === "completed") switchPreset("completed");
      else switchPreset("mine_active");
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
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-status-danger-border bg-status-danger-bg p-4 text-status-danger-fg">
            Failed to load tasks: {error.message}
          </div>
        ) : (
          <TaskTable
            tasks={tasks}
            total={data?.data.pagination?.total}
            loading={isLoading}
            searchQuery={searchQuery}
            onSearchChange={(value) => {
              setSelectedIds([]);
              setSearchQuery(value);
            }}
            statusFilters={statusFilters}
            onStatusFiltersChange={setStatusFilters}
            assignmentFilters={assignmentFilters}
            onAssignmentFiltersChange={setAssignmentFilters}
            currentUserId={currentUserId}
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
                activePreset={activePreset}
                counts={presetCounts}
                onPresetChange={switchPreset}
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
                  canClaim={Boolean(currentUserId)}
                  onClear={() => setSelectedIds([])}
                  onClaim={handleClaimSelected}
                />
              ) : undefined
            }
            trailing={
              effectiveSelectedIds.length === 0 ? (
                <Button onClick={() => setNewTaskOpen(true)}>
                  <Plus className="size-4" />
                  New task
                </Button>
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
      />

      {activeCallTask && (
        <TaskCallDialog
          key={activeCallTask.taskId}
          task={activeCallTask}
          open
          cancelAction={() => setActiveCallTask(null)}
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
          cancelAction={() => {
            if (outcomeState.mode === "hangup") {
              setActiveCallTask(outcomeState.task);
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
