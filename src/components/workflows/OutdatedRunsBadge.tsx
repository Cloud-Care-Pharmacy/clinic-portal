"use client";

import { AlertTriangle } from "lucide-react";
import { useWorkflowRuns } from "@/lib/hooks/use-workflow-runs";
import { countOutdatedRuns } from "@/lib/workflow-versions";
import { cn } from "@/lib/utils";

interface OutdatedRunsBadgeProps {
  workflowId: string;
  /** The current/latest definition version. */
  definitionVersion: number;
  className?: string;
  /** Render variant — `inline` for table cells, `pill` for banners. */
  variant?: "inline" | "pill";
}

/**
 * Small badge that surfaces in-flight runs still executing on an older
 * definition version. Renders nothing when:
 *   - the workflow has never been versioned (`version === 1`), or
 *   - there are no active runs on stale versions.
 *
 * Used in the workflows list (one per row). Each row mounts its own query,
 * but TanStack Query's cache de-dupes across pages so a navigation into the
 * detail page reuses the same fetch.
 */
export function OutdatedRunsBadge({
  workflowId,
  definitionVersion,
  className,
  variant = "inline",
}: OutdatedRunsBadgeProps) {
  // No edits have happened yet → no run can possibly be outdated. Skip the
  // network round-trip entirely so the list stays cheap on first render.
  const enabled = definitionVersion > 1;
  const { data } = useWorkflowRuns(
    enabled ? workflowId : "",
    { limit: 50 }
  );
  if (!enabled) return null;

  const count = countOutdatedRuns(data?.data ?? [], { version: definitionVersion });
  if (count === 0) return null;

  const label = `${count} run${count === 1 ? "" : "s"} on older versions`;
  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1 border border-status-warning-border bg-status-warning-bg text-status-warning-fg",
        variant === "inline"
          ? "rounded-full px-2 py-0.5 text-[11px] font-medium"
          : "rounded-md px-2.5 py-1 text-xs font-medium",
        className
      )}
    >
      <AlertTriangle className="size-3" />
      {count} on v&lt;{definitionVersion}
    </span>
  );
}
