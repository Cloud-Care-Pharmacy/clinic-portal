"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  CalendarPlus,
  CheckCircle2,
  ClipboardCheck,
  Play,
  UserCheck,
  XCircle,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";
import { AppSheet } from "@/components/shared/AppSheet";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  useClaimTasks,
  useCompleteTask,
  useTask,
  useUpdateTask,
} from "@/lib/hooks/use-tasks";
import { cn } from "@/lib/utils";
import type { Task, TaskEvent, TaskResponse, UserRole } from "@/types";
import {
  formatTaskDateTime,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_VARIANTS,
  TASK_STATUS_LABELS,
  TASK_STATUS_VARIANTS,
  TASK_TYPE_LABELS,
} from "@/components/tasks/task-format";

interface TaskDetailSheetProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduleConsultation?: (task: Task) => void;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[132px_1fr] gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-foreground">{value || "—"}</dd>
    </div>
  );
}

function eventLabel(event: TaskEvent) {
  return event.eventType.replace(/^task-/, "").replace(/-/g, " ");
}

function buildInitialResponse(task: Task | null): TaskResponse | undefined {
  if (!task) return undefined;
  return { success: true, data: { task, events: [] } };
}

export function TaskDetailSheet({
  task,
  open,
  onOpenChange,
  onScheduleConsultation,
}: TaskDetailSheetProps) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const { user } = useUser();
  const claimTask = useClaimTasks();
  const updateTask = useUpdateTask();
  const completeTask = useCompleteTask();
  const { data } = useTask(task?.taskId, buildInitialResponse(task));
  const detailTask = data?.data.task ?? task;
  const events = data?.data.events ?? [];
  const isPending =
    claimTask.isPending || updateTask.isPending || completeTask.isPending;

  if (!detailTask) return null;

  const activeTask = detailTask;

  const canAction =
    activeTask.status !== "completed" && activeTask.status !== "cancelled";
  const isAssignedToCurrentUser =
    Boolean(user?.id) &&
    activeTask.assignedUserId === user?.id &&
    !activeTask.assignedRole;
  const currentRole = (user?.publicMetadata?.role as UserRole | undefined) ?? "staff";
  const currentUserName =
    user?.fullName || user?.primaryEmailAddress?.emailAddress || "Current user";
  const assignedToLabel =
    activeTask.assignedUserName ||
    (activeTask.assignedUserId
      ? activeTask.assignedUserId === user?.id
        ? currentUserName
        : "Assigned user"
      : activeTask.assignedRole
        ? `${activeTask.assignedRole} queue`
        : "Unassigned");

  function handleUpdate(
    payload: Parameters<typeof updateTask.mutate>[0],
    message: string
  ) {
    updateTask.mutate(payload, {
      onSuccess: () => toast.success(message),
      onError: (error) => toast.error(error.message),
    });
  }

  function handleClaim() {
    if (!user?.id || isAssignedToCurrentUser) return;
    claimTask.mutate(
      { taskIds: [activeTask.taskId], action: "claim" },
      {
        onSuccess: (response) => {
          if (response.data.claimed.length > 0) toast.success("Task claimed");
          if (response.data.skipped.length > 0)
            toast.info(response.data.skipped[0].reason);
          if (response.data.failed.length > 0)
            toast.error(response.data.failed[0].error);
        },
        onError: (error) => toast.error(error.message),
      }
    );
  }

  function handleStart() {
    handleUpdate(
      {
        taskId: activeTask.taskId,
        status: "in_progress",
        note: "Task started",
      },
      "Task started"
    );
  }

  function handleComplete() {
    completeTask.mutate(
      { taskId: activeTask.taskId, note: "Task completed" },
      {
        onSuccess: () => {
          toast.success("Task completed");
          onOpenChange(false);
        },
        onError: (error) => toast.error(error.message),
      }
    );
  }

  function handleCancel() {
    handleUpdate(
      {
        taskId: activeTask.taskId,
        status: "cancelled",
        note: "Task cancelled",
      },
      "Task cancelled"
    );
    setCancelOpen(false);
    onOpenChange(false);
  }

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={onOpenChange}
        title={activeTask.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge variant={TASK_STATUS_VARIANTS[activeTask.status]}>
              {TASK_STATUS_LABELS[activeTask.status]}
            </StatusBadge>
            <StatusBadge variant={TASK_PRIORITY_VARIANTS[activeTask.priority]}>
              {TASK_PRIORITY_LABELS[activeTask.priority]}
            </StatusBadge>
          </span>
        }
        footer={
          canAction ? (
            <>
              <Button
                variant="outline"
                disabled={isPending || !user?.id || isAssignedToCurrentUser}
                onClick={handleClaim}
                title={`Claim as ${currentRole}`}
              >
                <UserCheck className="size-4" />
                {isAssignedToCurrentUser ? "Claimed" : "Claim"}
              </Button>
              {activeTask.status === "open" && (
                <Button variant="outline" disabled={isPending} onClick={handleStart}>
                  <Play className="size-4" />
                  Start
                </Button>
              )}
              {onScheduleConsultation && (
                <Button
                  variant="outline"
                  disabled={isPending}
                  onClick={() => onScheduleConsultation(activeTask)}
                >
                  <CalendarPlus className="size-4" />
                  Schedule
                </Button>
              )}
              <Button disabled={isPending} onClick={handleComplete}>
                <CheckCircle2 className="size-4" />
                Complete
              </Button>
              <Button
                variant="outline-destructive"
                disabled={isPending}
                onClick={() => setCancelOpen(true)}
              >
                <XCircle className="size-4" />
                Cancel task
              </Button>
            </>
          ) : null
        }
      >
        <div className="space-y-5">
          <section>
            <h3 className="mb-3 text-sm font-semibold">Task details</h3>
            <dl className="divide-y divide-border rounded-xl border border-border bg-card px-4">
              <DetailRow
                label="Type"
                value={TASK_TYPE_LABELS[activeTask.taskType] ?? activeTask.taskType}
              />
              <DetailRow label="Due" value={formatTaskDateTime(activeTask.dueAt)} />
              <DetailRow
                label="Created"
                value={formatTaskDateTime(activeTask.createdAt)}
              />
              <DetailRow label="Assigned to" value={assignedToLabel} />
              <DetailRow label="Source" value={activeTask.source} />
            </dl>
          </section>

          {activeTask.description && (
            <section>
              <h3 className="mb-2 text-sm font-semibold">Description</h3>
              <p className="rounded-xl border border-border bg-card p-4 text-sm leading-6 text-muted-foreground">
                {activeTask.description}
              </p>
            </section>
          )}

          <section>
            <h3 className="mb-3 text-sm font-semibold">Patient</h3>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="font-medium">
                {activeTask.patientName || "Patient record"}
              </p>
              <Link
                href={`/patients/${encodeURIComponent(activeTask.patientId)}`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "mt-3"
                )}
                scroll={false}
              >
                Open patient profile
              </Link>
            </div>
          </section>

          {events.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-semibold">Task history</h3>
              <div className="rounded-xl border border-border bg-card">
                {events.map((event, index) => (
                  <div key={event.eventId}>
                    {index > 0 && <Separator />}
                    <div className="flex gap-3 px-4 py-3">
                      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[10px] border border-status-info-border bg-status-info-bg text-status-info-fg">
                        <ClipboardCheck className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="capitalize text-sm font-medium">
                          {eventLabel(event)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTaskDateTime(event.createdAt)}
                          {event.actorName ? ` · ${event.actorName}` : ""}
                        </p>
                        {event.note && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {event.note}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </AppSheet>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel task?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the task from the active queue. Use this only when the task
              is no longer needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Keep task</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault();
                handleCancel();
              }}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Cancel task
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
