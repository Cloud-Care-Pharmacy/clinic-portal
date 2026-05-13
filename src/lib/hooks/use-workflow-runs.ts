"use client";

import { useEffect, useRef } from "react";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  WorkflowRun,
  WorkflowRunCapturesResponse,
  WorkflowRunDetailResponse,
  WorkflowRunEvent,
  WorkflowRunStep,
  WorkflowRunStreamDonePayload,
  WorkflowRunStreamStepPayload,
  WorkflowRunsListResponse,
} from "@/types";

export class WorkflowRunCancelError extends Error {
  readonly status: number;
  readonly code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "WorkflowRunCancelError";
    this.status = status;
    this.code = code;
  }
}

async function fetchRuns(
  workflowId: string,
  opts: { limit?: number } = {}
): Promise<WorkflowRunsListResponse> {
  const params = new URLSearchParams();
  if (opts.limit) params.set("limit", String(opts.limit));
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(
    `/api/proxy/workflows/${encodeURIComponent(workflowId)}/runs${qs}`
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
    `/api/proxy/workflows/runs/${encodeURIComponent(runId)}${qs}`
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
      return data.data.some((r) => ACTIVE_STATUSES.has(r.status)) ? 4_000 : false;
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

export function useWorkflowRun(runId: string, initialData?: WorkflowRunDetailResponse) {
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

// ---- SSE stream ----

export interface WorkflowRunStreamHandlers {
  onRun?: (run: WorkflowRun) => void;
  onStep?: (event: WorkflowRunEvent) => void;
  /**
   * Per-step projection updates. Re-emitted for every definition step on
   * (re)connect, then again whenever a step's projection changes. Idempotent
   * — update by `step.stepIndex`.
   */
  onStepState?: (step: WorkflowRunStep) => void;
  onDone?: (info: WorkflowRunStreamDonePayload) => void;
  onError?: (err: unknown) => void;
}

/**
 * Subscribe to the live SSE stream for a workflow run.
 *
 * Uses `fetch` + `ReadableStream` (not `EventSource`) so we can rely on the
 * Next.js auth proxy, which injects `X-API-Key` server-side. The stream is
 * forwarded as `text/event-stream` by the catch-all proxy.
 *
 * Behaviour:
 * - Tracks the highest `sequence` seen as a cursor.
 * - On `event: done` with `reason: "max-duration"` automatically reconnects
 *   with `?afterSequence=<cursor>` to keep streaming.
 * - On any other `event: done`, terminates and fires `onDone`.
 * - Heartbeat comment lines (`: keep-alive`) are ignored.
 *
 * Pass `enabled: false` (or a falsy `runId`) to keep the stream closed.
 */
export function useWorkflowRunStream(
  runId: string | null | undefined,
  enabled: boolean,
  handlers: WorkflowRunStreamHandlers
): void {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  // SSE stream subscription \u2014 fetch is required here for the streaming response
  // body. TanStack Query / SWR don't fit ReadableStream consumers.
  useEffect(() => {
    if (!runId || !enabled) return;
    let aborted = false;
    const ctrl = new AbortController();
    let cursor = 0;

    async function run() {
      // SSE reconnect loop and SSE chunked read loop are intentionally
      // sequential — they consume an ordered stream and cannot be parallelized.
      while (!aborted) {
        const qs = cursor > 0 ? `?afterSequence=${cursor}` : "";
        const url = `/api/proxy/workflows/runs/${encodeURIComponent(runId!)}/stream${qs}`;
        let reconnect = false;
        try {
          const res = await fetch(url, {
            signal: ctrl.signal,
            cache: "no-store",
            headers: { Accept: "text/event-stream" },
          });
          if (!res.ok || !res.body) {
            throw new Error(`Stream HTTP ${res.status}`);
          }

          const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
          let buf = "";

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += value;

            let idx;
            // String scan on a streaming buffer; cannot use a Set here.
            while ((idx = buf.indexOf("\n\n")) !== -1) {
              const frame = buf.slice(0, idx);
              buf = buf.slice(idx + 2);
              if (!frame || frame.startsWith(":")) continue;

              const lines = frame.split("\n");
              // Each frame has at most a few header lines — a Map index would be
              // slower than two `find` calls here.
              const eventLine = lines.find((l) => l.startsWith("event: "));
              const dataLine = lines.find((l) => l.startsWith("data: "));
              if (!dataLine) continue;

              const eventName = eventLine ? eventLine.slice(7).trim() : "message";
              let data: unknown;
              try {
                data = JSON.parse(dataLine.slice(6));
              } catch {
                continue;
              }

              if (eventName === "run") {
                handlersRef.current.onRun?.(data as WorkflowRun);
              } else if (eventName === "step_state") {
                handlersRef.current.onStepState?.(data as WorkflowRunStep);
              } else if (eventName === "step") {
                const ev = data as WorkflowRunStreamStepPayload;
                if (typeof ev.sequence === "number") {
                  cursor = Math.max(cursor, ev.sequence);
                }
                // Normalize wire shape (`occurredAt`) into the existing
                // `WorkflowRunEvent` (`createdAt`) so consumers can merge
                // streamed events into the cached run detail.
                const normalized: WorkflowRunEvent = {
                  id: ev.id,
                  runId: ev.runId,
                  sequence: ev.sequence,
                  stepIndex: ev.stepIndex,
                  stepKind: ev.stepKind,
                  eventType: ev.eventType,
                  durationMs: ev.durationMs,
                  detail: ev.detail,
                  createdAt: ev.occurredAt,
                };
                handlersRef.current.onStep?.(normalized);
              } else if (eventName === "done") {
                const payload = data as WorkflowRunStreamDonePayload;
                if (typeof payload.cursor === "number") {
                  cursor = Math.max(cursor, payload.cursor);
                }
                handlersRef.current.onDone?.(payload);
                if (payload.reason === "max-duration") reconnect = true;
                break;
              }
            }
          }
        } catch (err) {
          if (aborted) return;
          if (err instanceof DOMException && err.name === "AbortError") return;
          handlersRef.current.onError?.(err);
          return;
        }

        if (!reconnect) return;
      }
    }

    void run();
    return () => {
      aborted = true;
      ctrl.abort();
    };
  }, [runId, enabled]);
}

// ---- Captures (run logs Input/Output panes) ----

async function fetchRunCaptures(runId: string): Promise<WorkflowRunCapturesResponse> {
  const res = await fetch(
    `/api/proxy/workflows/runs/${encodeURIComponent(runId)}/captures`
  );
  if (!res.ok) throw new Error("Failed to load captures");
  return res.json();
}

export function workflowRunCapturesQueryOptions(runId: string) {
  return queryOptions({
    queryKey: ["workflow-runs", "captures", runId],
    queryFn: () => fetchRunCaptures(runId),
    enabled: Boolean(runId),
  });
}

/**
 * Fetch per-step capture rows for a run. Mirrors the polling cadence used by
 * `useWorkflowRun`: 4s while the run is `running`/`waiting`, otherwise idle.
 *
 * Pass `isLive: false` to opt out of polling regardless of cached data —
 * useful when the SSE stream is the source of truth for live updates.
 */
export function useWorkflowRunCaptures(
  runId: string,
  opts: { enabled?: boolean; isLive?: boolean } = {}
) {
  const { enabled = true, isLive = true } = opts;
  return useQuery({
    ...workflowRunCapturesQueryOptions(runId),
    enabled: enabled && Boolean(runId),
    refetchInterval: isLive ? 4_000 : false,
  });
}

/**
 * Fetch the full payload for a single capture from R2-backed object storage.
 * Used only when `captureMode === 'full'` and the user clicks
 * "View full payload". Returns the parsed JSON body.
 */
export async function fetchCapturePayload(
  runId: string,
  sequence: number,
  side: "input" | "output"
): Promise<unknown> {
  const res = await fetch(
    `/api/proxy/workflows/runs/${encodeURIComponent(runId)}/captures/${sequence}/payload?side=${side}`
  );
  if (!res.ok) throw new Error("Failed to load full payload");
  return res.json();
}

// ---- Cancel run ----

export interface CancelWorkflowRunPayload {
  /** Optional, ≤500 chars. Surfaced as `detail.reason` on the audit event. */
  reason?: string;
}

export interface CancelWorkflowRunResponse {
  success: true;
  data: {
    run: WorkflowRun;
    /** True when the run was already terminal — row is unchanged. */
    alreadyTerminal: boolean;
  };
}

/**
 * Request cancellation of an in-flight workflow run. Only meaningful when
 * `run.status` is `running` or `waiting`; the backend treats already-terminal
 * runs as a no-op (`alreadyTerminal: true`).
 *
 * Error mapping:
 *  - `404` → `WorkflowRunCancelError(404, ...)`
 *  - `409` → `WorkflowRunCancelError(409, ..., "CONFLICT")` — concurrent
 *    update raced; refetch the run and let the user retry.
 */
export function useCancelWorkflowRun(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload?: CancelWorkflowRunPayload
    ): Promise<CancelWorkflowRunResponse> => {
      const hasBody = Boolean(payload?.reason);
      const res = await fetch(
        `/api/proxy/workflows/runs/${encodeURIComponent(runId)}/cancel`,
        {
          method: "POST",
          ...(hasBody
            ? {
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: payload!.reason }),
              }
            : {}),
        }
      );
      if (!res.ok) {
        let message = `Failed to cancel run (HTTP ${res.status})`;
        let code: string | undefined;
        try {
          const body = await res.json();
          if (body && typeof body === "object") {
            if (typeof body.error === "string") message = body.error;
            if (typeof body.code === "string") code = body.code;
          }
        } catch {
          // ignore — fall back to default message
        }
        throw new WorkflowRunCancelError(res.status, message, code);
      }
      return res.json();
    },
    onSuccess: (data) => {
      // Patch the cached detail with the latest run snapshot. The audit
      // event for `run_cancelled` will arrive on the SSE stream (or via
      // the next refetch) — no need to write it here.
      qc.setQueryData<WorkflowRunDetailResponse>(
        ["workflow-runs", "detail", runId],
        (prev) =>
          prev ? { ...prev, data: { ...prev.data, run: data.data.run } } : prev
      );
      qc.invalidateQueries({ queryKey: ["workflow-runs", "list"] });
    },
  });
}
