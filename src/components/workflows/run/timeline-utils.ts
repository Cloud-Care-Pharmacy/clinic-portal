import type {
  WorkflowRunEvent,
  WorkflowRunTimelineRow,
  WorkflowStepCapture,
} from "@/types";

/**
 * Join a run's `events` and `captures` into a flat timeline. One row per
 * `step_started` event; the matching terminator (`step_completed`,
 * `step_failed`, or `wait_scheduled`) drives status / duration / error.
 *
 * Capture rows are keyed by the `step_started` sequence — when present, the
 * row carries the redacted input/output snapshot for the Input/Output panes.
 *
 * Pure; safe to call on every render.
 */
export function buildTimeline(
  events: readonly WorkflowRunEvent[],
  captures: readonly WorkflowStepCapture[]
): WorkflowRunTimelineRow[] {
  const byCaptureSeq = new Map<number, WorkflowStepCapture>(
    captures.map((c) => [c.sequence, c])
  );
  const rows: WorkflowRunTimelineRow[] = [];

  for (let i = 0; i < events.length; i += 1) {
    const e = events[i]!;
    if (e.eventType !== "step_started") continue;

    const term = events
      .slice(i + 1)
      .find(
        (x) =>
          x.stepIndex === e.stepIndex &&
          (x.eventType === "step_completed" ||
            x.eventType === "step_failed" ||
            x.eventType === "wait_scheduled")
      );

    const status: WorkflowRunTimelineRow["status"] = !term
      ? "running"
      : term.eventType === "step_failed"
        ? "error"
        : term.eventType === "wait_scheduled"
          ? "waiting"
          : "success";

    rows.push({
      sequence: e.sequence,
      stepIndex: e.stepIndex ?? -1,
      stepKind: e.stepKind ?? "unknown",
      status,
      startedAt: e.createdAt,
      completedAt: term?.createdAt ?? null,
      durationMs: term?.durationMs ?? null,
      errorMessage:
        term?.eventType === "step_failed"
          ? String((term.detail as { error?: unknown } | null)?.error ?? "")
          : null,
      capture: byCaptureSeq.get(e.sequence) ?? null,
    });
  }

  return rows;
}
