import { notFound } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { RunsClient } from "./RunsClient";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ runId?: string }>;
}

export default async function WorkflowRunsPage({ params, searchParams }: PageProps) {
  const [{ id }, { runId }] = await Promise.all([params, searchParams]);
  const [workflow, runs] = await Promise.all([
    api.getWorkflow(id).catch((e) => {
      if (e instanceof ApiError && e.status === 404) return null;
      return undefined;
    }),
    api.listWorkflowRuns(id, { limit: 50 }).catch(() => undefined),
  ]);

  if (workflow === null) notFound();

  return (
    <RunsClient
      workflowId={id}
      initialRunId={runId}
      initialWorkflowName={workflow?.data.name}
      initialRuns={runs}
    />
  );
}
