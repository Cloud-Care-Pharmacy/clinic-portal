"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
  const definitionVersion = data?.data.version ?? 1;

  // Read the `?outdated=1` deep-link from the definition-detail banner so
  // the rail boots into the "Outdated only" view. Parent page wraps this
  // component in <Suspense>. We can't destructure `.get` from URLSearchParams
  // — it relies on `this`.
  // eslint-disable-next-line react-doctor/nextjs-no-use-search-params-without-suspense
  const searchParams = useSearchParams();
  // eslint-disable-next-line react-doctor/react-compiler-destructure-method
  const initialOutdatedOnly = searchParams.get("outdated") === "1";

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
        definitionVersion={definitionVersion}
        initialOutdatedOnly={initialOutdatedOnly}
      />
    </div>
  );
}
