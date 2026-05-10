"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Check,
  Clock,
  CircleDashed,
  AlertTriangle,
  Filter,
} from "lucide-react";
import { formatDistanceToNowStrict, format as formatDate } from "date-fns";
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
import { RunCanvas } from "./RunCanvas";
import type {
  WorkflowRun,
  WorkflowRunDetailResponse,
  WorkflowRunEvent,
  WorkflowRunsListResponse,
  WorkflowStep,
  WorkflowStepKind,
  WorkflowTrigger,
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

/**
 * Re-render at a fixed cadence while `enabled`. Used by the "elapsed" counter
 * on the currently-running step so it ticks forward between SSE events.
 */
function useNow(intervalMs: number, enabled: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [enabled, intervalMs]);
  return now;
}

/**
 * Step kinds that have user-visible side effects on the world. We surface
 * their completion (and failure) as toasts so users get explicit feedback
 * during a test run instead of having to scan the timeline.
 */
const HIGH_SIGNAL_STEP_KINDS: ReadonlySet<WorkflowStepKind> = new Set<
  WorkflowStepKind
>(["send_email", "send_sms", "http_call"]);

/** Human-readable label for the toast title. */
function highSignalStepLabel(kind: WorkflowStepKind): string {
  switch (kind) {
    case "send_email":
      return "Email";
    case "send_sms":
      return "SMS";
    case "http_call":
      return "HTTP call";
    default:
      return kind;
  }
}

/**
 * Fire a Sonner toast for a streamed step event when it represents a
 * meaningful side effect (email / SMS / HTTP) and we haven't already
 * toasted this exact event. We also skip events older than 10s on arrival
 * so the initial SSE replay (when first connecting to a long-lived run)
 * doesn't dump a flood of stale toasts.
 */
function maybeToastStepEvent(
  event: WorkflowRunEvent,
  toasted: Set<number>,
): void {
  if (toasted.has(event.sequence)) return;
  toasted.add(event.sequence);

  const kind = event.stepKind as WorkflowStepKind | undefined;
  if (!kind || !HIGH_SIGNAL_STEP_KINDS.has(kind)) return;
  if (event.eventType !== "step_completed" && event.eventType !== "step_failed") {
    return;
  }
  const ageMs = Date.now() - new Date(event.createdAt).getTime();
  if (Number.isFinite(ageMs) && ageMs > 10_000) return;

  const label = highSignalStepLabel(kind);
  const duration = event.durationMs != null ? fmtDuration(event.durationMs) : null;
  const detail = (event.detail ?? {}) as Record<string, unknown>;
  const errorMsg = typeof detail.error === "string" ? detail.error : undefined;

  if (event.eventType === "step_failed") {
    toast.error(`${label} failed`, {
      description: errorMsg ?? (duration ? `Took ${duration}` : undefined),
    });
  } else {
    const verb = kind === "http_call" ? "completed" : "sent";
    toast.success(`${label} ${verb}`, {
      description: duration ? `Completed in ${duration}` : undefined,
    });
  }
}

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
    return formatDistanceToNowStrict(new Date(parseUtcMs(iso)), {
      addSuffix: true,
    });
  } catch {
    return iso;
  }
}

/** Absolute local time, e.g. "10 May 2026, 18:11". */
function absoluteTime(iso: string): string {
  try {
    return formatDate(new Date(parseUtcMs(iso)), "d MMM yyyy, HH:mm");
  } catch {
    return iso;
  }
}

function isOverdue(iso: string): boolean {
  return parseUtcMs(iso) <= Date.now();
}

/**
 * Render `Resumes in 57 seconds` style copy that ticks every parent
 * render. Mirrors `formatDistanceToNowStrict({ addSuffix: false })` but
 * computed off the supplied `now` so it stays in sync with the rest of
 * the live-run UI.
 */
function formatTimeUntil(iso: string, now: number): string {
  const target = parseUtcMs(iso);
  const diffMs = target - now;
  const absSec = Math.max(0, Math.round(Math.abs(diffMs) / 1000));
  if (absSec < 60) {
    return `${absSec} second${absSec === 1 ? "" : "s"}`;
  }
  const min = Math.floor(absSec / 60);
  const sec = absSec % 60;
  if (min < 60) {
    return sec === 0
      ? `${min} minute${min === 1 ? "" : "s"}`
      : `${min}m ${sec}s`;
  }
  const hr = Math.floor(min / 60);
  const rm = min % 60;
  return rm === 0
    ? `${hr} hour${hr === 1 ? "" : "s"}`
    : `${hr}h ${rm}m`;
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

interface RunStepCardProps {
  /** Present once the run has emitted any event for this step. */
  event: WorkflowRunEvent | null;
  /** Step kind from the workflow definition (always known). */
  kind: WorkflowStepKind | null;
  /** Top-level step index, used for the `#N` badge. */
  stepIndex: number;
  status: StepStatus;
  duration: string;
  /**
   * When provided overrides `duration` and re-renders on each tick — used for
   * the currently-running step so the elapsed counter feels live.
   */
  liveElapsedMs?: number | null;
  context: Record<string, unknown> | null;
  isLast: boolean;
}

function RunStepCard({
  event,
  kind,
  stepIndex,
  status,
  duration,
  liveElapsedMs,
  context,
  isLast,
}: RunStepCardProps) {
  const [expanded, setExpanded] = useState(false);
  const tone = STATUS_TONE[status];
  const ToneIcon = tone.Icon;
  const cfg = kind ? STEP_KIND_CONFIG[kind] : undefined;
  const StepIcon = cfg?.icon;

  const detail = (event?.detail ?? {}) as Record<string, unknown>;
  const error = typeof detail.error === "string" ? detail.error : undefined;

  const isRunning = status === "running";
  const isPending = status === "pending";
  const displayDuration =
    liveElapsedMs != null ? fmtDuration(liveElapsedMs) : duration;

  return (
    <div className="relative flex gap-3">
      <div className="flex flex-col items-center">
        <div
          style={{
            background: tone.bg,
            color: tone.fg,
            border: `2px solid ${tone.border}`,
            animation: tone.pulse ? "wf-pulse 1.5s infinite" : undefined,
            boxShadow: isRunning
              ? `0 0 0 4px color-mix(in oklab, ${tone.border} 35%, transparent)`
              : undefined,
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
          onClick={() => !isPending && setExpanded((e) => !e)}
          disabled={isPending && !event}
          aria-disabled={isPending && !event}
          style={
            isRunning
              ? {
                  borderColor: tone.border,
                  backgroundImage: `linear-gradient(110deg, transparent 30%, color-mix(in oklab, ${tone.border} 18%, transparent) 50%, transparent 70%)`,
                  backgroundSize: "200% 100%",
                  animation: "wf-shimmer 2s linear infinite",
                }
              : undefined
          }
          className={cn(
            "flex w-full flex-col gap-1.5 rounded-xl border px-3.5 py-3 text-left transition-colors",
            isRunning
              ? "bg-popover"
              : isPending
                ? "border-dashed bg-card/60"
                : "bg-card border-border hover:border-foreground/20",
            isPending && "cursor-default opacity-70"
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
                className={cn(
                  "grid size-5.5 place-items-center rounded-md shrink-0",
                  isPending && "opacity-60"
                )}
              >
                <StepIcon className="size-3" />
              </span>
            )}
            <div className="min-w-0 flex-1 text-sm font-semibold">
              {cfg?.label ?? event?.eventType ?? "Step"}
              <span className="ml-1.5 font-mono text-[11px] font-normal text-muted-foreground">
                #{stepIndex + 1}
              </span>
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
            <span className="min-w-14 text-right font-mono text-[11px] text-muted-foreground tabular-nums">
              {displayDuration}
            </span>
            {!isPending &&
              (expanded ? (
                <ChevronDown className="size-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-3.5 text-muted-foreground" />
              ))}
          </div>

          {error && (
            <div className="mt-1 ml-8 rounded-md border-l-2 border-destructive bg-destructive/10 px-2.5 py-1.5 text-[12px] text-destructive">
              {error}
            </div>
          )}

          {expanded && event && (
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

type StepRow = {
  stepIndex: number;
  kind: WorkflowStepKind | null;
  event: WorkflowRunEvent | null;
  status: StepStatus;
};

type RunSummary = {
  rows: StepRow[];
  total: number;
  completed: number;
  hasRunning: boolean;
  hasFailed: boolean;
};

/**
 * Pure derivation of the step trace from the workflow definition + the
 * cached run events. Lifted out of `RunDetail` so the collapsible header
 * in `RunPanel` can show the same `n / total` summary without rendering
 * the trace itself.
 */
function buildRunSummary(
  topLevelSteps: WorkflowStep[],
  run: WorkflowRun,
  events: WorkflowRunEvent[],
): RunSummary {
  const isTerminal =
    run.status === "completed" ||
    run.status === "failed" ||
    run.status === "cancelled";

  // Collapse the audit trail to one row per step. The wait lifecycle emits
  // `step_started → step_completed → wait_scheduled`; while the run is parked
  // the step really *is* waiting (not done), but once the run resumes /
  // finishes the same step is done. So we pick last-seen by sequence and
  // then post-process below.
  const sortedEvents = [...events].sort((a, b) => a.sequence - b.sequence);
  const byStep = new Map<number, WorkflowRunEvent>();
  for (const e of sortedEvents) {
    if (e.stepIndex == null) continue;
    if (
      e.eventType === "step_started" ||
      e.eventType === "step_completed" ||
      e.eventType === "step_failed" ||
      e.eventType === "wait_scheduled"
    ) {
      byStep.set(e.stepIndex, e);
    }
  }
  const statusFor = (e: WorkflowRunEvent): StepStatus => {
    switch (e.eventType) {
      case "step_completed":
        return "done";
      case "step_failed":
        return "failed";
      case "wait_scheduled":
        // `run.currentStep` is the *next* step pointer (advanced past the
        // wait), so it's not safe to gate on stepIndex equality. Whenever
        // the run itself is parked, the latest `wait_scheduled` represents
        // an in-flight wait; otherwise it has elapsed and the step is done.
        return run.status === "waiting" ? "waiting" : "done";
      case "step_started":
      default:
        return isTerminal ? "done" : "running";
    }
  };

  // Pre-fill: render one row per step in the workflow definition so the
  // timeline appears deterministic from the first paint. Steps without an
  // event yet are shown in a `pending` (dashed, dimmed) state — and as
  // `step` events stream in they swap to running/done/failed in place.
  const definitionRows: StepRow[] = topLevelSteps.map((step, idx) => {
    const ev = byStep.get(idx) ?? null;
    return {
      stepIndex: idx,
      kind: step.kind as WorkflowStepKind,
      event: ev,
      status: ev ? statusFor(ev) : "pending",
    };
  });
  // Fallback when we don't have a definition (e.g. during loading) — fall
  // back to the audit-trail derived list so we still render *something*.
  const auditRows: StepRow[] = [...byStep.entries()]
    .sort(([a], [b]) => a - b)
    .map(([idx, event]) => ({
      stepIndex: idx,
      kind: (event.stepKind as WorkflowStepKind | undefined) ?? null,
      event,
      status: statusFor(event),
    }));
  const rows: StepRow[] = definitionRows.length > 0 ? definitionRows : auditRows;

  const total = rows.length;
  const completed = rows.filter(
    (r) => r.status === "done" || r.status === "failed" || r.status === "waiting",
  ).length;
  const hasRunning = rows.some((r) => r.status === "running");
  const hasFailed = rows.some((r) => r.status === "failed");

  return { rows, total, completed, hasRunning, hasFailed };
}

interface RunBannersProps {
  run: WorkflowRun;
  now: number;
}

/**
 * Run-level banners (last error, waiting countdown). Rendered above the
 * collapsible Step trace so they remain visible when the trace is minimised.
 */
function RunBanners({ run, now }: RunBannersProps) {
  const showError = Boolean(run.lastError);
  const showWaiting =
    run.status === "waiting" && (run.nextStepAt || run.awaitingEventType);
  if (!showError && !showWaiting) return null;
  return (
    <div className="flex flex-col gap-2 px-6 py-3">
      {showError && (
        <div className="rounded-xl border-l-4 border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <div className="font-semibold">Last error</div>
          <div className="mt-1 font-mono text-xs">{run.lastError}</div>
        </div>
      )}
      {showWaiting && (
        <div className="rounded-xl border border-status-warning-border bg-status-warning-bg px-4 py-3 text-xs text-status-warning-fg">
          {run.nextStepAt && (
            <>
              {isOverdue(run.nextStepAt) ? (
                <>
                  Resume due <strong>{formatTimeUntil(run.nextStepAt, now)} ago</strong>
                </>
              ) : (
                <>
                  Resumes in <strong>{formatTimeUntil(run.nextStepAt, now)}</strong>
                </>
              )}
              <span className="text-status-warning-fg/70">
                {" "}({absoluteTime(run.nextStepAt)})
              </span>
            </>
          )}
          {run.awaitingEventType && (
            <>
              {run.nextStepAt ? " · awaiting event " : "Awaiting event "}
              <code className="rounded bg-popover px-1 py-0.5 font-mono">
                {run.awaitingEventType}
              </code>
            </>
          )}
          .
        </div>
      )}
    </div>
  );
}

interface StepTraceHeaderProps {
  summary: RunSummary | null;
  collapsed: boolean;
  onToggle: () => void;
  isTerminal: boolean;
}

/**
 * Slim header bar above the Step trace panel, modelled on n8n's "Logs"
 * row. Always visible; clicking anywhere on it (or the chevron) toggles
  * the trace open/closed.
 */
function StepTraceHeader({
  summary,
  collapsed,
  onToggle,
  isTerminal,
}: StepTraceHeaderProps) {
  const total = summary?.total ?? 0;
  const completed = summary?.completed ?? 0;
  const numerator = isTerminal ? total : Math.min(completed, total);
  const dotClass = !summary
    ? "bg-muted-foreground"
    : summary.hasFailed
      ? "bg-status-danger-fg"
      : summary.hasRunning
        ? "bg-status-warning-fg animate-pulse motion-reduce:animate-none"
        : completed === total && total > 0
          ? "bg-status-success-fg"
          : "bg-muted-foreground";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      aria-controls="run-step-trace"
      className="flex w-full items-center gap-2.5 border-t border-border bg-card/80 px-6 py-2.5 text-left transition-colors hover:bg-muted/60"
    >
      <span className={cn("size-1.5 rounded-full", dotClass)} aria-hidden />
      <h3 className="text-sm font-semibold">Step trace</h3>
      {total > 0 && (
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {numerator}
          <span className="text-muted-foreground/60"> / {total}</span>
        </span>
      )}
      <span className="ml-auto inline-flex items-center text-muted-foreground">
        {collapsed ? (
          <ChevronUp className="size-4" />
        ) : (
          <ChevronDown className="size-4" />
        )}
      </span>
    </button>
  );
}

interface RunDetailProps {
  /** Pre-computed step rows for the timeline. */
  summary: RunSummary;
  /** The run, used for live-elapsed and last-row context display. */
  run: WorkflowRun;
  /** True while the SSE stream is open — drives the live elapsed counter. */
  isLive: boolean;
  /** Ticking timestamp from the parent (only re-renders during a live run). */
  now: number;
}

function RunDetail({ summary, run, isLive, now }: RunDetailProps) {
  const stepRows = summary.rows;

  // Compute the running step's live elapsed: time since its `step_started`
  // event was emitted. Used only when the run is still live.
  const liveElapsedMsFor = (row: StepRow): number | null => {
    if (!isLive || row.status !== "running" || !row.event) return null;
    const startedAt = parseUtcMs(row.event.createdAt);
    return Math.max(0, now - startedAt);
  };

  return (
    <div className="p-6 pt-4">
      {stepRows.length === 0 ? (
        <EmptyState
          title="No step events yet"
          description="Steps will appear here as the run progresses."
        />
      ) : (
        <div className="flex flex-col">
          {stepRows.map((row, i) => (
            <RunStepCard
              key={row.stepIndex}
              event={row.event}
              kind={row.kind}
              stepIndex={row.stepIndex}
              status={row.status}
              duration={fmtDuration(row.event?.durationMs)}
              liveElapsedMs={liveElapsedMsFor(row)}
              context={i === stepRows.length - 1 ? run.context : null}
              isLast={i === stepRows.length - 1}
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
  const triggers = workflowData?.data.triggers ?? [];
  const allSteps = workflowData?.data.definition.steps ?? [];
  // Top-level steps drive the pre-filled trace; nested steps (children of
  // routers / loops) live under their parent in the flat array and are
  // surfaced when the parent expands, so we filter them out here.
  const topLevelSteps = allSteps.filter((s) => !s.parentStepName);
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
      <RunPanel
        runId={selectedId}
        triggers={triggers}
        steps={allSteps}
        topLevelSteps={topLevelSteps}
      />
    </div>
  );
}

interface RunPanelProps {
  runId: string | null;
  triggers: WorkflowTrigger[];
  /** Full flat step list (used by the canvas to render nested branches). */
  steps: WorkflowStep[];
  /** Top-level steps used by the timeline pre-fill. */
  topLevelSteps: WorkflowStep[];
}

/**
 * Owns the run query + SSE stream subscription, then forks the data into
 * two synchronized views:
 *   - `RunCanvas` (top): the workflow graph painted with live status
 *   - `RunDetail` (bottom): the metric strip + step trace timeline
 *
 * Hoisting these here means there is exactly one TanStack Query subscription
 * and one SSE stream open per selected run, even though both children render
 * the same data.
 */
function RunPanel({ runId, triggers, steps, topLevelSteps }: RunPanelProps) {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useWorkflowRun(runId ?? "");

  const isLive = data?.data?.run?.status === "running";
  // The run is "in flight" while it's actively executing OR parked in a
  // wait. We tick the clock for both so the Duration metric keeps counting
  // up during pauses and the "Resumes in 57 seconds" countdown advances
  // smoothly between SSE events / refetches.
  const isInFlight =
    isLive || data?.data?.run?.status === "waiting";

  // Tick every 500ms while in-flight so the canvas's run-elapsed counter,
  // the timeline's per-step elapsed counter, the Duration metric, and any
  // "Resumes in …" relative time all advance between SSE events.
  const now = useNow(500, isInFlight);

  // Local UI state: the Step trace section starts expanded and can be
  // minimised so the canvas takes the full pane (mirrors the n8n "Logs"
  // collapse pattern). Not persisted across selections.
  const [traceCollapsed, setTraceCollapsed] = useState(false);

  // Track which step events we've already toasted for this run, so the
  // initial replay (when first connecting to the SSE stream) and any
  // reconnects don't re-fire toasts. Reset whenever the selected run
  // changes — done in an effect so we don't mutate refs during render.
  const toastedSequencesRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    toastedSequencesRef.current = new Set();
  }, [runId]);

  useWorkflowRunStream(runId, Boolean(runId) && isLive, {
    onRun: (run) => {
      queryClient.setQueryData<WorkflowRunDetailResponse>(
        ["workflow-runs", "detail", runId],
        (prev) => (prev ? { ...prev, data: { ...prev.data, run } } : prev)
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
      // Surface high-signal step completions as toasts so users notice when
      // a real-world side effect (email / SMS / HTTP) actually happened.
      // We gate on event recency to avoid replaying the entire history
      // when the user opens an old run.
      maybeToastStepEvent(event, toastedSequencesRef.current);
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

  // Run-level elapsed feeds the canvas status strip. Once the run is
  // terminal we use its persisted completion timestamp so the value stops.
  const run = data?.data?.run;
  const elapsedMs = run
    ? run.completedAt
      ? parseUtcMs(run.completedAt) - parseUtcMs(run.startedAt)
      : Math.max(0, now - parseUtcMs(run.startedAt))
    : 0;

  // Pre-compute the step trace summary so the collapsible header can show
  // `n / total` and a status dot without rendering the trace itself.
  const summary = run ? buildRunSummary(topLevelSteps, run, data?.data.events ?? []) : null;
  const isTerminal = run
    ? run.status === "completed" || run.status === "failed" || run.status === "cancelled"
    : false;

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div
        className={cn(
          "relative border-b border-border bg-background",
          traceCollapsed ? "min-h-0 flex-1" : "h-1/2 min-h-72",
        )}
      >
        {run ? (
          <RunCanvas
            triggers={triggers}
            steps={steps}
            run={run}
            events={data?.data.events ?? []}
            isLive={Boolean(isLive)}
            elapsedMs={elapsedMs}
            now={now}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <Skeleton className="h-40 w-full max-w-md" />
          </div>
        )}
      </div>
      {run && <RunBanners run={run} now={now} />}
      <StepTraceHeader
        summary={summary}
        collapsed={traceCollapsed}
        onToggle={() => setTraceCollapsed((c) => !c)}
        isTerminal={isTerminal}
      />
      {!traceCollapsed && (
        <div
          id="run-step-trace"
          className="min-h-0 flex-1 overflow-y-auto"
        >
          {isLoading || !data || !run || !summary ? (
            <div className="space-y-4 p-6">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <RunDetail
              summary={summary}
              run={run}
              isLive={Boolean(isLive)}
              now={now}
            />
          )}
        </div>
      )}
    </div>
  );
}
