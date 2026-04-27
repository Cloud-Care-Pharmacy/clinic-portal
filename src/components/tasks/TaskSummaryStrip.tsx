"use client";

import type { ComponentType } from "react";
import { AlarmClockOff, ClipboardCheck, Flag, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";
import { isTaskOverdue } from "@/components/tasks/task-format";

export type TaskSummaryKey = "open" | "overdue" | "urgent" | "intake";

const RECENT_INTAKE_WINDOW_MS = 86_400_000;
const TASK_SUMMARY_REFERENCE_MS = Date.now();

interface TaskSummaryStripProps {
  tasks: Task[];
  activeKey?: TaskSummaryKey | null;
  onSelect: (key: TaskSummaryKey) => void;
}

const cardStyles: Record<
  TaskSummaryKey,
  { icon: ComponentType<{ className?: string }>; tone: string }
> = {
  open: {
    icon: ListChecks,
    tone: "border-status-info-border bg-status-info-bg text-status-info-fg",
  },
  overdue: {
    icon: AlarmClockOff,
    tone: "border-status-danger-border bg-status-danger-bg text-status-danger-fg",
  },
  urgent: {
    icon: Flag,
    tone: "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
  },
  intake: {
    icon: ClipboardCheck,
    tone: "border-status-accent-border bg-status-accent-bg text-status-accent-fg",
  },
};

export function TaskSummaryStrip({
  tasks,
  activeKey,
  onSelect,
}: TaskSummaryStripProps) {
  const activeTasks = tasks.filter(
    (task) => task.status === "open" || task.status === "in_progress"
  );
  const inProgressCount = activeTasks.filter(
    (task) => task.status === "in_progress"
  ).length;
  const overdueCount = activeTasks.filter((task) => isTaskOverdue(task.dueAt)).length;
  const urgentCount = activeTasks.filter((task) => task.priority === "urgent").length;
  const intakeCount = activeTasks.filter(
    (task) => task.taskType === "review_intake"
  ).length;
  const recentIntakeCount = activeTasks.filter((task) => {
    if (task.taskType !== "review_intake") return false;
    return (
      TASK_SUMMARY_REFERENCE_MS - new Date(task.createdAt).getTime() <
      RECENT_INTAKE_WINDOW_MS
    );
  }).length;

  const cards = [
    {
      key: "open" as const,
      label: "Open tasks",
      value: activeTasks.length,
      meta: `${inProgressCount} in progress`,
    },
    {
      key: "overdue" as const,
      label: "Overdue",
      value: overdueCount,
      meta: overdueCount > 0 ? `${overdueCount} need attention` : "All on schedule",
    },
    {
      key: "urgent" as const,
      label: "Urgent priority",
      value: urgentCount,
      meta: urgentCount > 0 ? `${urgentCount} red-flag intake` : "No urgent items",
    },
    {
      key: "intake" as const,
      label: "New intake reviews",
      value: intakeCount,
      meta: `+${recentIntakeCount} in last 24h`,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = cardStyles[card.key].icon;
        const isActive = activeKey === card.key;

        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onSelect(card.key)}
            className={cn(
              "rounded-2xl border border-border bg-card p-4 text-left shadow-xs transition-[box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              isActive && "border-primary ring-2 ring-primary/20"
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] font-medium text-muted-foreground">
                {card.label}
              </span>
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-[10px] border",
                  cardStyles[card.key].tone
                )}
              >
                <Icon className="size-4" />
              </span>
            </div>
            <div className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">
              {card.value}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{card.meta}</p>
          </button>
        );
      })}
    </div>
  );
}
