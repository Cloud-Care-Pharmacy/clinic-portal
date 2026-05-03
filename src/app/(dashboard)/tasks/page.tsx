import { api } from "@/lib/api";
import { getEntityId } from "@/lib/auth";
import { TasksClient } from "./TasksClient";

export default async function TasksPage() {
  const [entityId, initialTasks] = await Promise.all([
    getEntityId(),
    api
      .getTasks({
        limit: 200,
        offset: 0,
        sort: "dueAt",
        order: "asc",
      })
      .catch(() => undefined),
  ]);

  return <TasksClient entityId={entityId} initialTasks={initialTasks} />;
}
