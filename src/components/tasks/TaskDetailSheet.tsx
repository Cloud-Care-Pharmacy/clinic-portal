"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Clock,
  ExternalLink,
  FileText,
  Inbox,
  MoreHorizontal,
  PencilLine,
  Phone,
  Play,
  User,
  UserCheck,
  UserMinus,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { AppSheet } from "@/components/shared/AppSheet";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useCompleteTask, useTask, useUpdateTask } from "@/lib/hooks/use-tasks";
import { useLastDefined } from "@/lib/hooks/use-last-defined";
import { useProfile } from "@/lib/hooks/use-profile";
import type { Task, TaskEvent, TaskResponse } from "@/types";
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
  onCallTask?: (task: Task) => void;
  onLogCall?: (task: Task) => void;
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-8  shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}

function eventLabel(event: TaskEvent) {
  return event.eventType.replace(/^task-/, "").replace(/[-_]/g, " ");
}

function TaskHistory({
  events,
  loading,
  errorMessage,
}: {
  events: TaskEvent[];
  loading: boolean;
  errorMessage?: string;
}) {
  return (
    <>
      <Separator />
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="size-4  text-muted-foreground" />
          <p className="text-sm font-medium">Task history</p>
        </div>
        <div className="rounded-md border bg-muted/30 p-2 text-sm">
          {loading ? (
            <div className="space-y-2" aria-label="Loading task history">
              <Skeleton className="size-4 /5" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : errorMessage ? (
            <p className="text-muted-foreground">
              Task history could not be loaded. Try refreshing this task.
            </p>
          ) : events.length === 0 ? (
            <p className="text-muted-foreground">
              No task history has been recorded yet.
            </p>
          ) : (
            <ul className="space-y-1">
              {events.map((event) => (
                <li
                  key={event.eventId}
                  className="flex items-start justify-between gap-2"
                >
                  <span className="min-w-0">
                    <span className="font-medium capitalize">{eventLabel(event)}</span>
                    {event.note && (
                      <span className="text-muted-foreground"> · {event.note}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatTaskDateTime(event.createdAt)}
                    {event.actorName ? ` · ${event.actorName}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
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
  onCallTask,
  onLogCall,
}: TaskDetailSheetProps) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const profileQuery = useProfile();
  const currentInternalUserId = profileQuery.data?.data?.profile?.id;
  const updateTask = useUpdateTask();
  const completeTask = useCompleteTask();
  const taskQuery = useTask(task?.taskId, buildInitialResponse(task));
  const { data } = taskQuery;
  const detailTask = data?.data.task ?? task;
  const events = data?.data.events ?? [];
  const isPending = updateTask.isPending || completeTask.isPending;

  // Keep the previous task visible during the close transition so the sheet
  // can animate out without flashing empty content. Also keeps the AppSheet
  // mounted across opens so the slide-in animation plays the first time a
  // task is selected (mirrors ConsultationDetailSheet).
  const lastTask = useLastDefined(detailTask);

  if (!lastTask) {
    return (
      <AppSheet open={open} onOpenChange={onOpenChange} title="Task details">
        {null}
      </AppSheet>
    );
  }

  const activeTask = lastTask;

  const canAction =
    activeTask.status !== "completed" && activeTask.status !== "cancelled";
  const isAssignedToMe =
    !!currentInternalUserId &&
    activeTask.assignedUserId === currentInternalUserId;
  const canCall = Boolean(activeTask.patientId) && Boolean(onCallTask);
  const assignedToLabel =
    activeTask.assignedUserName ||
    (activeTask.assignedUserId
      ? "Assigned user"
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
    if (!currentInternalUserId) {
      toast.error(
        profileQuery.isLoading
          ? "Your staff profile is still loading. Try again in a moment."
          : "Unable to claim task because your staff profile was not found."
      );
      return;
    }

    handleUpdate(
      {
        taskId: activeTask.taskId,
        assignedUserId: currentInternalUserId,
        assignedRole: null,
        note: "Task claimed",
      },
      "Task claimed"
    );
  }

  function handleClaimAndStart() {
    if (!currentInternalUserId) {
      toast.error(
        profileQuery.isLoading
          ? "Your staff profile is still loading. Try again in a moment."
          : "Unable to claim task because your staff profile was not found."
      );
      return;
    }

    handleUpdate(
      {
        taskId: activeTask.taskId,
        assignedUserId: currentInternalUserId,
        assignedRole: null,
        status: activeTask.status === "open" ? "in_progress" : activeTask.status,
        note: "Task claimed and started",
      },
      "Task claimed and started"
    );
  }

  function handleUnassign() {
    handleUpdate(
      {
        taskId: activeTask.taskId,
        assignedUserId: null,
        assignedRole: null,
        note: "Task unassigned",
      },
      "Task unassigned"
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

  async function handleCancel() {
    try {
      await updateTask.mutateAsync({
        taskId: activeTask.taskId,
        status: "cancelled",
        note: "Task cancelled",
      });
      toast.success("Task cancelled");
      setCancelOpen(false);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel task");
    }
  }

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={onOpenChange}
        title={activeTask.title}
        description={
          activeTask.patientName
            ? `${activeTask.patientName} — ${TASK_TYPE_LABELS[activeTask.taskType] ?? activeTask.taskType}`
            : (TASK_TYPE_LABELS[activeTask.taskType] ?? activeTask.taskType)
        }
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                disabled={isPending}
                aria-label="More actions"
              >
                <MoreHorizontal className="size-4 " />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" className="w-56">
                {canAction && (
                  <>
                    {isAssignedToMe && activeTask.status !== "in_progress" && (
                      <DropdownMenuItem
                        disabled={isPending}
                        onClick={handleComplete}
                      >
                        <CheckCircle2 className="size-4 " />
                        Mark completed
                      </DropdownMenuItem>
                    )}
                    {activeTask.status === "open" && !isAssignedToMe && (
                      <DropdownMenuItem
                        disabled={!activeTask.assignedUserId}
                        onClick={handleStart}
                      >
                        <Play className="size-4 " />
                        Start
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      disabled={
                        !activeTask.assignedUserId && !activeTask.assignedRole
                      }
                      onClick={handleUnassign}
                    >
                      <UserMinus className="size-4 " />
                      Unassign
                    </DropdownMenuItem>
                    {onScheduleConsultation && (
                      <DropdownMenuItem
                        onClick={() => onScheduleConsultation(activeTask)}
                      >
                        <CalendarPlus className="size-4 " />
                        Schedule consultation
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setCancelOpen(true)}
                    >
                      <XCircle className="size-4 " />
                      Cancel task
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {canAction ? (
              !isAssignedToMe ? (
                <div data-slot="button-group" className="inline-flex items-center">
                  <Button
                    onClick={handleClaimAndStart}
                    disabled={isPending || !currentInternalUserId}
                    className="gap-1.5 rounded-r-none border-r border-primary-foreground/20"
                  >
                    <Play className="size-4 " />
                    {updateTask.isPending ? "Claiming…" : "Claim & start"}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="inline-flex h-8 w-7 items-center justify-center rounded-r-sm bg-primary text-primary-foreground transition-colors hover:bg-primary/90 aria-expanded:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                      disabled={isPending || !currentInternalUserId}
                      aria-label="More claim actions"
                    >
                      <ChevronDown className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="top" className="w-48">
                      <DropdownMenuItem
                        disabled={isPending || !currentInternalUserId}
                        onClick={handleClaim}
                      >
                        <UserCheck className="size-4 " />
                        Claim
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : activeTask.status === "open" ? (
                <Button
                  onClick={handleStart}
                  disabled={isPending}
                  className="gap-1.5"
                >
                  <Play className="size-4 " />
                  {updateTask.isPending ? "Starting…" : "Start"}
                </Button>
              ) : activeTask.status === "in_progress" && canCall ? (
                <div data-slot="button-group" className="inline-flex items-center">
                  <Button
                    onClick={() => onCallTask?.(activeTask)}
                    disabled={isPending}
                    className="gap-1.5 rounded-r-none border-r border-primary-foreground/20"
                  >
                    <Phone className="size-4 " />
                    Call
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="inline-flex h-8 w-7 items-center justify-center rounded-r-sm bg-primary text-primary-foreground transition-colors hover:bg-primary/90 aria-expanded:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                      disabled={isPending}
                      aria-label="More call actions"
                    >
                      <ChevronDown className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="top" className="w-48">
                      <DropdownMenuItem
                        disabled={isPending}
                        onClick={handleComplete}
                      >
                        <CheckCircle2 className="size-4 " />
                        Mark completed
                      </DropdownMenuItem>
                      {onLogCall && (
                        <DropdownMenuItem onClick={() => onLogCall(activeTask)}>
                          <PencilLine className="size-4 " />
                          Log a call
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={isPending}
                  className="gap-1.5"
                >
                  <CheckCircle2 className="size-4 " />
                  {completeTask.isPending ? "Saving…" : "Mark completed"}
                </Button>
              )
            ) : null}
          </div>
        }
      >
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge variant={TASK_STATUS_VARIANTS[activeTask.status]}>
              {TASK_STATUS_LABELS[activeTask.status]}
            </StatusBadge>
            <StatusBadge variant={TASK_PRIORITY_VARIANTS[activeTask.priority]}>
              {TASK_PRIORITY_LABELS[activeTask.priority]}
            </StatusBadge>
          </div>

          <DetailRow icon={<User className="size-4 " />} label="Patient">
            {activeTask.patientId ? (
              <Link
                href={`/patients/${encodeURIComponent(activeTask.patientId)}`}
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                scroll={false}
              >
                {activeTask.patientName || "Patient record"}
                <ExternalLink className="size-3 " />
              </Link>
            ) : (
              activeTask.patientName || "—"
            )}
          </DetailRow>

          <DetailRow icon={<ClipboardList className="size-4 " />} label="Type">
            {TASK_TYPE_LABELS[activeTask.taskType] ?? activeTask.taskType}
          </DetailRow>

          <DetailRow icon={<CalendarDays className="size-4 " />} label="Due">
            {formatTaskDateTime(activeTask.dueAt) || "—"}
          </DetailRow>

          <DetailRow icon={<UserCheck className="size-4 " />} label="Assigned to">
            {assignedToLabel}
          </DetailRow>

          <DetailRow icon={<Inbox className="size-4 " />} label="Source">
            {activeTask.source || "—"}
          </DetailRow>

          <DetailRow icon={<Clock className="size-4 " />} label="Created">
            {formatTaskDateTime(activeTask.createdAt) || "—"}
          </DetailRow>

          {activeTask.description && (
            <DetailRow icon={<FileText className="size-4 " />} label="Description">
              <p className="whitespace-pre-wrap leading-6 text-muted-foreground">
                {activeTask.description}
              </p>
            </DetailRow>
          )}

          <TaskHistory
            events={events}
            loading={taskQuery.isFetching && events.length === 0}
            errorMessage={
              taskQuery.isError && events.length === 0
                ? taskQuery.error.message
                : undefined
            }
          />
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
