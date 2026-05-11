"use client";

import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  CreateWorkflowPayload,
  TestRunWorkflowPayload,
  TestRunWorkflowResponse,
  TriggerWorkflowPayload,
  TriggerWorkflowResponse,
  UpdateWorkflowPayload,
  WorkflowActivateResponse,
  WorkflowResponse,
  WorkflowStatus,
  WorkflowsListResponse,
} from "@/types";
import { normalizeWorkflow } from "@/lib/workflows-normalize";

// ---- Errors ----

export interface WorkflowValidationIssue {
  path: string;
  message: string;
}

export class WorkflowApiError extends Error {
  readonly status: number;
  readonly path?: string;
  readonly fieldMessage?: string;
  readonly issues?: WorkflowValidationIssue[];
  readonly code?: string;

  constructor(
    status: number,
    message: string,
    opts?: { issues?: WorkflowValidationIssue[]; code?: string }
  ) {
    super(message);
    this.name = "WorkflowApiError";
    this.status = status;
    this.issues = opts?.issues;
    this.code = opts?.code;
    // Surface the first issue for inline field highlighting. Falls back to the
    // legacy `"path.to: message"` envelope from older backend builds.
    const first = opts?.issues?.[0];
    if (first) {
      this.path = first.path;
      this.fieldMessage = first.message;
    } else {
      const colonIndex = message.indexOf(": ");
      if (colonIndex > 0 && /^[\w.\-[\]]+$/.test(message.slice(0, colonIndex))) {
        this.path = message.slice(0, colonIndex);
        this.fieldMessage = message.slice(colonIndex + 2);
      }
    }
  }
}

async function readError(res: Response, fallback: string) {
  let message = fallback;
  let issues: WorkflowValidationIssue[] | undefined;
  let code: string | undefined;
  try {
    const body = await res.json();
    if (body && typeof body === "object") {
      if (typeof body.error === "string") message = body.error;
      if (typeof body.code === "string") code = body.code;
      if (Array.isArray(body.issues)) {
        const filtered = body.issues.filter(
          (i: unknown): i is WorkflowValidationIssue =>
            !!i &&
            typeof i === "object" &&
            typeof (i as WorkflowValidationIssue).path === "string" &&
            typeof (i as WorkflowValidationIssue).message === "string"
        );
        if (filtered.length) issues = filtered;
      }
    }
  } catch {
    // ignore
  }
  return new WorkflowApiError(res.status, message, { issues, code });
}

// ---- Fetchers ----

interface ListOpts {
  entityId?: string;
  status?: WorkflowStatus;
  triggerEventType?: string;
  limit?: number;
}

async function fetchWorkflows(opts: ListOpts): Promise<WorkflowsListResponse> {
  const params = new URLSearchParams();
  if (opts.entityId) params.set("entityId", opts.entityId);
  if (opts.status) params.set("status", opts.status);
  if (opts.triggerEventType) params.set("triggerEventType", opts.triggerEventType);
  if (opts.limit) params.set("limit", String(opts.limit));
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`/api/proxy/workflows${qs}`);
  if (!res.ok) throw await readError(res, "Failed to load workflows");
  const body = (await res.json()) as WorkflowsListResponse;
  return { ...body, data: (body.data ?? []).map(normalizeWorkflow) };
}

async function fetchWorkflow(workflowId: string): Promise<WorkflowResponse> {
  const res = await fetch(`/api/proxy/workflows/${encodeURIComponent(workflowId)}`);
  if (!res.ok) throw await readError(res, "Failed to load workflow");
  const body = (await res.json()) as WorkflowResponse;
  return { ...body, data: normalizeWorkflow(body.data) };
}

// ---- Query options ----

export function workflowsQueryOptions(opts: ListOpts = {}) {
  return queryOptions({
    queryKey: ["workflows", "list", opts],
    queryFn: () => fetchWorkflows(opts),
    staleTime: 30_000,
  });
}

export function workflowQueryOptions(workflowId: string) {
  return queryOptions({
    queryKey: ["workflows", "detail", workflowId],
    queryFn: () => fetchWorkflow(workflowId),
    enabled: Boolean(workflowId),
    staleTime: 10_000,
  });
}

// ---- Hooks ----

export function useWorkflows(opts: ListOpts = {}, initialData?: WorkflowsListResponse) {
  return useQuery({
    ...workflowsQueryOptions(opts),
    initialData,
  });
}

export function useWorkflow(workflowId: string, initialData?: WorkflowResponse) {
  return useQuery({
    ...workflowQueryOptions(workflowId),
    initialData,
  });
}

export function useCreateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateWorkflowPayload): Promise<WorkflowResponse> => {
      const res = await fetch(`/api/proxy/workflows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw await readError(res, "Failed to create workflow");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflows", "list"] });
    },
  });
}

export function useUpdateWorkflow(workflowId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateWorkflowPayload): Promise<WorkflowResponse> => {
      const res = await fetch(
        `/api/proxy/workflows/${encodeURIComponent(workflowId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw await readError(res, "Failed to save workflow");
      return res.json();
    },
    onSuccess: (data) => {
      qc.setQueryData(["workflows", "detail", workflowId], data);
      qc.invalidateQueries({ queryKey: ["workflows", "list"] });
    },
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (workflowId: string): Promise<void> => {
      const res = await fetch(
        `/api/proxy/workflows/${encodeURIComponent(workflowId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw await readError(res, "Failed to delete workflow");
    },
    onSuccess: (_data, workflowId) => {
      qc.invalidateQueries({ queryKey: ["workflows", "list"] });
      qc.removeQueries({ queryKey: ["workflows", "detail", workflowId] });
    },
  });
}

export function useTriggerWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: TriggerWorkflowPayload
    ): Promise<TriggerWorkflowResponse> => {
      const res = await fetch(`/api/proxy/workflows/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw await readError(res, "Failed to trigger workflow");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflow-runs"] });
    },
  });
}

/**
 * Kick off a synthetic run for a workflow definition without publishing an
 * external event.
 *
 * As of the async test-run rollout the backend now responds with **HTTP 202**
 * and a freshly-created run in `status: "running"` — the actual execution
 * happens out-of-band. Callers should subscribe to
 * `GET /workflows/runs/{runId}/stream` (see `useWorkflowRunStream`) to render
 * live progress, and re-fetch `GET /workflows/runs/{runId}` once the stream
 * closes to load the final audit.
 *
 * Append `?sync=1` to opt back into the legacy 201-with-drained-run shape
 * (not used here).
 *
 * Test runs execute the real flow: emails are sent, SMS messages are
 * delivered, `http_call` hits the real URL. Make sure the definition points
 * at non-production recipients before clicking.
 */
export function useTestRunWorkflow(workflowId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload?: TestRunWorkflowPayload
    ): Promise<TestRunWorkflowResponse> => {
      const hasBody = Boolean(payload && payload.payload !== undefined);
      const res = await fetch(
        `/api/proxy/workflows/${encodeURIComponent(workflowId)}/test-run`,
        {
          method: "POST",
          ...(hasBody
            ? {
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              }
            : {}),
        }
      );
      if (!res.ok) throw await readError(res, "Failed to start test run");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflow-runs", "list", workflowId] });
    },
  });
}

/**
 * Activate (or dry-run validate) a workflow definition.
 *
 * - `dryRun: true` → returns the structured `issues[]` without persisting.
 *   Use this to drive an "Activate" button state.
 * - `dryRun: false` (default) → flips `status` to `"active"`, or rejects with
 *   a `WorkflowApiError` whose `issues` array lists the blocking problems.
 */
export function useActivateWorkflow(workflowId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (opts?: {
      dryRun?: boolean;
    }): Promise<WorkflowActivateResponse> => {
      const qs = opts?.dryRun ? "?dryRun=1" : "";
      const res = await fetch(
        `/api/proxy/workflows/${encodeURIComponent(workflowId)}/activate${qs}`,
        { method: "POST" }
      );
      if (!res.ok) throw await readError(res, "Failed to activate workflow");
      return res.json();
    },
    onSuccess: (data, variables) => {
      if (!variables?.dryRun) {
        qc.setQueryData(["workflows", "detail", workflowId], {
          success: true,
          data: data.data.record,
        });
        qc.invalidateQueries({ queryKey: ["workflows", "list"] });
      }
    },
  });
}
