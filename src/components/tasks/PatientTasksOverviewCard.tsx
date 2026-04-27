"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardCheck, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { NewTaskSheet } from "@/components/tasks/NewTaskSheet";
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
  patientName?: string;
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
  patientName,
  initialTasks,
}: PatientTasksOverviewCardProps) {
  const [newTaskOpen, setNewTaskOpen] = useState(false);
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
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => setNewTaskOpen(true)}
          >
            <ListTodo className="size-4" />
            New task
          </Button>
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

      <NewTaskSheet
        open={newTaskOpen}
        onOpenChange={setNewTaskOpen}
        defaultPatientId={patientId}
        defaultPatientName={patientName}
      />
    </div>
  );
}
