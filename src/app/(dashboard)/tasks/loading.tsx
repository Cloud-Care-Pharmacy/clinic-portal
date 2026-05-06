"use client";

import { useUser } from "@clerk/nextjs";
import { Plus } from "lucide-react";
import { MeModeToggle } from "@/components/tasks/MeModeToggle";
import { TaskTable } from "@/components/tasks/TaskTable";
import {
  FALLBACK_TASK_PRESETS,
  TaskQueuePresetBar,
} from "@/components/tasks/TaskQueuePresetBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import type { Task, TaskPriority, TaskStatus, TaskType, UserRole } from "@/types";

const EMPTY_TASKS: Task[] = [];
const EMPTY_STATUS_FILTERS: TaskStatus[] = [];
const EMPTY_PRIORITY_FILTERS: TaskPriority[] = [];
const EMPTY_TYPE_FILTERS: TaskType[] = [];
const EMPTY_ROLE_FILTERS: UserRole[] = [];
const EMPTY_COUNTS: Record<string, number> = {};

export default function TasksLoading() {
  const { user } = useUser();

  return (
    <div className="space-y-6">
      <PageHeader title="Tasks" />
      <p className="-mt-4 max-w-3xl text-sm text-muted-foreground">
        Claim work from the unassigned queue, start a phone call, and log the structured
        outcome without leaving this screen.
      </p>

      <TaskTable
        tasks={EMPTY_TASKS}
        loading
        searchQuery=""
        onSearchChange={() => undefined}
        statusFilters={EMPTY_STATUS_FILTERS}
        onStatusFiltersChange={() => undefined}
        priorityFilters={EMPTY_PRIORITY_FILTERS}
        onPriorityFiltersChange={() => undefined}
        typeFilters={EMPTY_TYPE_FILTERS}
        onTypeFiltersChange={() => undefined}
        roleFilters={EMPTY_ROLE_FILTERS}
        onRoleFiltersChange={() => undefined}
        onRowClick={() => undefined}
        showFilterControls={false}
        quickFilters={
          <TaskQueuePresetBar
            presets={FALLBACK_TASK_PRESETS}
            activePreset="mine_active"
            counts={EMPTY_COUNTS}
            countsLoading
            onPresetChange={() => undefined}
          />
        }
        trailing={
          <>
            <MeModeToggle
              active
              onToggle={() => undefined}
              imageUrl={user?.imageUrl}
            />
            <Button>
              <Plus className="size-4" />
              New task
            </Button>
          </>
        }
      />
    </div>
  );
}