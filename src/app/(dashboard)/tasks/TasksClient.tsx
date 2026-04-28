"use client";

import { useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { ChevronDown, ListTodo, Play, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { NewConsultationSheet } from "@/components/consultations/NewConsultationSheet";
import { NewTaskSheet } from "@/components/tasks/NewTaskSheet";
import { PageHeader } from "@/components/shared/PageHeader";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskDetailSheet } from "@/components/tasks/TaskDetailSheet";
import { TaskQueueTabs, type TaskQueueTab } from "@/components/tasks/TaskQueueTabs";
import {
  TaskSummaryStrip,
  type TaskSummaryKey,
} from "@/components/tasks/TaskSummaryStrip";
import { TaskTable } from "@/components/tasks/TaskTable";
import { useClaimTasks, useTasks } from "@/lib/hooks/use-tasks";
import type {
  Task,
  TaskPriority,
  TaskStatus,
  TaskType,
  TasksListResponse,
  UserRole,
} from "@/types";

interface TasksClientProps {
  entityId: string;
  initialTasks?: TasksListResponse;
}

const EMPTY_TASKS: Task[] = [];
const EMPTY_STRING_ARRAY: string[] = [];

export function TasksClient({ entityId, initialTasks }: TasksClientProps) {
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
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const currentUserId = user?.id;
  const claimTasksMutation = useClaimTasks();

  function handleTabChange(tab: TaskQueueTab) {
    setActiveTab(tab);
    setActiveSummary(null);
    setDueBefore(undefined);
    setSelectedIds([]);

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

  // Derive the effective selection by intersecting with the visible tasks so
  // ids removed by tab/filter changes (or backend refresh) are dropped without
  // touching state inside an effect.
  const effectiveSelectedIds = useMemo(() => {
    if (selectedIds.length === 0) return EMPTY_STRING_ARRAY;
    const visibleIds = new Set(tasks.map((task) => task.taskId));
    return selectedIds.filter((id) => visibleIds.has(id));
  }, [selectedIds, tasks]);

  const claimableSelectedIds = useMemo(() => {
    if (effectiveSelectedIds.length === 0) return EMPTY_STRING_ARRAY;
    const selected = new Set(effectiveSelectedIds);
    return tasks
      .filter(
        (task) =>
          selected.has(task.taskId) &&
          task.status !== "completed" &&
          task.status !== "cancelled"
      )
      .map((task) => task.taskId);
  }, [effectiveSelectedIds, tasks]);

  async function handleClaimSelected(options: { start: boolean }) {
    if (!currentUserId || claimableSelectedIds.length === 0) return;
    const result = await claimTasksMutation.mutateAsync({
      taskIds: claimableSelectedIds,
      assignedUserId: currentUserId,
      ...(options.start ? { status: "in_progress" as const } : {}),
    });
    if (result.succeeded.length > 0) {
      const verb = options.start ? "Claimed and started" : "Claimed";
      toast.success(
        `${verb} ${result.succeeded.length} task${
          result.succeeded.length === 1 ? "" : "s"
        }`
      );
    }
    if (result.failed.length > 0) {
      toast.error(
        `Failed to claim ${result.failed.length} task${
          result.failed.length === 1 ? "" : "s"
        }`
      );
    }
    setSelectedIds([]);
  }

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
            onSearchChange={(value) => {
              setSelectedIds([]);
              setSearchQuery(value);
            }}
            statusFilters={statusFilters}
            onStatusFiltersChange={(value) => {
              setActiveTab("all");
              setActiveSummary(null);
              setDueBefore(undefined);
              setSelectedIds([]);
              setStatusFilters(value);
            }}
            priorityFilters={priorityFilters}
            onPriorityFiltersChange={(value) => {
              setActiveSummary(null);
              setSelectedIds([]);
              setPriorityFilters(value);
            }}
            typeFilters={typeFilters}
            onTypeFiltersChange={(value) => {
              setActiveSummary(null);
              setSelectedIds([]);
              setTypeFilters(value);
            }}
            roleFilters={roleFilters}
            onRoleFiltersChange={(value) => {
              setActiveSummary(null);
              setSelectedIds([]);
              setRoleFilters(value);
            }}
            onRowClick={setSelectedTask}
            onScheduleConsultation={setConsultationTask}
            selectionEnabled
            selectedIds={effectiveSelectedIds}
            onSelectionChange={setSelectedIds}
            bulkActions={
              effectiveSelectedIds.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="secondary"
                        disabled={
                          !currentUserId ||
                          claimableSelectedIds.length === 0 ||
                          claimTasksMutation.isPending
                        }
                      />
                    }
                  >
                    <UserCheck className="size-4" />
                    {claimTasksMutation.isPending
                      ? "Claiming…"
                      : `Claim ${claimableSelectedIds.length} task${
                          claimableSelectedIds.length === 1 ? "" : "s"
                        }`}
                    <ChevronDown className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={4} className="w-56">
                    <DropdownMenuItem
                      onClick={() => handleClaimSelected({ start: false })}
                    >
                      <UserCheck />
                      Claim
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleClaimSelected({ start: true })}
                    >
                      <Play />
                      Claim and start
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : undefined
            }
            trailing={
              <Button onClick={() => setNewTaskOpen(true)}>
                <ListTodo className="size-4" />
                New task
              </Button>
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

      <NewTaskSheet
        open={newTaskOpen}
        onOpenChange={setNewTaskOpen}
        entityId={entityId}
      />
    </div>
  );
}
