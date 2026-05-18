"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Radio, XCircle } from "lucide-react";
import { format as formatDate } from "date-fns";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { isRunOutdated } from "@/lib/workflow-versions";
import {
  flattenRunSteps,
  replaceRunStepByPath,
} from "@/lib/workflows-normalize";
import {
  useCancelWorkflowRun,
  useWorkflowRun,
  useWorkflowRunStream,
  useWorkflowRuns,
  WorkflowRunCancelError,
} from "@/lib/hooks/use-workflow-runs";
import { useWorkflow } from "@/lib/hooks/use-workflows";
import { RunCanvas } from "./RunCanvas";
import { LogsPane } from "./logs/LogsPane";
import type {
  WorkflowNote,
  WorkflowRun,
  WorkflowRunDetailResponse,
  WorkflowRunEvent,
  WorkflowRunStep,
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
  /** Current/latest definition version — used to flag outdated runs. */
  definitionVersion?: number;
  /** Boot the rail filter into "Outdated only" (deep-link from banner). */
  initialOutdatedOnly?: boolean;
}

/** Rail filter — combinable with the existing run-status filter. */
type VersionFilter = "all" | "current" | "outdated";

const VERSION_FILTER_LABEL: Record<VersionFilter, string> = {
  all: "All versions",
  current: "Current only",
  outdated: "Outdated only",
};

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
const HIGH_SIGNAL_STEP_KINDS: ReadonlySet<WorkflowStepKind> = new Set<WorkflowStepKind>(
  ["send_email", "send_sms", "http_call"]
);

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
 *
 * Retry semantics: a `step_failed` immediately followed by
 * `step_retry_scheduled` is treated as transient. Callers track which
 * `stepIndex` values have already had a retry scheduled — when the retry
 * arrives we dismiss any prior failure toast and fire a single info-level
 * "Retrying" toast (once per step). Subsequent failures on a retried step
 * are suppressed until the *terminal* failure (which arrives without a
 * following retry) hits.
 */
function maybeToastStepEvent(
  event: WorkflowRunEvent,
  toasted: Set<number>,
  retriedSteps: Set<number>
): void {
  if (toasted.has(event.sequence)) return;
  toasted.add(event.sequence);

  const kind = event.stepKind as WorkflowStepKind | undefined;
  if (!kind || !HIGH_SIGNAL_STEP_KINDS.has(kind)) return;

  const ageMs = Date.now() - new Date(event.createdAt).getTime();
  if (Number.isFinite(ageMs) && ageMs > 10_000) return;

  const label = highSignalStepLabel(kind);
  const stepIdx = event.stepIndex ?? -1;

  if (event.eventType === "step_retry_scheduled") {
    const detail = (event.detail ?? {}) as Record<string, unknown>;
    const nextAttempt = Number(detail.nextAttempt ?? 0);
    const maxAttempts = Number(detail.maxAttempts ?? 0);
    const delayMs = Number(detail.delayMs ?? 0);
    // Dismiss any failure toast we already fired for this step — it was a
    // transient failure that the engine is about to retry.
    if (stepIdx >= 0) toast.dismiss(`step-failed-${stepIdx}`);
    // Only emit one retry toast per step to avoid a flood when a step
    // retries multiple times.
    if (stepIdx >= 0 && retriedSteps.has(stepIdx)) return;
    if (stepIdx >= 0) retriedSteps.add(stepIdx);
    const delayCopy =
      delayMs >= 1000 ? `${Math.round(delayMs / 1000)}s` : `${delayMs}ms`;
    toast.info(`${label} retrying`, {
      id: stepIdx >= 0 ? `step-retrying-${stepIdx}` : undefined,
      description:
        nextAttempt && maxAttempts
          ? `Next attempt in ${delayCopy} (attempt ${nextAttempt} of ${maxAttempts})`
          : `Next attempt in ${delayCopy}`,
    });
    return;
  }

  if (event.eventType !== "step_completed" && event.eventType !== "step_failed") {
    return;
  }

  const duration = event.durationMs != null ? fmtDuration(event.durationMs) : null;
  const detail = (event.detail ?? {}) as Record<string, unknown>;
  const errorMsg = typeof detail.error === "string" ? detail.error : undefined;

  if (event.eventType === "step_failed") {
    // Suppress the failure toast when this step has previously retried —
    // the retry path already informed the user. The *terminal* failure
    // after the last retry attempt won't be followed by another
    // `step_retry_scheduled`, so it stays suppressed too; the run-level
    // failure (visible in the header status) communicates the final state.
    if (stepIdx >= 0 && retriedSteps.has(stepIdx)) return;
    toast.error(`${label} failed`, {
      id: stepIdx >= 0 ? `step-failed-${stepIdx}` : undefined,
      description: errorMsg ?? (duration ? `Took ${duration}` : undefined),
    });
  } else {
    const verb = kind === "http_call" ? "completed" : "sent";
    toast.success(`${label} ${verb}`, {
      description: duration ? `Completed in ${duration}` : undefined,
    });
  }
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

/** Absolute local time, e.g. "10 May 2026, 18:11". */
function absoluteTime(iso: string): string {
  try {
    return formatDate(new Date(iso), "d MMM yyyy, HH:mm");
  } catch {
    return iso;
  }
}

function isOverdue(iso: string): boolean {
  return new Date(iso).getTime() <= Date.now();
}

/**
 * Render `Resumes in 57 seconds` style copy that ticks every parent
 * render. Mirrors `formatDistanceToNowStrict({ addSuffix: false })` but
 * computed off the supplied `now` so it stays in sync with the rest of
 * the live-run UI.
 */
function formatTimeUntil(iso: string, now: number): string {
  const target = new Date(iso).getTime();
  const diffMs = target - now;
  const absSec = Math.max(0, Math.round(Math.abs(diffMs) / 1000));
  if (absSec < 60) {
    return `${absSec} second${absSec === 1 ? "" : "s"}`;
  }
  const min = Math.floor(absSec / 60);
  const sec = absSec % 60;
  if (min < 60) {
    return sec === 0 ? `${min} minute${min === 1 ? "" : "s"}` : `${min}m ${sec}s`;
  }
  const hr = Math.floor(min / 60);
  const rm = min % 60;
  return rm === 0 ? `${hr} hour${hr === 1 ? "" : "s"}` : `${hr}h ${rm}m`;
}

/** "May 9, 12:22:32" — local-time stamp shown as the rail item title. */
function runRailStartedAt(run: WorkflowRun): string {
  try {
    return formatDate(new Date(run.startedAt), "MMM d, HH:mm:ss");
  } catch {
    return run.startedAt;
  }
}

/**
 * Compact duration with millisecond precision under one minute, e.g.
 * `4.837s` / `25m 4.837s` / `1h 2m`. Mirrors the rail design where the
 * subtitle reads "Succeeded in 25m 4.837s".
 */
function runRailDuration(run: WorkflowRun, now: number): string {
  const start = new Date(run.startedAt).getTime();
  const end = run.completedAt != null ? new Date(run.completedAt).getTime() : now;
  const ms = Math.max(0, end - start);
  const totalSec = ms / 1000;
  if (totalSec < 60) return `${totalSec.toFixed(3)}s`;
  const totalMin = Math.floor(totalSec / 60);
  const rs = totalSec - totalMin * 60;
  if (totalMin < 60) return `${totalMin}m ${rs.toFixed(3)}s`;
  const h = Math.floor(totalMin / 60);
  const rm = totalMin - h * 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

/**
 * Rail subtitle, "Succeeded in …" / "Failed after …" / "Running …".
 * Combines the past/present-tense status verb with the elapsed duration.
 */
function runRailSubtitle(run: WorkflowRun, now: number): string {
  const dur = runRailDuration(run, now);
  switch (run.status) {
    case "completed":
      return `Succeeded in ${dur}`;
    case "failed":
      return `Failed after ${dur}`;
    case "cancelled":
      return `Cancelled after ${dur}`;
    case "running":
      return `Running · ${dur}`;
    case "waiting":
      return `Waiting · ${dur}`;
  }
}

interface RunListRailProps {
  runs: WorkflowRun[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  /** Current/latest definition version \u2014 cells annotate stale rows. */
  definitionVersion: number;
  /** Filter selection (controlled). */
  versionFilter: VersionFilter;
  onVersionFilterChange: (next: VersionFilter) => void;
  /** Total runs available before the version filter, for empty-state copy. */
  totalRuns: number;
}

function RunListRail({
  runs,
  selectedId,
  onSelect,
  loading,
  definitionVersion,
  versionFilter,
  onVersionFilterChange,
  totalRuns,
}: RunListRailProps) {
  // Tick once per second so the elapsed duration on in-progress runs stays
  // in sync without depending on the SSE stream \u2014 keeps the rail feeling
  // alive even if no events fire.
  const hasLive = runs.some((r) => r.status === "running" || r.status === "waiting");
  const now = useNow(1000, hasLive);
  return (
    <aside className="flex w-72 flex-col border-r border-border bg-background">
      <header className="flex items-center justify-between gap-2 px-3.5 py-3">
        <h3 className="text-sm font-semibold">Recent runs</h3>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Filter runs by version"
          >
            {VERSION_FILTER_LABEL[versionFilter]}
            <ChevronDown className="size-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={4} className="w-44">
            <DropdownMenuRadioGroup
              value={versionFilter}
              onValueChange={(v) => onVersionFilterChange(v as VersionFilter)}
            >
              <DropdownMenuRadioItem value="all">All versions</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="current">
                Current only (v{definitionVersion})
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="outdated">
                Outdated only
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {loading && runs.length === 0 ? (
          <div className="space-y-2 px-2">
            {["a", "b", "c"].map((slot) => (
              <Skeleton key={slot} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            {totalRuns === 0
              ? "No runs yet. Use the Test run button to fire a manual trigger."
              : "No runs match this filter."}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {runs.map((r) => {
              const active = r.id === selectedId;
              const isFailed = r.status === "failed";
              const outdated =
                definitionVersion > 0 && r.definitionVersion < definitionVersion;
              const unknownVersion = r.definitionVersion > definitionVersion;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(r.id)}
                    className={cn(
                      "flex w-full flex-col gap-1 rounded-md px-3 py-2.5 text-left transition-colors",
                      active ? "bg-muted" : "hover:bg-muted/60"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[13px] font-semibold leading-tight text-foreground">
                        {runRailStartedAt(r)}
                      </div>
                      <span
                        className={cn(
                          "shrink-0 font-mono text-[10px] tabular-nums",
                          unknownVersion
                            ? "text-destructive"
                            : outdated
                              ? "text-status-warning-fg"
                              : "text-muted-foreground/70"
                        )}
                        title={
                          unknownVersion
                            ? `Unknown version (current is v${definitionVersion})`
                            : outdated
                              ? `Outdated \u2014 current is v${definitionVersion}`
                              : `Definition v${r.definitionVersion}`
                        }
                      >
                        {unknownVersion
                          ? `v? (unknown)`
                          : outdated
                            ? `v${r.definitionVersion} (outdated)`
                            : `v${r.definitionVersion}`}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "text-[12px] leading-tight text-muted-foreground",
                        isFailed && "text-status-danger-fg"
                      )}
                    >
                      {runRailSubtitle(r, now)}
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

type StepRow = {
  step: WorkflowRunStep;
};

type RunSummary = {
  rows: StepRow[];
  total: number;
  completed: number;
  hasRunning: boolean;
  hasFailed: boolean;
};

/**
 * Pure derivation of the step trace summary from the server-computed
 * projection. Lifted out of `RunDetail` so the collapsible header in
 * `RunPanel` can show the same `n / total` summary without rendering the
 * trace itself.
 *
 * The gateway returns one `WorkflowRunStep` per definition step (snapshotted
 * at run start), so we just pass them through; the only derived values are
 * the aggregate counts the header needs.
 */
function buildRunSummary(run: WorkflowRun, steps: WorkflowRunStep[]): RunSummary {
  // Flatten the projection tree so nested router/loop children are counted.
  const flat = flattenRunSteps(steps);
  const rows: StepRow[] = flat.map((s) => ({ step: s }));
  let completed = 0;
  let hasRunning = false;
  let hasFailed = false;
  for (const s of flat) {
    if (
      s.status === "done" ||
      s.status === "failed" ||
      s.status === "waiting" ||
      s.status === "skipped"
    ) {
      completed += 1;
    }
    if (s.status === "running") hasRunning = true;
    if (s.status === "failed") hasFailed = true;
  }
  return {
    rows,
    // `run.totalSteps` is the snapshot of `definition.steps.length` at run
    // start \u2014 immune to mid-run definition edits and the canonical
    // denominator for the Step trace header.
    total: run.totalSteps,
    completed,
    hasRunning,
    hasFailed,
  };
}

interface RunBannersProps {
  run: WorkflowRun;
  now: number;
  /** Reason from the `run_cancelled` audit event, when present. */
  cancelReason?: string | null;
}

/**
 * Run-level banners (last error, waiting countdown, cancellation reason).
 * Rendered above the collapsible Step trace so they remain visible when the
 * trace is minimised.
 */
function RunBanners({ run, now, cancelReason }: RunBannersProps) {
  const showError = Boolean(run.lastError);
  const showWaiting =
    run.status === "waiting" && (run.nextStepAt || run.awaitingEventType);
  const showCancelled = run.status === "cancelled";
  if (!showError && !showWaiting && !showCancelled) return null;
  return (
    <div className="flex flex-col gap-2 px-6 py-3">
      {showError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <div className="font-semibold">Last error</div>
          <div className="mt-1 font-mono text-xs">{run.lastError}</div>
        </div>
      )}
      {showCancelled && !showError && (
        <div className="rounded-xl border border-status-neutral-border bg-status-neutral-bg px-4 py-3 text-sm text-status-neutral-fg">
          <div className="font-semibold">Run cancelled</div>
          <div className="mt-1 text-xs">
            {cancelReason
              ? cancelReason
              : "Cancellation requested via the run detail page."}
          </div>
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
                {" "}
                ({absoluteTime(run.nextStepAt)})
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
  run: WorkflowRun | null;
  isLive: boolean;
  elapsedMs: number;
  /** Current/latest definition version — used to render the outdated chip. */
  definitionVersion: number;
}

/**
 * Slim header bar above the Step trace panel, modelled on n8n's "Logs"
 * row. Always visible; clicking anywhere on it (or the chevron) toggles
 * the trace open/closed.
 *
 * Also doubles as the run status strip — surfaces the run status badge,
 * a Live pill while the SSE stream is open, the `n / total` step count,
 * and the live duration counter. (The canvas no longer renders its own
 * status bar.)
 */
function StepTraceHeader({
  summary,
  collapsed,
  onToggle,
  isTerminal,
  run,
  isLive,
  elapsedMs,
  definitionVersion,
}: StepTraceHeaderProps) {
  const total = summary?.total ?? 0;
  const completed = summary?.completed ?? 0;
  const numerator = isTerminal ? total : Math.min(completed, total);
  // Only flag the version chip when this run is genuinely on an older
  // definition. A `definitionDeleted` chip variant covers the edge case
  // where the workflow row vanished but its runs persist (definitionVersion
  // is still meaningful, but the current version is unknowable).
  const showVersionChip = run != null && run.definitionVersion < definitionVersion;
  const unknownVersion = run != null && run.definitionVersion > definitionVersion;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      aria-controls="run-step-trace"
      className="flex w-full items-center gap-2.5 border-t border-border bg-card/80 px-6 py-2.5 text-left transition-colors hover:bg-muted/60"
    >
      {run && <StatusBadge status={run.status} dot className="capitalize" />}
      {showVersionChip && (
        <span
          className="inline-flex items-center gap-1 rounded-full border border-status-warning-border bg-status-warning-bg px-2 py-px text-[10px] font-semibold uppercase tracking-wider text-status-warning-fg"
          title={`This run is pinned to v${run!.definitionVersion}; current is v${definitionVersion}.`}
        >
          Running on v{run!.definitionVersion} (current is v{definitionVersion})
        </span>
      )}
      {unknownVersion && (
        <span
          className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-px text-[10px] font-semibold uppercase tracking-wider text-destructive"
          title={`Run reports v${run!.definitionVersion} but current is only v${definitionVersion}. Possible definition rollback or stale cache.`}
        >
          v? (unknown, current is v{definitionVersion})
        </span>
      )}
      {isLive && (
        <span
          className="inline-flex items-center gap-1 rounded-full border border-status-warning-border bg-status-warning-bg px-1.5 py-px text-[9px] font-semibold uppercase tracking-[0.08em] text-status-warning-fg"
          aria-label="Live stream connected"
          title="Streaming live updates"
        >
          <Radio
            className="size-2.5 motion-reduce:animate-none"
            style={{ animation: "wf-pulse 900ms infinite" }}
          />
          Live
        </span>
      )}
      <h3 className="text-sm font-semibold">Step trace</h3>
      {total > 0 && (
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {numerator}
          <span className="text-muted-foreground/60"> / {total}</span>
        </span>
      )}
      <span className="ml-auto flex items-center gap-2">
        {run && (
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {fmtDuration(elapsedMs)}
          </span>
        )}
        <span className="inline-flex items-center text-muted-foreground">
          {collapsed ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </span>
      </span>
    </button>
  );
}

export function RunView({
  workflowId,
  initialRuns,
  initialRunId,
  definitionVersion = 1,
  initialOutdatedOnly = false,
}: RunViewProps) {
  const { data, isLoading } = useWorkflowRuns(workflowId, { limit: 50 }, initialRuns);
  // The workflow definition is still required for the canvas (graph layout +
  // nested branches). The timeline no longer reads from it — the gateway
  // returns a per-step projection on the run detail response.
  const { data: workflowData } = useWorkflow(workflowId);
  const triggers = workflowData?.data.triggers ?? [];
  const allSteps = workflowData?.data.definition.steps ?? [];
  const allNotes = workflowData?.data.definition.notes ?? [];
  // Prefer the live workflow version when available; fall back to the SSR
  // value supplied by `RunsClient`.
  const currentVersion = workflowData?.data.version ?? definitionVersion;
  const allRuns = useMemo(() => data?.data ?? [], [data]);

  const [versionFilter, setVersionFilter] = useState<VersionFilter>(
    initialOutdatedOnly ? "outdated" : "all"
  );

  // Apply the version filter as an AND-combinable layer over the existing
  // status-driven rail. Uses the shared `isRunOutdated()` selector so the
  // count here cannot drift from the badge / banner / chip on other screens.
  const visibleRuns = useMemo(() => {
    if (versionFilter === "all") return allRuns;
    if (versionFilter === "outdated") {
      return allRuns.filter((r) => isRunOutdated(r, { version: currentVersion }));
    }
    return allRuns.filter((r) => r.definitionVersion === currentVersion);
  }, [allRuns, versionFilter, currentVersion]);

  const [selectedId, setSelectedId] = useState<string | null>(
    initialRunId ?? visibleRuns[0]?.id ?? allRuns[0]?.id ?? null
  );

  // If the selection is filtered out, fall back to the first visible row so
  // the right-hand pane never sticks on a stale empty state.
  if (
    selectedId &&
    visibleRuns.length > 0 &&
    !visibleRuns.some((r) => r.id === selectedId)
  ) {
    setSelectedId(visibleRuns[0].id);
  } else if (!selectedId && visibleRuns[0]) {
    setSelectedId(visibleRuns[0].id);
  }

  return (
    <div className="flex h-full min-h-0">
      <RunListRail
        runs={visibleRuns}
        selectedId={selectedId}
        onSelect={setSelectedId}
        loading={isLoading}
        definitionVersion={currentVersion}
        versionFilter={versionFilter}
        onVersionFilterChange={setVersionFilter}
        totalRuns={allRuns.length}
      />
      <RunPanel
        runId={selectedId}
        workflowId={workflowId}
        triggers={triggers}
        steps={allSteps}
        notes={allNotes}
        definitionVersion={currentVersion}
      />
    </div>
  );
}

interface RunPanelProps {
  runId: string | null;
  workflowId: string;
  triggers: WorkflowTrigger[];
  /** Full flat step list (used by the canvas to render nested branches). */
  steps: WorkflowStep[];
  /** Sticky-note annotations from the workflow definition (read-only). */
  notes?: WorkflowNote[];
  /** Current/latest definition version — drives the run-detail version chip. */
  definitionVersion: number;
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
function RunPanel({
  runId,
  workflowId,
  triggers,
  steps,
  notes,
  definitionVersion,
}: RunPanelProps) {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useWorkflowRun(runId ?? "");
  const cancelRun = useCancelWorkflowRun(runId ?? "");

  const isLive = data?.data?.run?.status === "running";
  // The run is "in flight" while it's actively executing OR parked in a
  // wait. We tick the clock for both so the Duration metric keeps counting
  // up during pauses and the "Resumes in 57 seconds" countdown advances
  // smoothly between SSE events / refetches.
  const isInFlight = isLive || data?.data?.run?.status === "waiting";

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
  // Track which `stepIndex` values have had a `step_retry_scheduled`
  // event observed. Used to suppress the failure toast for retried steps
  // and to ensure we only fire one "Retrying" toast per step.
  const retriedStepsRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    toastedSequencesRef.current = new Set();
    retriedStepsRef.current = new Set();
  }, [runId]);

  useWorkflowRunStream(runId, Boolean(runId) && isInFlight, {
    onRun: (run) => {
      queryClient.setQueryData<WorkflowRunDetailResponse>(
        ["workflow-runs", "detail", runId],
        (prev) => (prev ? { ...prev, data: { ...prev.data, run } } : prev)
      );
    },
    onStepState: (step) => {
      // Replace the matching projection entry by `stepPath` — the gateway
      // returns the projection as a tree, and `stepIndex` is reset to 0
      // inside each nested container so it's no longer unique. For
      // top-level entries the server may return `stepPath: null`; in that
      // case `stepIndex` is still unique within the top-level array so
      // fall back to an index-based replace.
      queryClient.setQueryData<WorkflowRunDetailResponse>(
        ["workflow-runs", "detail", runId],
        (prev) => {
          if (!prev) return prev;
          const steps = prev.data.steps ?? [];
          if (step.stepPath) {
            const next = replaceRunStepByPath(steps, step);
            if (next === steps) return prev;
            return { ...prev, data: { ...prev.data, steps: next } };
          }
          const idx = steps.findIndex((s) => s.stepIndex === step.stepIndex);
          const next =
            idx === -1
              ? [...steps, step].sort((a, b) => a.stepIndex - b.stepIndex)
              : steps.map((s, i) => (i === idx ? step : s));
          return { ...prev, data: { ...prev.data, steps: next } };
        }
      );
    },
    onStep: (event) => {
      queryClient.setQueryData<WorkflowRunDetailResponse>(
        ["workflow-runs", "detail", runId],
        (prev) => {
          if (!prev) return prev;
          const events = prev.data.events;
          if (events.some((e) => e.sequence === event.sequence)) return prev;
          const next = [...events, event].sort((a, b) => a.sequence - b.sequence);
          return { ...prev, data: { ...prev.data, events: next } };
        }
      );
      // Surface high-signal step completions as toasts so users notice when
      // a real-world side effect (email / SMS / HTTP) actually happened.
      // We gate on event recency to avoid replaying the entire history
      // when the user opens an old run.
      maybeToastStepEvent(event, toastedSequencesRef.current, retriedStepsRef.current);
    },
    onDone: () => {
      // Pull the canonical audit (status + full event list + projection)
      // once the stream closes — covers terminal runs and waiting/paused
      // runs alike.
      void refetch();
    },
  });

  // Cancel-run dialog state. Reset whenever the selected run changes by
  // tracking `runId` across renders (avoids an effect-driven cascade).
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReasonInput, setCancelReasonInput] = useState("");
  // "Store previous value during render" pattern; read at the equality check
  // below to detect runId changes without a setState-in-effect cascade.
  const [lastCancelRunId, setLastCancelRunId] = useState<string | null>(runId ?? null);
  if (lastCancelRunId !== (runId ?? null)) {
    setLastCancelRunId(runId ?? null);
    setCancelOpen(false);
    setCancelReasonInput("");
  }

  // Pull the cancellation reason out of the audit trail so the banner can
  // explain *why* the run was cancelled. The backend writes it into
  // `detail.reason` on the `run_cancelled` event. Computed before the
  // early return so the hook order stays stable across renders.
  const cancelReason = useMemo<string | null>(() => {
    if (data?.data?.run?.status !== "cancelled") return null;
    const evts = data.data.events ?? [];
    const ev = [...evts].reverse().find((e) => e.eventType === "run_cancelled");
    const detail = (ev?.detail ?? {}) as Record<string, unknown>;
    return typeof detail.reason === "string" && detail.reason.trim()
      ? detail.reason
      : null;
  }, [data]);

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
      ? new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()
      : Math.max(0, now - new Date(run.startedAt).getTime())
    : 0;

  // Pre-compute the step trace summary so the collapsible header can show
  // `n / total` and a status dot without rendering the trace itself.
  const summary = run ? buildRunSummary(run, data?.data.steps ?? []) : null;
  const isTerminal = run
    ? run.status === "completed" ||
      run.status === "failed" ||
      run.status === "cancelled"
    : false;
  const canCancel = run?.status === "running" || run?.status === "waiting";

  async function handleCancel() {
    if (!runId) return;
    try {
      const reason = cancelReasonInput.trim();
      const result = await cancelRun.mutateAsync(reason ? { reason } : undefined);
      setCancelOpen(false);
      setCancelReasonInput("");
      if (result.data.alreadyTerminal) {
        toast.info("Run already finished", {
          description: "No changes — the run had already reached a terminal state.",
        });
      } else {
        toast.success("Cancellation requested", {
          description: "The run will stop after the current step.",
        });
      }
    } catch (err) {
      if (err instanceof WorkflowRunCancelError && err.code === "CONFLICT") {
        // Concurrent modification — refresh and let the user retry.
        void refetch();
        toast.error("Run was modified concurrently", {
          description: "Refreshed the latest state — please try again.",
        });
      } else {
        const message = err instanceof Error ? err.message : "Failed to cancel run";
        toast.error("Cancel failed", { description: message });
      }
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div
        className={cn(
          "relative border-b border-border bg-background",
          traceCollapsed ? "min-h-0 flex-1" : "h-1/2 min-h-72"
        )}
      >
        {run ? (
          <RunCanvas
            triggers={triggers}
            steps={steps}
            notes={notes}
            runSteps={data?.data.steps ?? []}
            now={now}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <Skeleton className="h-40 w-full max-w-md" />
          </div>
        )}
        {canCancel && (
          <div className="pointer-events-none absolute top-3 right-3 z-10">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="pointer-events-auto gap-1.5 bg-background/90 shadow-sm backdrop-blur"
              onClick={() => setCancelOpen(true)}
              disabled={cancelRun.isPending}
            >
              <XCircle className="size-3.5" />
              Cancel run
            </Button>
          </div>
        )}
      </div>
      {run && <RunBanners run={run} now={now} cancelReason={cancelReason} />}
      <StepTraceHeader
        summary={summary}
        collapsed={traceCollapsed}
        onToggle={() => setTraceCollapsed((c) => !c)}
        isTerminal={isTerminal}
        run={run ?? null}
        isLive={Boolean(isLive)}
        elapsedMs={elapsedMs}
        definitionVersion={definitionVersion}
      />
      {!traceCollapsed && (
        <div id="run-step-trace" className="min-h-0 flex-1 overflow-y-auto">
          {isLoading || !data || !run || !summary ? (
            <div className="space-y-4 p-6">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <LogsPane
              runId={runId}
              events={data.data.events ?? []}
              runSteps={data.data.steps ?? []}
              definitionSteps={steps}
              isLive={isInFlight}
              workflowId={workflowId}
            />
          )}
        </div>
      )}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this run?</AlertDialogTitle>
            <AlertDialogDescription>
              The run will stop after its current step. In-flight HTTP calls, emails,
              and SMS messages already dispatched cannot be unsent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <label
              htmlFor="cancel-reason"
              className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
            >
              Reason (optional)
            </label>
            <Textarea
              id="cancel-reason"
              value={cancelReasonInput}
              onChange={(e) => setCancelReasonInput(e.target.value.slice(0, 500))}
              placeholder="e.g. Customer requested withdrawal"
              rows={3}
              maxLength={500}
            />
            <p className="text-[11px] text-muted-foreground">
              Saved on the audit trail. Max 500 characters.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelRun.isPending}>
              Keep running
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleCancel();
              }}
              disabled={cancelRun.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelRun.isPending ? "Cancelling…" : "Cancel run"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
