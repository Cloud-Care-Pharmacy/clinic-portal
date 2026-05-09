import { api } from "@/lib/api";
import { TasksPageClient } from "./TasksPageClient";

export default async function PatientTasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ selected?: string }>;
}) {
  const initialTasksP = params.then(({ id }) =>
    api
      .getPatientTasks(id, {
        limit: 50,
        offset: 0,
        status: ["open", "in_progress"],
        sort: "dueAt",
        order: "asc",
      })
      .catch(() => undefined),
  );
  const [{ id }, { selected }, initialTasks] = await Promise.all([
    params,
    searchParams,
    initialTasksP,
  ]);

  return (
    <TasksPageClient
      patientId={id}
      selectedTaskId={selected}
      initialTasks={initialTasks}
    />
  );
}
