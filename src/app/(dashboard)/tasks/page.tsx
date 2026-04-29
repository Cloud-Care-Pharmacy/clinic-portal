import { api } from "@/lib/api";
import { TasksClient } from "./TasksClient";

const ENTITY_ID = process.env.NEXT_PUBLIC_DEFAULT_ENTITY_ID ?? "";

export default async function TasksPage() {
  const initialTasks = await api
    .getTasks({
      limit: 200,
      offset: 0,
      sort: "dueAt",
      order: "asc",
    })
    .catch(() => undefined);

  return <TasksClient entityId={ENTITY_ID} initialTasks={initialTasks} />;
}
