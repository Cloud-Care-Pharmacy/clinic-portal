"use client";

import { useEffect, useMemo } from "react";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { Locate, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { WorkflowGraph } from "@/components/workflows/canvas/WorkflowGraph";
import {
  computeStepRunStatus,
  type NodeRunStatus,
} from "@/components/workflows/canvas/lib/graph-builder";
import { stepNodeName } from "@/components/workflows/canvas/lib/step-tree";
import type {
  WorkflowRun,
  WorkflowRunEvent,
  WorkflowStep,
  WorkflowTrigger,
} from "@/types";

interface RunCanvasProps {
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  run: WorkflowRun;
  events: WorkflowRunEvent[];
  /** True while the SSE stream is open — drives the LIVE pill and progress sweep. */
  isLive: boolean;
  /** Live-elapsed for the whole run, in ms. Updated by the parent's ticker. */
  elapsedMs: number;
  /**
   * Selected step index (drives the canvas selection box). The parent owns
   * selection so clicking a node can scroll the matching timeline card.
   */
  selectedStepIndex?: number | null;
  onSelectStepIndex?: (index: number | null) => void;
}

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)}s`;
  const m = Math.floor(s / 60);
  const rs = Math.round(s - m * 60);
  return `${m}m ${rs}s`;
}

function StatusStrip({
  run,
  isLive,
  elapsedMs,
  completed,
  total,
  onJumpToActive,
  hasActiveStep,
}: {
  run: WorkflowRun;
  isLive: boolean;
  elapsedMs: number;
  completed: number;
  total: number;
  onJumpToActive: () => void;
  hasActiveStep: boolean;
}) {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  return (
    <div className="pointer-events-auto absolute left-3 right-3 top-3 z-10 flex items-center gap-3 rounded-xl border border-border bg-popover/95 px-3 py-2 shadow-sm backdrop-blur">
      <StatusBadge status={run.status} dot className="capitalize" />
      {isLive && (
        <span
          className="inline-flex items-center gap-1 rounded-full border border-status-warning-border bg-status-warning-bg px-1.5 py-px text-[9px] font-semibold uppercase tracking-[0.08em] text-status-warning-fg"
          aria-label="Live stream connected"
          title="Streaming live updates"
        >
          <Radio
            className="size-2.5 motion-reduce:animate-none"
            style={{ animation: "wf-pulse 1.5s infinite" }}
          />
          Live
        </span>
      )}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {completed}
          <span className="text-muted-foreground/60"> / {total || "?"}</span>
        </span>
        <div
          className="relative h-1 flex-1 min-w-12 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={completed}
          aria-label="Run progress"
        >
          <div
            className="relative h-full bg-status-success-fg transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          >
            {hasActiveStep && (
              <span
                aria-hidden
                className="absolute inset-y-0 right-0 w-1/3 motion-reduce:hidden"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, color-mix(in oklab, var(--status-success-fg) 65%, white) 50%, transparent)",
                  animation: "wf-progress-indeterminate 1.4s linear infinite",
                }}
              />
            )}
          </div>
        </div>
      </div>
      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
        {fmtDuration(elapsedMs)}
      </span>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 gap-1 px-2 text-[11px]"
        onClick={onJumpToActive}
        disabled={!hasActiveStep}
        title="Center the canvas on the running step"
      >
        <Locate className="size-3" />
        Jump to active
      </Button>
    </div>
  );
}

/**
 * Inner body — must live underneath a `ReactFlowProvider` so it can access
 * `useReactFlow()` for the "jump to active" affordance. The outer
 * `RunCanvas` component owns the provider.
 */
function RunCanvasBody({
  triggers,
  steps,
  run,
  events,
  isLive,
  elapsedMs,
  selectedStepIndex,
  onSelectStepIndex,
}: RunCanvasProps) {
  const { fitView } = useReactFlow();

  // Map run events → per-step status. `computeStepRunStatus` already normalizes
  // step_started/completed/failed/wait_scheduled events into the canvas's own
  // `NodeRunStatus` enum.
  const stepRunStatus = useMemo(() => {
    return computeStepRunStatus(
      events.map((e) => ({ eventType: e.eventType, stepIndex: e.stepIndex })),
      run.status
    );
  }, [events, run.status]);

  // Identify the currently-active step node id (if any) so the action bar
  // can fit-view onto it.
  const activeStepNodeId = useMemo<string | null>(() => {
    const activeIdx = Object.keys(stepRunStatus)
      .map(Number)
      .find(
        (i) =>
          stepRunStatus[i] === "running" || stepRunStatus[i] === "waiting"
      );
    if (activeIdx == null) return null;
    const step = steps[activeIdx];
    if (!step) return null;
    return stepNodeName(step, activeIdx);
  }, [stepRunStatus, steps]);

  // Auto-pan to the active step the first time we get one, and again whenever
  // the active step changes during a live run. Skip when there's no active
  // step (e.g. terminal runs), to preserve the user's last viewport.
  useEffect(() => {
    if (!activeStepNodeId) return;
    const id = window.setTimeout(() => {
      fitView({
        nodes: [{ id: activeStepNodeId }],
        padding: 0.5,
        maxZoom: 1.1,
        duration: 400,
      });
    }, 80);
    return () => window.clearTimeout(id);
  }, [activeStepNodeId, fitView]);

  const completed = Object.values(stepRunStatus).filter(
    (s: NodeRunStatus) => s === "done" || s === "failed" || s === "waiting"
  ).length;
  const total = steps.filter((s) => !s.parentStepName).length;
  const hasActiveStep = Boolean(activeStepNodeId);

  const handleJumpToActive = () => {
    if (!activeStepNodeId) return;
    fitView({
      nodes: [{ id: activeStepNodeId }],
      padding: 0.5,
      maxZoom: 1.2,
      duration: 400,
    });
  };

  const selectedNodeId =
    selectedStepIndex != null && steps[selectedStepIndex]
      ? stepNodeName(steps[selectedStepIndex], selectedStepIndex)
      : null;

  const handleSelect = (id: string | null) => {
    if (!onSelectStepIndex) return;
    if (!id) {
      onSelectStepIndex(null);
      return;
    }
    const idx = steps.findIndex((s, i) => stepNodeName(s, i) === id);
    onSelectStepIndex(idx >= 0 ? idx : null);
  };

  return (
    <div className="relative h-full w-full">
      <StatusStrip
        run={run}
        isLive={isLive}
        elapsedMs={elapsedMs}
        completed={completed}
        total={total}
        onJumpToActive={handleJumpToActive}
        hasActiveStep={hasActiveStep}
      />
      <WorkflowGraph
        triggers={triggers}
        steps={steps}
        selectedId={selectedNodeId}
        onSelect={handleSelect}
        // Insertion is inert in read-only mode.
        onRequestInsert={() => {}}
        stepRunStatus={stepRunStatus}
        panningMode="grab"
        readOnly
      />
    </div>
  );
}

export function RunCanvas(props: RunCanvasProps) {
  return (
    <ReactFlowProvider>
      <RunCanvasBody {...props} />
    </ReactFlowProvider>
  );
}
