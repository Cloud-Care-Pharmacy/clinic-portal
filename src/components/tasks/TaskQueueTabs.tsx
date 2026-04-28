"use client";

import { Activity, Filter, UserRound, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskAssignmentFilter } from "@/components/tasks/TaskTable";
import type { TaskStatus } from "@/types";

type TaskStatusQuickFilter = "open" | "in_progress" | "completed";

interface TaskQueueTabsProps {
  assignmentFilters: TaskAssignmentFilter[];
  statusFilters: TaskStatus[];
  counts: Record<TaskAssignmentFilter | TaskStatusQuickFilter, number>;
  onAssignmentFiltersChange: (value: TaskAssignmentFilter[]) => void;
  onStatusFiltersChange: (value: TaskStatus[]) => void;
  onClearFilters: () => void;
}

const ASSIGNMENT_FILTERS: Array<{ id: TaskAssignmentFilter; label: string }> = [
  { id: "mine", label: "My tasks" },
  { id: "unassigned", label: "Unassigned" },
];

const STATUS_FILTERS: Array<{ id: TaskStatusQuickFilter; label: string }> = [
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In progress" },
  { id: "completed", label: "Completed" },
];

const QUICK_FILTER_LABELS: Record<
  TaskAssignmentFilter | TaskStatusQuickFilter,
  string
> = {
  mine: "My tasks",
  unassigned: "Unassigned",
  open: "Open",
  in_progress: "In progress",
  completed: "Completed",
};

function statusValuesForFilter(filter: TaskStatusQuickFilter): TaskStatus[] {
  if (filter === "completed") return ["completed", "cancelled"];
  return [filter];
}

function isStatusFilterActive(filter: TaskStatusQuickFilter, values: TaskStatus[]) {
  const optionValues = statusValuesForFilter(filter);
  return optionValues.some((value) => values.includes(value));
}

function toggleValue<T extends string>(values: T[], value: T) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export function TaskQueueTabs({
  assignmentFilters,
  statusFilters,
  counts,
  onAssignmentFiltersChange,
  onStatusFiltersChange,
  onClearFilters,
}: TaskQueueTabsProps) {
  const activeStatusFilters = STATUS_FILTERS.filter((filter) =>
    isStatusFilterActive(filter.id, statusFilters)
  ).map((filter) => filter.id);
  const activeFilterLabels = [...assignmentFilters, ...activeStatusFilters].map(
    (filter) => QUICK_FILTER_LABELS[filter]
  );
  const hasActiveFilters = activeFilterLabels.length > 0;

  function handleStatusToggle(filter: TaskStatusQuickFilter) {
    const values = statusValuesForFilter(filter);
    const active = values.some((value) => statusFilters.includes(value));

    if (active) {
      onStatusFiltersChange(statusFilters.filter((status) => !values.includes(status)));
      return;
    }

    onStatusFiltersChange([...statusFilters, ...values]);
  }

  return (
    <section
      aria-label="Task quick filters"
      className="rounded-[1.25rem] border border-border bg-card p-2 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <UserRound className="ml-1 size-4 shrink-0 text-muted-foreground" />
        <div className="flex flex-wrap items-center gap-2">
          {ASSIGNMENT_FILTERS.map((filter) => {
            const active = assignmentFilters.includes(filter.id);
            return (
              <QuickFilterButton
                key={filter.id}
                active={active}
                label={filter.label}
                count={counts[filter.id]}
                onClick={() =>
                  onAssignmentFiltersChange(toggleValue(assignmentFilters, filter.id))
                }
              />
            );
          })}
        </div>

        <div className="mx-2 hidden h-8 w-px bg-border sm:block" />

        <Activity className="ml-1 size-4 shrink-0 text-muted-foreground" />
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((filter) => {
            const active = isStatusFilterActive(filter.id, statusFilters);
            return (
              <QuickFilterButton
                key={filter.id}
                active={active}
                label={filter.label}
                count={counts[filter.id]}
                onClick={() => handleStatusToggle(filter.id)}
              />
            );
          })}
        </div>

        <div className="ml-auto flex min-h-11 items-center gap-2 pl-2 text-sm text-muted-foreground">
          <Filter className="size-4" />
          {hasActiveFilters ? (
            <>
              <span>Showing</span>
              <span className="font-semibold text-foreground">
                {activeFilterLabels.join(" · ")}
              </span>
              <button
                type="button"
                aria-label="Clear task quick filters"
                onClick={onClearFilters}
                className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <X className="size-4" />
              </button>
            </>
          ) : (
            <span>Showing all task queues</span>
          )}
        </div>
      </div>
    </section>
  );
}

function QuickFilterButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
          : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
          active
            ? "bg-primary-foreground/20 text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        {count}
      </span>
    </button>
  );
}
