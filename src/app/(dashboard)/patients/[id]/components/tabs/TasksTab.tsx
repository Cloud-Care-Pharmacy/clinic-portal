"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { NewConsultationSheet } from "@/components/consultations/NewConsultationSheet";
import { TaskDetailSheet } from "@/components/tasks/TaskDetailSheet";
import { TaskTable } from "@/components/tasks/TaskTable";
import { usePatientTasks } from "@/lib/hooks/use-tasks";
import type {
  Task,
  TaskPriority,
  TaskStatus,
  TaskType,
  TasksListResponse,
  UserRole,
} from "@/types";

interface TasksTabProps {
  patientId: string;
  patientName: string;
  selectedTaskId?: string;
  initialTasks?: TasksListResponse;
}

export function TasksTab({
  patientId,
  patientName,
  selectedTaskId,
  initialTasks,
}: TasksTabProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState<TaskStatus[]>([
    "open",
    "in_progress",
  ]);
  const [priorityFilters, setPriorityFilters] = useState<TaskPriority[]>([]);
  const [typeFilters, setTypeFilters] = useState<TaskType[]>([]);
  const [roleFilters, setRoleFilters] = useState<UserRole[]>([]);
  const [selectedFromRow, setSelectedFromRow] = useState<Task | null>(null);
  const [consultationTask, setConsultationTask] = useState<Task | null>(null);

  const query = useMemo(
    () => ({
      limit: 50,
      offset: 0,
      search: searchQuery.trim() || undefined,
      status: statusFilters.length > 0 ? statusFilters : undefined,
      priority: priorityFilters.length > 0 ? priorityFilters : undefined,
      taskType: typeFilters.length > 0 ? typeFilters : undefined,
      assignedRole: roleFilters.length > 0 ? roleFilters : undefined,
      sort: "dueAt" as const,
      order: "asc" as const,
    }),
    [priorityFilters, roleFilters, searchQuery, statusFilters, typeFilters]
  );
  const canUseInitialTasks =
    !searchQuery.trim() &&
    statusFilters.length === 2 &&
    statusFilters.includes("open") &&
    statusFilters.includes("in_progress") &&
    priorityFilters.length === 0 &&
    typeFilters.length === 0 &&
    roleFilters.length === 0;
  const { data, isLoading, error } = usePatientTasks(
    patientId,
    query,
    canUseInitialTasks ? initialTasks : undefined
  );
  const tasks = data?.data.tasks ?? [];
  const selected = selectedTaskId
    ? (tasks.find((task) => task.taskId === selectedTaskId) ?? selectedFromRow)
    : selectedFromRow;

  function selectedTaskHref(taskId: string) {
    return `/patients/${encodeURIComponent(patientId)}/tasks?selected=${encodeURIComponent(taskId)}`;
  }

  function openTask(task: Task) {
    setSelectedFromRow(task);
    router.push(selectedTaskHref(task.taskId), { scroll: false });
  }

  function clearSelectedTask() {
    setSelectedFromRow(null);
    router.replace(`/patients/${encodeURIComponent(patientId)}/tasks`, {
      scroll: false,
    });
  }

  function handleScheduleConsultation(task: Task) {
    setConsultationTask(task);
  }

  if (error) {
    return (
      <div className="rounded-lg border border-status-danger-border bg-status-danger-bg p-4 text-status-danger-fg">
        Failed to load tasks: {error.message}
      </div>
    );
  }

  return (
    <>
      <TaskTable
        tasks={tasks}
        total={data?.data.pagination?.total}
        loading={isLoading}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilters={statusFilters}
        onStatusFiltersChange={setStatusFilters}
        priorityFilters={priorityFilters}
        onPriorityFiltersChange={setPriorityFilters}
        typeFilters={typeFilters}
        onTypeFiltersChange={setTypeFilters}
        roleFilters={roleFilters}
        onRoleFiltersChange={setRoleFilters}
        onRowClick={openTask}
        onScheduleConsultation={handleScheduleConsultation}
        showPatientColumn={false}
        emptyTitle="No tasks for this patient"
        emptyDescription="Automated intake review tasks and follow-up tasks will appear here."
      />

      <TaskDetailSheet
        task={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) clearSelectedTask();
        }}
        onScheduleConsultation={handleScheduleConsultation}
      />

      <NewConsultationSheet
        open={Boolean(consultationTask)}
        onOpenChange={(open) => {
          if (!open) setConsultationTask(null);
        }}
        defaultPatientId={patientId}
        defaultPatientName={consultationTask?.patientName || patientName}
      />
    </>
  );
}
