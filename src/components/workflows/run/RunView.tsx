"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  Check,
  Clock,
  CircleDashed,
  AlertTriangle,
  Filter,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useWorkflowRun,
  useWorkflowRunStream,
  useWorkflowRuns,
} from "@/lib/hooks/use-workflow-runs";
import { useWorkflow } from "@/lib/hooks/use-workflows";
import { STEP_KIND_CONFIG } from "../canvas/lib/node-kind-config";
import type {
  WorkflowRun,
  WorkflowRunDetailResponse,
  WorkflowRunEvent,
  WorkflowRunsListResponse,
  WorkflowStepKind,
} from "@/types";

interface RunViewProps {
  workflowId: string;
  initialRuns?: WorkflowRunsListResponse;
  /** Selected run id (deep-linked or last test-run). */
  initialRunId?: string;
}

const STATUS_TONE = {
  done: {
    bg: "var(--status-success-bg)",
    fg: "var(--status-success-fg)",
    border: "var(--status-success-border)",
    Icon: Check,
    label: "Done",
    pulse: false,
  },
  running: {
    bg: "var(--status-warning-bg)",
    fg: "var(--status-warning-fg)",
    border: "var(--status-warning-border)",
    Icon: CircleDashed,
    label: "Running",
    pulse: true,
  },
  pending: {
    bg: "var(--status-neutral-bg)",
    fg: "var(--status-neutral-fg)",
    border: "var(--status-neutral-border)",
    Icon: CircleDashed,
    label: "Pending",
    pulse: false,
  },
  failed: {
    bg: "var(--status-danger-bg)",
    fg: "var(--status-danger-fg)",
    border: "var(--status-danger-border)",
    Icon: AlertTriangle,
    label: "Failed",
    pulse: false,
  },
  waiting: {
    bg: "var(--status-warning-bg)",
    fg: "var(--status-warning-fg)",
    border: "var(--status-warning-border)",
    Icon: Clock,
    label: "Waiting",
    pulse: false,
  },
} as const;

type StepStatus = keyof typeof STATUS_TONE;

function shortId(id: string) {
  return id.slice(0, 8);
}

/**
 * Parse a backend timestamp as UTC. The gateway emits some columns as
 * `"YYYY-MM-DD HH:MM:SS"` (no timezone marker), which JS would otherwise
 * interpret as local time and silently skew durations by the client offset.
 */
function parseUtcMs(ts: string): number {
  const hasOffset = /[zZ]|[+-]\d{2}:?\d{2}$/.test(ts);
  const iso = hasOffset ? ts : `${ts.replace(" ", "T")}Z`;
  return new Date(iso).getTime();
}

function fmtDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(s < 10 ? 2 : 1)}s`;
  const m = Math.floor(s / 60);
  const rs = Math.round(s - m * 60);
  return `${m}m ${rs}s`;
}

function relativeTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(parseUtcMs(iso)), { addSuffix: true });
  } catch {
    return iso;
  }
}

function runDuration(run: WorkflowRun): string {
  const start = parseUtcMs(run.startedAt);
  if (!run.completedAt) {
    return fmtDuration(Date.now() - start);
  }
  return fmtDuration(parseUtcMs(run.completedAt) - start);
}

function runStatusDot(run: WorkflowRun): string {
  switch (run.status) {
    case "completed":
      return "bg-status-success-fg";
    case "running":
      return "bg-status-warning-fg animate-pulse motion-reduce:animate-none";
    case "waiting":
      return "bg-status-warning-fg";
    case "failed":
      return "bg-status-danger-fg";
    case "cancelled":
      return "bg-muted-foreground";
  }
}

function triggerSummaryFromContext(
  ctx: Record<string, unknown> | undefined
): string {
  const event = (ctx?.event ?? {}) as { eventType?: string };
  return event?.eventType ?? "—";
}

interface RunListRailProps {
  runs: WorkflowRun[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}

function RunListRail({ runs, selectedId, onSelect, loading }: RunListRailProps) {
  return (
    <aside className="flex w-65 flex-col border-r border-border bg-card">
      <header className="flex items-center justify-between px-3.5 py-3">
        <h3 className="text-sm font-semibold">Recent runs</h3>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground"
          aria-label="Filter runs"
          disabled
        >
          <Filter className="size-3.5" />
        </Button>
      </header>
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {loading && runs.length === 0 ? (
          <div className="space-y-2 px-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-md" />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            No runs yet. Use the Test run button to fire a manual trigger.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {runs.map((r) => {
              const active = r.id === selectedId;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(r.id)}
                    className={cn(
                      "flex w-full flex-col gap-1 rounded-md p-2 text-left transition-colors",
                      active
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          runStatusDot(r)
                        )}
                        aria-hidden
                      />
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {shortId(r.id)}
                      </span>
                    </div>
                    <div className="truncate text-[12px] font-semibold">
                      {triggerSummaryFromContext(
                        r.context as Record<string, unknown>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {relativeTime(r.startedAt)}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

interface RunMetricProps {
  label: string;
  children: React.ReactNode;
}

function RunMetric({ label, children }: RunMetricProps) {
  return (
    <div className="flex-1 rounded-xl border border-border bg-popover px-3.5 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1.5 text-base font-semibold">{children}</div>
    </div>
  );
}

interface RunStepCardProps {
  event: WorkflowRunEvent;
  status: StepStatus;
  duration: string;
  context: Record<string, unknown> | null;
  isLast: boolean;
}

function RunStepCard({
  event,
  status,
  duration,
  context,
  isLast,
}: RunStepCardProps) {
  const [expanded, setExpanded] = useState(false);
  const tone = STATUS_TONE[status];
  const ToneIcon = tone.Icon;
  const cfg = event.stepKind
    ? STEP_KIND_CONFIG[event.stepKind as WorkflowStepKind]
    : undefined;
  const StepIcon = cfg?.icon;

  const detail = (event.detail ?? {}) as Record<string, unknown>;
  const error = typeof detail.error === "string" ? detail.error : undefined;

  return (
    <div className="relative flex gap-3">
      <div className="flex flex-col items-center">
        <div
          style={{
            background: tone.bg,
            color: tone.fg,
            border: `2px solid ${tone.border}`,
            animation: tone.pulse ? "wf-pulse 1.5s infinite" : undefined,
          }}
          className="z-10 grid size-7 place-items-center rounded-full motion-reduce:animate-none"
        >
          <ToneIcon className="size-3" />
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-border" />}
      </div>
      <div className="flex-1 pb-4">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className={cn(
            "flex w-full flex-col gap-1.5 rounded-xl border px-3.5 py-3 text-left transition-colors",
            status === "running"
              ? "bg-popover"
              : "bg-card",
            "border-border hover:border-foreground/20"
          )}
        >
          <div className="flex items-center gap-2.5">
            {StepIcon && cfg && (
              <span
                style={{
                  background: cfg.bg,
                  color: cfg.fg,
                  border: `1px solid ${cfg.border}`,
                }}
                className="grid size-5.5 place-items-center rounded-md shrink-0"
              >
                <StepIcon className="size-3" />
              </span>
            )}
            <div className="min-w-0 flex-1 text-sm font-semibold">
              {cfg?.label ?? event.eventType}
              {event.stepIndex != null && (
                <span className="ml-1.5 font-mono text-[11px] font-normal text-muted-foreground">
                  #{event.stepIndex + 1}
                </span>
              )}
            </div>
            <span
              style={{
                background: tone.bg,
                color: tone.fg,
                border: `1px solid ${tone.border}`,
              }}
              className="inline-flex items-center rounded-full px-2 py-px text-[10px] font-semibold uppercase tracking-[0.06em]"
            >
              {tone.label}
            </span>
            <span className="min-w-14 text-right font-mono text-[11px] text-muted-foreground">
              {duration}
            </span>
            {expanded ? (
              <ChevronDown className="size-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-3.5 text-muted-foreground" />
            )}
          </div>

          {error && (
            <div className="mt-1 ml-8 rounded-md border-l-2 border-destructive bg-destructive/10 px-2.5 py-1.5 text-[12px] text-destructive">
              {error}
            </div>
          )}

          {expanded && (
            <div className="mt-2 ml-8 flex flex-col gap-2">
              {Object.keys(detail).length > 0 && (
                <JsonBlock title="Detail" data={detail} />
              )}
              {context && Object.keys(context).length > 0 && (
                <JsonBlock title="Run context" data={context} />
              )}
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

function JsonBlock({
  title,
  data,
}: {
  title: string;
  data: Record<string, unknown>;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-2.5">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap wrap-break-word font-mono text-[11px] text-foreground">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

interface RunDetailProps {
  runId: string | null;
  totalSteps: number;
  initial?: WorkflowRunDetailResponse;
}

function RunDetail({ runId, totalSteps, initial }: RunDetailProps) {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useWorkflowRun(runId ?? "", initial);

  // Subscribe to the SSE stream while the run is `running`. The hook handles
  // reconnect on `max-duration`; we mirror live `run`/`step` events into the
  // cached run detail so the timeline updates without polling.
  const isLive = data?.data?.run?.status === "running";
  useWorkflowRunStream(runId, Boolean(runId) && isLive, {
    onRun: (run) => {
      queryClient.setQueryData<WorkflowRunDetailResponse>(
        ["workflow-runs", "detail", runId],
        (prev) =>
          prev ? { ...prev, data: { ...prev.data, run } } : prev
      );
    },
    onStep: (event) => {
      queryClient.setQueryData<WorkflowRunDetailResponse>(
        ["workflow-runs", "detail", runId],
        (prev) => {
          if (!prev) return prev;
          const events = prev.data.events;
          if (events.some((e) => e.sequence === event.sequence)) return prev;
          const next = [...events, event].sort(
            (a, b) => a.sequence - b.sequence
          );
          return { ...prev, data: { ...prev.data, events: next } };
        }
      );
    },
    onDone: () => {
      // Pull the canonical audit (status + full event list) once the stream
      // closes — covers terminal runs and waiting/paused runs alike.
      void refetch();
    },
  });

  if (!runId) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState
          title="Select a run"
          description="Pick a run from the rail to see its step trace."
        />
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex-1 space-y-4 p-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const { run, events } = data.data;
  // Collapse the audit trail to one row per step. We pick a *representative*
  // event by status priority (failed > done > waiting > running) instead of
  // last-seen, because the gateway can emit `wait_scheduled` *after* the
  // matching `step_completed` — last-seen made completed waits render as
  // still WAITING.
  const STATUS_PRIORITY: Record<StepStatus, number> = {
    failed: 4,
    done: 3,
    waiting: 2,
    running: 1,
    pending: 0,
  };
  function statusForEvent(e: WorkflowRunEvent): StepStatus | null {
    switch (e.eventType) {
      case "step_failed":
        return "failed";
      case "step_completed":
        return "done";
      case "wait_scheduled":
        return "waiting";
      case "step_started":
        return "running";
      default:
        return null;
    }
  }
  const byStep = new Map<number, { event: WorkflowRunEvent; status: StepStatus }>();
  for (const e of events) {
    if (e.stepIndex == null) continue;
    const status = statusForEvent(e);
    if (!status) continue;
    const prev = byStep.get(e.stepIndex);
    if (!prev || STATUS_PRIORITY[status] >= STATUS_PRIORITY[prev.status]) {
      byStep.set(e.stepIndex, { event: e, status });
    }
  }
  const stepEntries = [...byStep.entries()].sort(([a], [b]) => a - b);

  // Step counter: total comes from the workflow definition (audit events
  // alone over- or under-count). For terminal runs we display N/N; for live
  // runs we clamp to the known total so we never show e.g. "3 / 2".
  const isTerminal =
    run.status === "completed" ||
    run.status === "failed" ||
    run.status === "cancelled";
  const stepDenominator = totalSteps > 0 ? totalSteps : stepEntries.length;
  const stepNumerator = isTerminal
    ? stepDenominator
    : Math.min(run.currentStep + 1, stepDenominator || run.currentStep + 1);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-5 flex gap-3">
        <RunMetric label="Status">
          <StatusBadge status={run.status} dot className="capitalize" />
        </RunMetric>
        <RunMetric label="Duration">{runDuration(run)}</RunMetric>
        <RunMetric label="Step">
          <span className="font-mono text-sm">
            {stepNumerator}
            <span className="text-muted-foreground"> / {stepDenominator || "?"}</span>
          </span>
        </RunMetric>
      </div>

      {run.lastError && (
        <div className="mb-4 rounded-xl border-l-4 border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <div className="font-semibold">Last error</div>
          <div className="mt-1 font-mono text-xs">{run.lastError}</div>
        </div>
      )}

      {run.status === "waiting" && run.nextStepAt && (
        <div className="mb-4 rounded-xl border border-status-warning-border bg-status-warning-bg px-4 py-3 text-xs text-status-warning-fg">
          Waiting until <strong>{relativeTime(run.nextStepAt)}</strong>
          {run.awaitingEventType && (
            <>
              {" "}
              for event{" "}
              <code className="rounded bg-popover px-1 py-0.5 font-mono">
                {run.awaitingEventType}
              </code>
            </>
          )}
          .
        </div>
      )}

      <h3 className="mb-3 text-sm font-semibold">Step trace</h3>

      {stepEntries.length === 0 ? (
        <EmptyState
          title="No step events yet"
          description="Steps will appear here as the run progresses."
        />
      ) : (
        <div className="flex flex-col">
          {stepEntries.map(([, { event, status }], i) => (
            <RunStepCard
              key={`${event.stepIndex}-${event.eventType}`}
              event={event}
              status={status}
              duration={fmtDuration(event.durationMs)}
              context={i === stepEntries.length - 1 ? run.context : null}
              isLast={i === stepEntries.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function RunView({ workflowId, initialRuns, initialRunId }: RunViewProps) {
  const { data, isLoading } = useWorkflowRuns(workflowId, { limit: 50 }, initialRuns);
  const { data: workflowData } = useWorkflow(workflowId);
  const totalSteps = workflowData?.data.definition.steps.length ?? 0;
  const runs = data?.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(
    initialRunId ?? runs[0]?.id ?? null
  );

  // If no selection but runs arrive, auto-pick the first.
  if (!selectedId && runs[0]) {
    setSelectedId(runs[0].id);
  }

  return (
    <div className="flex h-full min-h-0">
      <RunListRail
        runs={runs}
        selectedId={selectedId}
        onSelect={setSelectedId}
        loading={isLoading}
      />
      <RunDetail runId={selectedId} totalSteps={totalSteps} />
    </div>
  );
}
