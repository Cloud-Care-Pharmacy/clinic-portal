import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { getEntityId } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { WorkflowDetailClient } from "./WorkflowDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkflowDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [entityId, workflow, runs] = await Promise.all([
    getEntityId(),
    api.getWorkflow(id).catch((e) => {
      if (e instanceof ApiError && e.status === 404) return null;
      return undefined;
    }),
    api.listWorkflowRuns(id, { limit: 50 }).catch(() => undefined),
  ]);

  if (workflow === null) notFound();

  return (
    <WorkflowDetailClient
      workflowId={id}
      entityId={entityId}
      initialWorkflow={workflow}
      initialRuns={runs}
    />
  );
}
