import { api } from "@/lib/api";
import { TasksClient } from "./TasksClient";

export default async function TasksPage() {
  const initialTasks = await api
    .getTasks({
      limit: 50,
      offset: 0,
      sort: "dueAt",
      order: "asc",
    })
    .catch(() => undefined);

  return <TasksClient initialTasks={initialTasks} />;
}
