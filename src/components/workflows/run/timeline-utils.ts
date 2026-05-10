import type {
  WorkflowRunEvent,
  WorkflowRunTimelineRow,
  WorkflowStepCapture,
} from "@/types";

/**
 * Join a run's `events` and `captures` into a flat timeline. One row per
 * `step_started` event; the matching terminator drives status / duration /
 * error. Recognised terminators:
 *
 *  - `step_completed`         → `success`
 *  - `step_failed`            → `error` (terminal failure)
 *  - `step_retry_scheduled`   → `retrying` (transient — supersedes a
 *                               preceding `step_failed` for the same step)
 *  - `wait_scheduled`         → `waiting`
 *  - `wait_for_event_timed_out` → `timed_out`
 *
 * Capture rows are keyed by the `step_started` sequence — when present, the
 * row carries the redacted input/output snapshot for the Input/Output panes.
 *
 * The `WorkflowRunEventType` union is treated as **open**: any unknown
 * future terminator falls through and the row stays `running` rather than
 * crashing. Pure; safe to call on every render.
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

    // Find the first event after `step_started` that targets the same
    // `stepIndex` and is one of the recognised terminators. A
    // `step_failed` followed by a `step_retry_scheduled` for the same step
    // is treated as transient — the retry event becomes the terminator and
    // the failure is folded into the `retrying` row.
    const term = events.slice(i + 1).find(
      (x) =>
        x.stepIndex === e.stepIndex &&
        (x.eventType === "step_completed" ||
          x.eventType === "step_failed" ||
          x.eventType === "step_retry_scheduled" ||
          x.eventType === "wait_scheduled" ||
          x.eventType === "wait_for_event_timed_out")
    );

    let status: WorkflowRunTimelineRow["status"] = "running";
    let errorMessage: string | null = null;
    let retry: WorkflowRunTimelineRow["retry"] | undefined;
    let awaitingEventType: string | null | undefined;

    if (term) {
      const detail = (term.detail ?? {}) as Record<string, unknown>;
      switch (term.eventType) {
        case "step_completed":
          status = "success";
          break;
        case "step_failed":
          status = "error";
          errorMessage = String(detail.error ?? "");
          break;
        case "step_retry_scheduled":
          status = "retrying";
          // Surface the failure that triggered this retry so users still
          // see why the step is being retried. The preceding `step_failed`
          // is intentionally suppressed as a final state.
          errorMessage = String(detail.error ?? "");
          retry = {
            attempt: Number(detail.attempt ?? 0),
            nextAttempt: Number(detail.nextAttempt ?? 0),
            maxAttempts: Number(detail.maxAttempts ?? 0),
            delayMs: Number(detail.delayMs ?? 0),
            nextStepAt:
              typeof detail.nextStepAt === "string" ? detail.nextStepAt : null,
          };
          break;
        case "wait_scheduled":
          status = "waiting";
          break;
        case "wait_for_event_timed_out":
          status = "timed_out";
          awaitingEventType =
            typeof detail.eventType === "string" ? detail.eventType : null;
          break;
      }
    }

    rows.push({
      sequence: e.sequence,
      stepIndex: e.stepIndex ?? -1,
      stepKind: e.stepKind ?? "unknown",
      status,
      startedAt: e.createdAt,
      completedAt: term?.createdAt ?? null,
      durationMs: term?.durationMs ?? null,
      errorMessage,
      capture: byCaptureSeq.get(e.sequence) ?? null,
      ...(retry ? { retry } : {}),
      ...(awaitingEventType !== undefined ? { awaitingEventType } : {}),
    });
  }

  return rows;
}
