"use client";

import { useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { NewConsultationSheet } from "@/components/consultations/NewConsultationSheet";
import { PageHeader } from "@/components/shared/PageHeader";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskDetailSheet } from "@/components/tasks/TaskDetailSheet";
import { TaskQueueTabs, type TaskQueueTab } from "@/components/tasks/TaskQueueTabs";
import {
  TaskSummaryStrip,
  type TaskSummaryKey,
} from "@/components/tasks/TaskSummaryStrip";
import { TaskTable } from "@/components/tasks/TaskTable";
import { useTasks } from "@/lib/hooks/use-tasks";
import type {
  Task,
  TaskPriority,
  TaskStatus,
  TaskType,
  TasksListResponse,
  UserRole,
} from "@/types";

interface TasksClientProps {
  initialTasks?: TasksListResponse;
}

const EMPTY_TASKS: Task[] = [];

export function TasksClient({ initialTasks }: TasksClientProps) {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<TaskQueueTab>("all");
  const [activeSummary, setActiveSummary] = useState<TaskSummaryKey | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState<TaskStatus[]>([]);
  const [priorityFilters, setPriorityFilters] = useState<TaskPriority[]>([]);
  const [typeFilters, setTypeFilters] = useState<TaskType[]>([]);
  const [roleFilters, setRoleFilters] = useState<UserRole[]>([]);
  const [dueBefore, setDueBefore] = useState<string | undefined>();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [consultationTask, setConsultationTask] = useState<Task | null>(null);

  const currentUserId = user?.id;

  function handleTabChange(tab: TaskQueueTab) {
    setActiveTab(tab);
    setActiveSummary(null);
    setDueBefore(undefined);

    if (tab === "all") setStatusFilters([]);
    if (tab === "open") setStatusFilters(["open"]);
    if (tab === "in_progress") setStatusFilters(["in_progress"]);
    if (tab === "mine") setStatusFilters(["open", "in_progress"]);
    if (tab === "completed") setStatusFilters(["completed", "cancelled"]);
  }

  function handleSummarySelect(key: TaskSummaryKey) {
    setActiveSummary(key);
    setActiveTab("all");
    setStatusFilters(["open", "in_progress"]);
    setDueBefore(key === "overdue" ? new Date().toISOString() : undefined);
    setPriorityFilters(key === "urgent" ? ["urgent"] : []);
    setTypeFilters(key === "intake" ? ["review_intake"] : []);
  }

  const query = useMemo(
    () => ({
      limit: 50,
      offset: 0,
      search: searchQuery.trim() || undefined,
      status: statusFilters.length > 0 ? statusFilters : undefined,
      priority: priorityFilters.length > 0 ? priorityFilters : undefined,
      taskType: typeFilters.length > 0 ? typeFilters : undefined,
      assignedRole: roleFilters.length > 0 ? roleFilters : undefined,
      assignedUserId:
        activeTab === "mine"
          ? (currentUserId ?? "__current_user_unavailable__")
          : undefined,
      dueBefore,
      sort: "dueAt" as const,
      order: "asc" as const,
    }),
    [
      activeTab,
      currentUserId,
      dueBefore,
      priorityFilters,
      roleFilters,
      searchQuery,
      statusFilters,
      typeFilters,
    ]
  );
  const canUseInitialTasks =
    activeTab === "all" &&
    !dueBefore &&
    !searchQuery.trim() &&
    statusFilters.length === 0 &&
    priorityFilters.length === 0 &&
    typeFilters.length === 0 &&
    roleFilters.length === 0;
  const { data, isLoading, error } = useTasks(
    query,
    canUseInitialTasks ? initialTasks : undefined
  );
  const tasks = data?.data.tasks ?? EMPTY_TASKS;
  const summaryTasks = initialTasks?.data.tasks ?? data?.data.tasks ?? EMPTY_TASKS;
  const tabCounts = useMemo(
    () => ({
      all: summaryTasks.length,
      open: summaryTasks.filter((task) => task.status === "open").length,
      in_progress: summaryTasks.filter((task) => task.status === "in_progress").length,
      mine: currentUserId
        ? summaryTasks.filter(
            (task) =>
              task.assignedUserId === currentUserId &&
              (task.status === "open" || task.status === "in_progress")
          ).length
        : 0,
      completed: summaryTasks.filter(
        (task) => task.status === "completed" || task.status === "cancelled"
      ).length,
    }),
    [currentUserId, summaryTasks]
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Tasks" />
      <p className="-mt-4 text-sm text-muted-foreground">
        Review intake submissions, claim work, and move patients toward their next
        clinical action.
      </p>

      <TaskSummaryStrip
        tasks={summaryTasks}
        activeKey={activeSummary}
        onSelect={handleSummarySelect}
      />

      <TaskQueueTabs
        activeTab={activeTab}
        counts={tabCounts}
        onTabChange={handleTabChange}
      />

      <ErrorBoundary>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
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
            onSearchChange={setSearchQuery}
            statusFilters={statusFilters}
            onStatusFiltersChange={(value) => {
              setActiveTab("all");
              setActiveSummary(null);
              setDueBefore(undefined);
              setStatusFilters(value);
            }}
            priorityFilters={priorityFilters}
            onPriorityFiltersChange={(value) => {
              setActiveSummary(null);
              setPriorityFilters(value);
            }}
            typeFilters={typeFilters}
            onTypeFiltersChange={(value) => {
              setActiveSummary(null);
              setTypeFilters(value);
            }}
            roleFilters={roleFilters}
            onRoleFiltersChange={(value) => {
              setActiveSummary(null);
              setRoleFilters(value);
            }}
            onRowClick={setSelectedTask}
            onScheduleConsultation={setConsultationTask}
          />
        )}
      </ErrorBoundary>

      <TaskDetailSheet
        task={selectedTask}
        open={Boolean(selectedTask)}
        onOpenChange={(open) => {
          if (!open) setSelectedTask(null);
        }}
        onScheduleConsultation={setConsultationTask}
      />

      <NewConsultationSheet
        open={Boolean(consultationTask)}
        onOpenChange={(open) => {
          if (!open) setConsultationTask(null);
        }}
        defaultPatientId={consultationTask?.patientId}
        defaultPatientName={consultationTask?.patientName ?? undefined}
      />
    </div>
  );
}
