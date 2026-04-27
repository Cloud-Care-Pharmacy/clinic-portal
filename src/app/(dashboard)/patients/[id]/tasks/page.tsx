import { api } from "@/lib/api";
import { TasksPageClient } from "./TasksPageClient";

export default async function PatientTasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ selected?: string }>;
}) {
  const [{ id }, { selected }] = await Promise.all([params, searchParams]);
  const initialTasks = await api
    .getPatientTasks(id, {
      limit: 50,
      offset: 0,
      status: ["open", "in_progress"],
      sort: "dueAt",
      order: "asc",
    })
    .catch(() => undefined);

  return (
    <TasksPageClient
      patientId={id}
      selectedTaskId={selected}
      initialTasks={initialTasks}
    />
  );
}
