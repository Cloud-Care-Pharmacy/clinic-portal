"use client";

import {
  AlertTriangle,
  Check,
  CircleDashed,
  Clock,
  Hourglass,
  RotateCcw,
  TimerOff,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { STEP_KIND_CONFIG } from "../../canvas/lib/node-kind-config";
import type {
  WorkflowRunTimelineRow,
  WorkflowStep,
  WorkflowStepKind,
} from "@/types";

export interface TimelineColumnProps {
  rows: WorkflowRunTimelineRow[];
  selectedSequence: number | null;
  onSelect: (sequence: number) => void;
  /**
   * Workflow definition steps (flat) indexed by `stepIndex`. When the
   * matching step has a custom `name`, it overrides the kind label so the
   * timeline shows the same display label as the canvas.
   */
  definitionSteps?: WorkflowStep[];
}

const STATUS_META: Record<
  WorkflowRunTimelineRow["status"],
  { label: string; tone: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  pending: { label: "Pending", tone: "text-muted-foreground", Icon: CircleDashed },
  running: { label: "Running", tone: "text-status-warning-fg", Icon: CircleDashed },
  success: { label: "Success", tone: "text-status-success-fg", Icon: Check },
  error: { label: "Failed", tone: "text-status-danger-fg", Icon: AlertTriangle },
  waiting: { label: "Waiting", tone: "text-status-warning-fg", Icon: Hourglass },
  retrying: { label: "Retrying", tone: "text-status-warning-fg", Icon: RotateCcw },
  timed_out: { label: "Timed out", tone: "text-status-danger-fg", Icon: TimerOff },
};

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return "";
  if (ms < 1000) return `${Math.max(0, Math.round(ms))}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/** Compact human-readable delay for retry sub-lines, e.g. `2s` / `1m 30s`. */
function formatDelay(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "soon";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
}

function subtitleFor(row: WorkflowRunTimelineRow): string {
  const meta = STATUS_META[row.status];
  if (row.status === "running") return "Running…";
  if (row.status === "waiting") return "Waiting…";
  if (row.status === "retrying" && row.retry) {
    const { delayMs, nextAttempt, maxAttempts } = row.retry;
    return `Retrying in ${formatDelay(delayMs)} (attempt ${nextAttempt} of ${maxAttempts})`;
  }
  if (row.status === "timed_out") {
    return row.awaitingEventType
      ? `Timeout waiting for ${row.awaitingEventType}`
      : "Timed out";
  }
  const dur = formatDuration(row.durationMs);
  return dur ? `${meta.label} in ${dur}` : meta.label;
}

export function TimelineColumn({
  rows,
  selectedSequence,
  onSelect,
  definitionSteps,
}: TimelineColumnProps) {
  if (rows.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Run hasn&apos;t started yet.
      </div>
    );
  }

  return (
    <ol className="flex flex-col">
      {rows.map((row) => {
        const config = STEP_KIND_CONFIG[row.stepKind as WorkflowStepKind];
        const Icon = config?.icon ?? Clock;
        const customName = definitionSteps?.[row.stepIndex]?.name?.trim();
        const label = customName || config?.label || row.stepKind;
        const status = STATUS_META[row.status];
        const isSelected = selectedSequence === row.sequence;
        return (
          <li key={row.sequence}>
            <button
              type="button"
              onClick={() => onSelect(row.sequence)}
              className={cn(
                "flex w-full items-start gap-3 border-l-2 px-3 py-2 text-left transition-colors",
                isSelected
                  ? "border-l-primary bg-accent/60"
                  : "border-l-transparent hover:bg-accent/30"
              )}
            >
              <div
                className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border"
                style={{
                  background: config?.bg,
                  color: config?.fg,
                  borderColor: config?.border,
                }}
              >
                <Icon className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{label}</div>
                <div className={cn("flex items-center gap-1.5 text-xs", status.tone)}>
                  <status.Icon
                    className={cn("size-3", row.status === "running" && "animate-spin")}
                  />
                  <span className="truncate">{subtitleFor(row)}</span>
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
