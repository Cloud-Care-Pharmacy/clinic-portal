"use client";

import { useMemo, useState } from "react";

import { useWorkflowRunCaptures } from "@/lib/hooks/use-workflow-runs";
import { buildTimeline } from "../timeline-utils";
import { TimelineColumn } from "./TimelineColumn";
import { IoPane } from "./IoPane";
import type { WorkflowRunEvent, WorkflowStep } from "@/types";

export interface LogsPaneProps {
  runId: string;
  events: WorkflowRunEvent[];
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
  definitionSteps,
  isLive,
  workflowId,
}: LogsPaneProps) {
  const { data: capturesData } = useWorkflowRunCaptures(runId, { isLive });

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
  const definitionStep = selectedRow
    ? definitionSteps[selectedRow.stepIndex]
    : undefined;

  return (
    <div className="grid h-full min-h-0 grid-cols-[260px_1fr]">
      <aside className="min-h-0 overflow-y-auto border-r border-border/60 bg-background">
        <TimelineColumn
          rows={rows}
          selectedSequence={effectiveSequence}
          onSelect={setPickedSequence}
        />
      </aside>
      <div className="min-h-0 min-w-0">
        <IoPane
          runId={runId}
          row={selectedRow}
          definitionStep={definitionStep}
          editHref={`/workflows/${workflowId}`}
        />
      </div>
    </div>
  );
}
