"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import type {
  WorkflowRun,
  WorkflowRunDetailResponse,
  WorkflowRunsListResponse,
} from "@/types";

async function fetchRuns(
  workflowId: string,
  opts: { limit?: number } = {}
): Promise<WorkflowRunsListResponse> {
  const params = new URLSearchParams();
  if (opts.limit) params.set("limit", String(opts.limit));
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(
    `/api/proxy/internal/workflows/${encodeURIComponent(workflowId)}/runs${qs}`
  );
  if (!res.ok) throw new Error("Failed to load runs");
  return res.json();
}

async function fetchRun(
  runId: string,
  opts: { includeEvents?: boolean; eventLimit?: number } = {}
): Promise<WorkflowRunDetailResponse> {
  const params = new URLSearchParams();
  if (opts.includeEvents === false) params.set("includeEvents", "false");
  if (opts.eventLimit) params.set("eventLimit", String(opts.eventLimit));
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(
    `/api/proxy/internal/workflows/runs/${encodeURIComponent(runId)}${qs}`
  );
  if (!res.ok) throw new Error("Failed to load run");
  return res.json();
}

export function workflowRunsQueryOptions(
  workflowId: string,
  opts: { limit?: number } = {}
) {
  return queryOptions({
    queryKey: ["workflow-runs", "list", workflowId, opts],
    queryFn: () => fetchRuns(workflowId, opts),
    enabled: Boolean(workflowId),
    staleTime: 5_000,
  });
}

const ACTIVE_STATUSES: ReadonlySet<WorkflowRun["status"]> = new Set([
  "running",
  "waiting",
]);

export function useWorkflowRuns(
  workflowId: string,
  opts: { limit?: number } = {},
  initialData?: WorkflowRunsListResponse
) {
  return useQuery({
    ...workflowRunsQueryOptions(workflowId, opts),
    initialData,
    refetchInterval: (query) => {
      const data = query.state.data as WorkflowRunsListResponse | undefined;
      if (!data?.data) return false;
      return data.data.some((r) => ACTIVE_STATUSES.has(r.status))
        ? 4_000
        : false;
    },
  });
}

export function workflowRunDetailQueryOptions(runId: string) {
  return queryOptions({
    queryKey: ["workflow-runs", "detail", runId],
    queryFn: () => fetchRun(runId, { includeEvents: true }),
    enabled: Boolean(runId),
  });
}

export function useWorkflowRun(
  runId: string,
  initialData?: WorkflowRunDetailResponse
) {
  return useQuery({
    ...workflowRunDetailQueryOptions(runId),
    initialData,
    refetchInterval: (query) => {
      const data = query.state.data as WorkflowRunDetailResponse | undefined;
      if (!data?.data?.run) return false;
      return ACTIVE_STATUSES.has(data.data.run.status) ? 4_000 : false;
    },
  });
}
