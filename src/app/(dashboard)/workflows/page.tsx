import { api } from "@/lib/api";
import { getEntityId } from "@/lib/auth";
import { WorkflowsClient } from "./WorkflowsClient";

export default async function WorkflowsPage() {
  const [entityId, initialWorkflows] = await Promise.all([
    getEntityId(),
    api.listWorkflows({ limit: 100 }).catch(() => undefined),
  ]);

  return (
    <WorkflowsClient entityId={entityId} initialWorkflows={initialWorkflows} />
  );
}
