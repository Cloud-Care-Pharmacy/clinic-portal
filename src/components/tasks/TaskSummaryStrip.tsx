"use client";

import type { ComponentType } from "react";
import {
  AlarmClockOff,
  ClipboardCheck,
  Flag,
  ListChecks,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  {
    badgeIcon: ComponentType<{ className?: string }>;
    detailIcon: ComponentType<{ className?: string }>;
  }
> = {
  open: {
    badgeIcon: ListChecks,
    detailIcon: TrendingUp,
  },
  overdue: {
    badgeIcon: AlarmClockOff,
    detailIcon: TrendingDown,
  },
  urgent: {
    badgeIcon: Flag,
    detailIcon: TrendingUp,
  },
  intake: {
    badgeIcon: ClipboardCheck,
    detailIcon: TrendingUp,
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
      badge: `${inProgressCount} in progress`,
      description: "Active work queue",
      subtitle: "Ready for clinical action",
    },
    {
      key: "overdue" as const,
      label: "Overdue",
      value: overdueCount,
      badge: overdueCount > 0 ? `${overdueCount} overdue` : "On schedule",
      description: overdueCount > 0 ? "Needs attention" : "All on schedule",
      subtitle: "Tasks past due",
    },
    {
      key: "urgent" as const,
      label: "Urgent priority",
      value: urgentCount,
      badge: urgentCount > 0 ? `${urgentCount} urgent` : "None",
      description: urgentCount > 0 ? "Red-flag work" : "No urgent items",
      subtitle: "Highest-priority queue",
    },
    {
      key: "intake" as const,
      label: "New intake reviews",
      value: intakeCount,
      badge: `+${recentIntakeCount} in last 24h`,
      description: "Intake submissions",
      subtitle: "Awaiting clinical review",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const BadgeIcon = cardStyles[card.key].badgeIcon;
        const DetailIcon = cardStyles[card.key].detailIcon;
        const isActive = activeKey === card.key;

        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onSelect(card.key)}
            className={cn(
              "group/card flex flex-col gap-4 overflow-hidden rounded-xl bg-card py-4 text-left text-sm text-card-foreground ring-1 ring-foreground/10 transition-[box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              isActive && "ring-2 ring-primary/30"
            )}
          >
            <span className="flex items-center justify-between gap-3 px-4 pb-2">
              <span className="text-[15px] font-medium text-foreground/75">
                {card.label}
              </span>
              <Badge
                variant="outline"
                className="gap-1 rounded-full border-foreground/10 bg-popover/70 text-xs font-medium"
              >
                <BadgeIcon className="h-3 w-3" />
                {card.badge}
              </Badge>
            </span>
            <span className="space-y-3 px-4">
              <span className="stat-number block tabular-nums">{card.value}</span>
              <span className="block">
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  {card.description}
                  <DetailIcon className="h-4 w-4" />
                </span>
                <span className="mt-1 block text-[13px] text-foreground/55">
                  {card.subtitle}
                </span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
