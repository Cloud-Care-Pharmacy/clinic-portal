"use client";

import { useEffect } from "react";
import { useBreadcrumbOverrides } from "@/components/providers/BreadcrumbProvider";
import { useWorkflow } from "@/lib/hooks/use-workflows";
import { RunView } from "@/components/workflows/run/RunView";
import type { WorkflowRunsListResponse } from "@/types";

interface RunsClientProps {
  workflowId: string;
  initialRunId?: string;
  initialWorkflowName?: string;
  initialRuns?: WorkflowRunsListResponse;
}

export function RunsClient({
  workflowId,
  initialRunId,
  initialWorkflowName,
  initialRuns,
}: RunsClientProps) {
  const { data } = useWorkflow(workflowId);
  const workflowName = data?.data.name ?? initialWorkflowName;

  // Replace the workflow id segment in the breadcrumb with its name so the
  // header reads: Dashboard > Workflows > {{name}} > Runs.
  const { setOverride, clearOverride } = useBreadcrumbOverrides();
  const breadcrumbPath = `/workflows/${workflowId}`;
  useEffect(() => {
    if (!workflowName) return;
    setOverride(breadcrumbPath, workflowName);
    return () => clearOverride(breadcrumbPath);
  }, [breadcrumbPath, workflowName, setOverride, clearOverride]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <RunView
        workflowId={workflowId}
        initialRuns={initialRuns}
        initialRunId={initialRunId}
      />
    </div>
  );
}
