"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useWorkflowRuns } from "@/lib/hooks/use-workflow-runs";
import { countOutdatedRuns } from "@/lib/workflow-versions";

interface OutdatedRunsBannerProps {
  workflowId: string;
  /** Current/latest definition version. */
  definitionVersion: number;
}

/**
 * Banner shown above the workflow detail canvas when in-flight runs are
 * still executing on a previous definition version. Renders nothing when:
 *   - the workflow has never been versioned, or
 *   - no active runs are stale.
 *
 * The "View runs" CTA deep-links to the runs tab pre-filtered to outdated
 * runs (`?outdated=1`).
 *
 * NOTE: A "Cancel all v1 runs" affordance is intentionally omitted — the
 * backend gateway does not yet expose a per-run cancel endpoint
 * (`POST /workflows/runs/{runId}/cancel`). When that ships, add a button
 * here that fans out to it client-side per the front-end spec.
 */
export function OutdatedRunsBanner({
  workflowId,
  definitionVersion,
}: OutdatedRunsBannerProps) {
  const enabled = definitionVersion > 1;
  const { data } = useWorkflowRuns(enabled ? workflowId : "", { limit: 50 });
  if (!enabled) return null;

  const runs = data?.data ?? [];
  const count = countOutdatedRuns(runs, { version: definitionVersion });
  if (count === 0) return null;

  // All outdated runs share the same older version when only one prior
  // version is still in flight; otherwise show the lowest version (oldest
  // surviving run) so the copy stays accurate.
  const outdatedVersions = Array.from(
    new Set(
      runs.flatMap((r) =>
        (r.status === "running" || r.status === "waiting") &&
        r.definitionVersion < definitionVersion
          ? [r.definitionVersion]
          : []
      )
    )
  ).sort((a, b) => a - b);
  const versionLabel =
    outdatedVersions.length === 1
      ? `v${outdatedVersions[0]}`
      : `older versions (v${outdatedVersions[0]}–v${outdatedVersions[outdatedVersions.length - 1]})`;

  const noun = count === 1 ? "run is" : "runs are";

  return (
    <div className="flex items-start gap-3 border-b border-status-warning-border bg-status-warning-bg px-6 py-3 text-sm text-status-warning-fg">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <strong>
          {count} {noun} still executing on {versionLabel}.
        </strong>{" "}
        <span className="opacity-80">
          Current version is v{definitionVersion}. Existing runs will keep using their
          pinned version until they finish.
        </span>
      </div>
      <Link
        href={`/workflows/${workflowId}/runs?outdated=1`}
        className="inline-flex h-8 shrink-0 items-center rounded-sm border border-status-warning-border/60 bg-popover px-3 text-xs font-medium text-status-warning-fg transition-colors hover:bg-status-warning-bg/40"
      >
        View runs
      </Link>
    </div>
  );
}
