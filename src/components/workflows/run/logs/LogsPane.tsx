"use client";

import { useMemo, useState } from "react";

import { useWorkflowRunCaptures } from "@/lib/hooks/use-workflow-runs";
import { flattenRunSteps } from "@/lib/workflows-normalize";
import { buildTimeline } from "../timeline-utils";
import { TimelineColumn } from "./TimelineColumn";
import { IoPane } from "./IoPane";
import type { WorkflowRunEvent, WorkflowRunStep, WorkflowStep } from "@/types";

export interface LogsPaneProps {
  runId: string;
  events: WorkflowRunEvent[];
  /**
   * Server-computed per-step projection (tree). Carries the inline
   * `input` / `output` / `captureTruncated` fields surfaced in the IO
   * panes. The gateway returns nested `children` for container kinds; we
   * flatten internally and join rows by `stepPath`.
   */
  runSteps: WorkflowRunStep[];
  /** Workflow definition steps (flat). Used for the disabled-capture
   *  empty state, indexed by `stepIndex`. */
  definitionSteps: WorkflowStep[];
  /** Whether to poll captures (run is `running` or `waiting`). */
  isLive: boolean;
  /** Workflow id for the editor deep-link in the disabled-capture state. */
  workflowId: string;
}

/**
 * n8n-style three-pane "Logs" view: timeline on the left, Input + Output on
 * the right. Joins server `events` with the captures returned by
 * `useWorkflowRunCaptures` to drive both columns.
 */
export function LogsPane({
  runId,
  events,
  runSteps,
  definitionSteps,
  isLive,
  workflowId,
}: LogsPaneProps) {
  const { data: capturesData } = useWorkflowRunCaptures(runId, { isLive });

  // Flatten the projection tree (DFS preorder) so we can join timeline
  // rows to projection entries by `stepPath`. The gateway no longer
  // guarantees unique `stepIndex` values across nested steps.
  const flatRunSteps = useMemo(() => flattenRunSteps(runSteps), [runSteps]);

  // Map each `step_started` event's sequence number to its matching
  // projection's `stepPath`. We walk events in order and claim the next
  // unclaimed flat projection whose `stepKind` matches — projection DFS
  // order equals execution order for any branch actually taken, and
  // skipped/pending entries are never claimed because no `step_started`
  // event fires for them.
  // Map each `step_started` event's sequence number to its index in
  // `flatRunSteps`. We walk events in order and claim the next unclaimed
  // flat projection whose `stepKind` matches — projection DFS order
  // equals execution order for any branch actually taken, and
  // skipped/pending entries are never claimed because no `step_started`
  // event fires for them. We key by flat-array index (not `stepPath`) so
  // top-level entries — for which the gateway returns `stepPath: null` —
  // still resolve.
  const flatIdxBySequence = useMemo(() => {
    const claimed = new Set<number>();
    const out = new Map<number, number>();
    for (const ev of events) {
      if (ev.eventType !== "step_started") continue;
      for (let i = 0; i < flatRunSteps.length; i += 1) {
        if (claimed.has(i)) continue;
        const s = flatRunSteps[i]!;
        if (s.stepKind !== ev.stepKind) continue;
        claimed.add(i);
        out.set(ev.sequence, i);
        break;
      }
    }
    return out;
  }, [events, flatRunSteps]);

  // `definitionSteps` is hoisted DFS by `normalizeWorkflowDefinition`, so
  // its index aligns 1:1 with `flatRunSteps`. Build a sequence → custom
  // name map for the timeline column once per render.
  const customNameBySequence = useMemo(() => {
    const out = new Map<number, string>();
    for (const [seq, idx] of flatIdxBySequence.entries()) {
      const name = definitionSteps[idx]?.name?.trim();
      if (name) out.set(seq, name);
    }
    return out;
  }, [flatIdxBySequence, definitionSteps]);

  const rows = useMemo(
    () => buildTimeline(events, capturesData?.data?.captures ?? []),
    [events, capturesData]
  );

  // Explicit user selection. When `null`, we fall back to the latest row so
  // the panes never read empty as the timeline grows.
  const [pickedSequence, setPickedSequence] = useState<number | null>(null);

  const effectiveSequence =
    pickedSequence !== null && rows.some((r) => r.sequence === pickedSequence)
      ? pickedSequence
      : (rows[rows.length - 1]?.sequence ?? null);

  const selectedRow = rows.find((r) => r.sequence === effectiveSequence) ?? null;
  // Per-step projection entry for the selected timeline row. Look up by
  // the flat-array index (resolved from the event sequence) so nested
  // children resolve to their own input/output rather than collapsing to
  // the parent container's projection.
  const selectedFlatIdx = selectedRow
    ? (flatIdxBySequence.get(selectedRow.sequence) ?? -1)
    : -1;
  const runStep = selectedFlatIdx >= 0 ? flatRunSteps[selectedFlatIdx]! : null;
  // Definition steps are hoisted DFS by `normalizeWorkflowDefinition`, so
  // their flat ordering matches `flatRunSteps`. Index by that position
  // rather than `selectedRow.stepIndex`, which is no longer unique.
  const definitionStep =
    selectedFlatIdx >= 0 ? definitionSteps[selectedFlatIdx] : undefined;

  return (
    <div className="grid h-full min-h-0 grid-cols-[260px_1fr]">
      <aside className="min-h-0 overflow-y-auto border-r border-border/60 bg-background">
        <TimelineColumn
          rows={rows}
          selectedSequence={effectiveSequence}
          onSelect={setPickedSequence}
          customNameBySequence={customNameBySequence}
        />
      </aside>
      <div className="min-h-0 min-w-0">
        <IoPane
          runId={runId}
          row={selectedRow}
          runStep={runStep}
          definitionStep={definitionStep}
          editHref={`/workflows/${workflowId}`}
        />
      </div>
    </div>
  );
}
