"use client";

import { TasksTab } from "../components/tabs/TasksTab";
import { usePatientShell } from "../components/PatientShellContext";
import type { TasksListResponse } from "@/types";

interface TasksPageClientProps {
  patientId: string;
  selectedTaskId?: string;
  initialTasks?: TasksListResponse;
}

export function TasksPageClient({
  patientId,
  selectedTaskId,
  initialTasks,
}: TasksPageClientProps) {
  const { displayName } = usePatientShell();

  return (
    <TasksTab
      patientId={patientId}
      patientName={displayName}
      selectedTaskId={selectedTaskId}
      initialTasks={initialTasks}
    />
  );
}
