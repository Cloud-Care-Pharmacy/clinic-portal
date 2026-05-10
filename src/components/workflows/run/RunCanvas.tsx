"use client";

import { useEffect, useMemo } from "react";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { Locate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkflowGraph } from "@/components/workflows/canvas/WorkflowGraph";
import type { NodeRunStatus } from "@/components/workflows/canvas/lib/graph-builder";
import { stepNodeName } from "@/components/workflows/canvas/lib/step-tree";
import type { WorkflowRunStep, WorkflowStep, WorkflowTrigger } from "@/types";

interface RunCanvasProps {
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  /**
   * Server-computed per-step projection (one entry per definition step).
   * Drives the per-node status pills.
   */
  runSteps: WorkflowRunStep[];
  /**
   * Ticking timestamp from the parent. Drives the live-elapsed pill on the
   * currently-running node so it advances between SSE events.
   */
  now: number;
  /**
   * Selected step index (drives the canvas selection box). The parent owns
   * selection so clicking a node can scroll the matching timeline card.
   */
  selectedStepIndex?: number | null;
  onSelectStepIndex?: (index: number | null) => void;
}

/**
 * Inner body — must live underneath a `ReactFlowProvider` so it can access
 * `useReactFlow()` for the "jump to active" affordance. The outer
 * `RunCanvas` component owns the provider.
 */
function RunCanvasBody({
  triggers,
  steps,
  runSteps,
  now,
  selectedStepIndex,
  onSelectStepIndex,
}: RunCanvasProps) {
  const { fitView } = useReactFlow();

  // Map the projection → per-step canvas status. The projection has 6
  // statuses; the canvas's `NodeRunStatus` enum has 5 (no `skipped`), so
  // `skipped` collapses to `done` for display purposes. `pending` entries
  // are omitted so unstarted nodes paint with their default style.
  const stepRunStatus = useMemo<Record<number, NodeRunStatus>>(() => {
    const out: Record<number, NodeRunStatus> = {};
    for (const s of runSteps) {
      switch (s.status) {
        case "running":
        case "done":
        case "failed":
        case "waiting":
          out[s.stepIndex] = s.status;
          break;
        case "skipped":
          out[s.stepIndex] = "done";
          break;
        case "pending":
          // Leave undefined — the graph treats absence as "not started".
          break;
      }
    }
    return out;
  }, [runSteps]);

  // Per-step metadata for the node pills. `durationMs` for terminal steps,
  // a ticking `liveElapsedMs` for the in-flight one. Sourced entirely from
  // the projection — no event folding required.
  const stepRunMeta = useMemo<
    Record<number, { durationMs?: number; liveElapsedMs?: number }>
  >(() => {
    const out: Record<number, { durationMs?: number; liveElapsedMs?: number }> = {};
    for (const s of runSteps) {
      if (s.status === "running" && s.startedAt) {
        out[s.stepIndex] = {
          liveElapsedMs: Math.max(0, now - new Date(s.startedAt).getTime()),
        };
      } else if (s.durationMs != null) {
        out[s.stepIndex] = { durationMs: s.durationMs };
      }
    }
    return out;
  }, [runSteps, now]);

  // Identify the currently-active step node id (if any) so the action bar
  // can fit-view onto it.
  const activeStepNodeId = useMemo<string | null>(() => {
    const activeIdx = Object.keys(stepRunStatus)
      .map(Number)
      .find((i) => stepRunStatus[i] === "running" || stepRunStatus[i] === "waiting");
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
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="pointer-events-auto absolute right-3 top-3 z-10 h-7 gap-1 px-2 text-[11px] shadow-sm"
        onClick={handleJumpToActive}
        disabled={!hasActiveStep}
        title="Center the canvas on the running step"
      >
        <Locate className="size-3" />
        Jump to active
      </Button>
      <WorkflowGraph
        triggers={triggers}
        steps={steps}
        selectedId={selectedNodeId}
        onSelect={handleSelect}
        // Insertion is inert in read-only mode.
        onRequestInsert={() => {}}
        stepRunStatus={stepRunStatus}
        stepRunMeta={stepRunMeta}
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
