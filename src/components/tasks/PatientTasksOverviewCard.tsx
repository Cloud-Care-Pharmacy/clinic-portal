"use client";

import Link from "next/link";
import { ClipboardCheck, AlertTriangle, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { usePatientTasks } from "@/lib/hooks/use-tasks";
import { cn } from "@/lib/utils";
import type { Task, TasksListResponse } from "@/types";
import {
  formatTaskDueRelative,
  isTaskOverdue,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_VARIANTS,
  TASK_STATUS_LABELS,
  TASK_STATUS_VARIANTS,
  TASK_TYPE_LABELS,
} from "@/components/tasks/task-format";

interface PatientTasksOverviewCardProps {
  patientId: string;
  initialTasks?: TasksListResponse;
}

const PRIORITY_DOT: Record<Task["priority"], string> = {
  urgent: "bg-status-danger-fg",
  high: "bg-status-warning-fg",
  normal: "bg-status-info-fg",
  low: "bg-status-neutral-fg",
};

function TaskRow({ task }: { task: Task }) {
  const overdue =
    isTaskOverdue(task.dueAt) &&
    task.status !== "completed" &&
    task.status !== "cancelled";
  const due = formatTaskDueRelative(task.dueAt, task.status);

  return (
    <Link
      href={`/patients/${encodeURIComponent(task.patientId)}/tasks?selected=${encodeURIComponent(task.taskId)}`}
      scroll={false}
      className="group flex min-h-11 items-center gap-3 rounded-lg -mx-2 px-2 py-2.5 transition-colors duration-120 hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span
        aria-hidden
        className={cn(
          "mt-1 size-2 shrink-0 self-start rounded-full",
          PRIORITY_DOT[task.priority]
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground" title={task.title}>
          {task.title}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {TASK_TYPE_LABELS[task.taskType] ?? task.taskType}
          <span className="mx-1.5 text-border">·</span>
          <span className={cn(overdue && "font-medium text-status-danger-fg")}>
            {due}
          </span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <StatusBadge variant={TASK_PRIORITY_VARIANTS[task.priority]}>
          {TASK_PRIORITY_LABELS[task.priority]}
        </StatusBadge>
        <StatusBadge variant={TASK_STATUS_VARIANTS[task.status]}>
          {TASK_STATUS_LABELS[task.status]}
        </StatusBadge>
      </div>
    </Link>
  );
}

function StatPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "warning" | "info" | "danger";
}) {
  const toneClass = {
    neutral: "text-foreground",
    warning: "text-status-warning-fg",
    info: "text-status-info-fg",
    danger: "text-status-danger-fg",
  }[tone];
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className={cn("text-sm font-semibold leading-none tabular-nums", toneClass)}
      >
        {value}
      </span>
      <span className="text-[11px] uppercase leading-none tracking-[0.06em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export function PatientTasksOverviewCard({
  patientId,
  initialTasks,
}: PatientTasksOverviewCardProps) {
  const { data, isLoading, error } = usePatientTasks(
    patientId,
    {
      limit: 4,
      offset: 0,
      status: ["open", "in_progress"],
      sort: "dueAt",
      order: "asc",
    },
    initialTasks
  );
  const tasks = data?.data.tasks ?? [];
  const total = data?.data.pagination?.total ?? tasks.length;

  const openCount = tasks.filter((t) => t.status === "open").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const overdueCount = tasks.filter(
    (t) =>
      isTaskOverdue(t.dueAt) && t.status !== "completed" && t.status !== "cancelled"
  ).length;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-[10px] border border-status-warning-border bg-status-warning-bg text-status-warning-fg">
            <ClipboardCheck className="size-4" />
          </span>
          <h3 className="text-base font-semibold leading-tight tracking-[-0.01em]">
            Open tasks
          </h3>
          {total > 0 && (
            <span className="ml-1 inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
              {total}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/patients/${encodeURIComponent(patientId)}/tasks?action=new`}
            scroll={false}
            className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-[13px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Plus className="size-3.5" />
            New
          </Link>
          <Link
            href={`/patients/${encodeURIComponent(patientId)}/tasks`}
            scroll={false}
            className="inline-flex min-h-9 items-center rounded-md px-2 text-[13px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            View all
          </Link>
        </div>
      </div>

      {!isLoading && !error && tasks.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5">
          <StatPill label="Open" value={openCount} tone="warning" />
          <StatPill label="In progress" value={inProgressCount} tone="info" />
          <StatPill
            label="Overdue"
            value={overdueCount}
            tone={overdueCount > 0 ? "danger" : "neutral"}
          />
          {overdueCount > 0 && (
            <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-status-danger-fg">
              <AlertTriangle className="size-3.5" />
              Action required
            </span>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <p className="rounded-xl border border-status-warning-border bg-status-warning-bg px-3 py-3 text-sm text-status-warning-fg">
          Tasks could not be loaded.
        </p>
      ) : tasks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
          No open tasks for this patient.
        </p>
      ) : (
        <div className="flex flex-col">
          {tasks.map((task, i) => (
            <div key={task.taskId}>
              {i > 0 && <div className="h-px bg-border/60" />}
              <TaskRow task={task} />
            </div>
          ))}
          {total > tasks.length && (
            <p className="pt-2 text-xs text-muted-foreground tabular-nums">
              {total - tasks.length} more open task
              {total - tasks.length === 1 ? "" : "s"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
("use client");

import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { usePatientTasks } from "@/lib/hooks/use-tasks";
import type { Task, TasksListResponse } from "@/types";
import {
  formatTaskDate,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_VARIANTS,
  TASK_STATUS_LABELS,
  TASK_STATUS_VARIANTS,
  TASK_TYPE_LABELS,
} from "@/components/tasks/task-format";

interface PatientTasksOverviewCardProps {
  patientId: string;
  initialTasks?: TasksListResponse;
}

function TaskRow({ task }: { task: Task }) {
  return (
    <Link
      href={`/patients/${encodeURIComponent(task.patientId)}/tasks?selected=${encodeURIComponent(task.taskId)}`}
      scroll={false}
      className="block rounded-xl border border-border bg-background px-3 py-3 transition-colors hover:bg-muted/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium" title={task.title}>
            {task.title}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {TASK_TYPE_LABELS[task.taskType] ?? task.taskType} · Due{" "}
            {formatTaskDate(task.dueAt)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusBadge variant={TASK_STATUS_VARIANTS[task.status]}>
            {TASK_STATUS_LABELS[task.status]}
          </StatusBadge>
          <StatusBadge variant={TASK_PRIORITY_VARIANTS[task.priority]}>
            {TASK_PRIORITY_LABELS[task.priority]}
          </StatusBadge>
        </div>
      </div>
    </Link>
  );
}

export function PatientTasksOverviewCard({
  patientId,
  initialTasks,
}: PatientTasksOverviewCardProps) {
  const { data, isLoading, error } = usePatientTasks(
    patientId,
    {
      limit: 5,
      offset: 0,
      status: ["open", "in_progress"],
      sort: "dueAt",
      order: "asc",
    },
    initialTasks
  );
  const tasks = data?.data.tasks ?? [];
  const total = data?.data.pagination?.total ?? tasks.length;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-[10px] border border-status-warning-border bg-status-warning-bg text-status-warning-fg">
            <ClipboardCheck className="size-4" />
          </span>
          <h3 className="text-base font-semibold leading-tight tracking-[-0.01em]">
            Open tasks
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/patients/${encodeURIComponent(patientId)}/tasks`}
            scroll={false}
            className="inline-flex min-h-11 items-center rounded-md text-[13px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            View all
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <p className="rounded-xl border border-status-warning-border bg-status-warning-bg px-3 py-3 text-sm text-status-warning-fg">
          Tasks could not be loaded.
        </p>
      ) : tasks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
          No open tasks for this patient.
        </p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskRow key={task.taskId} task={task} />
          ))}
          {total > tasks.length && (
            <p className="pt-1 text-xs text-muted-foreground tabular-nums">
              {total - tasks.length} more open tasks
            </p>
          )}
        </div>
      )}
    </div>
  );
}
