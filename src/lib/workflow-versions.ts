import type { WorkflowRun, WorkflowRunStatus } from "@/types";

const ACTIVE_STATUSES: ReadonlySet<WorkflowRunStatus> = new Set([
  "running",
  "waiting",
]);

/**
 * A run is "outdated" when it is still active (`running` / `waiting`) AND was
 * started against an earlier definition version than the current/latest one.
 *
 * The backend pins each run to the version it started on (snapshotted into
 * `WorkflowRun.definitionVersion`). When a user edits + saves a new version
 * those in-flight runs keep executing the old definition; this selector is
 * the canonical way for the UI to detect them so badges / banners / filters
 * never drift between screens.
 */
export function isRunOutdated(
  run: Pick<WorkflowRun, "definitionVersion" | "status">,
  definition: { version: number }
): boolean {
  return (
    ACTIVE_STATUSES.has(run.status) &&
    run.definitionVersion < definition.version
  );
}

/** Count outdated active runs against the supplied definition version. */
export function countOutdatedRuns(
  runs: ReadonlyArray<Pick<WorkflowRun, "definitionVersion" | "status">>,
  definition: { version: number }
): number {
  let n = 0;
  for (const r of runs) if (isRunOutdated(r, definition)) n += 1;
  return n;
}
