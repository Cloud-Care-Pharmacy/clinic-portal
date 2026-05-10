"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Check, CircleDashed, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TRIGGER_KIND_CONFIG,
  STEP_KIND_CONFIG,
  type NodeKindConfig,
} from "../lib/node-kind-config";
import { HANDLE_STYLING, NODE_H, NODE_W } from "../lib/canvas-consts";
import type { NodeRunStatus, WorkflowNodeData } from "../lib/graph-builder";

function RunBadge({ status }: { status: NodeRunStatus }) {
  const variant = (() => {
    switch (status) {
      case "done":
        return {
          bg: "var(--status-success-bg)",
          fg: "var(--status-success-fg)",
          Icon: Check,
          pulse: false,
        };
      case "failed":
        return {
          bg: "var(--status-danger-bg)",
          fg: "var(--status-danger-fg)",
          Icon: AlertTriangle,
          pulse: false,
        };
      case "running":
        return {
          bg: "var(--status-warning-bg)",
          fg: "var(--status-warning-fg)",
          Icon: CircleDashed,
          pulse: true,
        };
      case "waiting":
        return {
          bg: "var(--status-warning-bg)",
          fg: "#854d0e",
          Icon: Clock,
          pulse: false,
        };
      case "pending":
      default:
        return {
          bg: "var(--muted)",
          fg: "var(--muted-foreground)",
          Icon: CircleDashed,
          pulse: false,
        };
    }
  })();
  const { Icon } = variant;
  return (
    <span
      title={status}
      style={{
        background: variant.bg,
        color: variant.fg,
        animation: variant.pulse ? "wf-pulse 1.5s infinite" : undefined,
      }}
      className="grid size-4.5 place-items-center rounded-full motion-reduce:animate-none"
    >
      <Icon className="size-2.5" />
    </span>
  );
}

function configFor(data: WorkflowNodeData): NodeKindConfig | null {
  if (data.kind === "trigger") return TRIGGER_KIND_CONFIG[data.triggerKind];
  if (data.kind === "step") return STEP_KIND_CONFIG[data.stepKind];
  return null;
}

function WorkflowNodeImpl({ data, selected }: NodeProps) {
  const node = data as WorkflowNodeData;
  const cfg = configFor(node);
  if (!cfg) return null;
  if (node.kind !== "trigger" && node.kind !== "step") return null;
  const Icon = cfg.icon;
  const runStatus = node.kind === "step" ? node.runStatus : undefined;
  const displayIndex = node.kind === "step" ? node.displayIndex : null;
  // Hover-revealed pill on the right side of the card. For steps we show a
  // human-readable "Step N" (1-based) instead of the internal `step_<idx>`
  // identifier; for triggers we surface "Trigger" so the node still has a
  // discoverable label on hover.
  const hoverLabel =
    node.kind === "step"
      ? `Step ${node.displayIndex}`
      : node.kind === "trigger"
        ? "Trigger"
        : null;

  // Per-status outer chrome — used for the run canvas to convey liveness.
  // The badge in the corner already shows the icon, but the card itself
  // needs to read "active" / "done" / "failed" at a glance.
  const isRunning = runStatus === "running";
  const isDone = runStatus === "done";
  const isFailed = runStatus === "failed";
  const isWaiting = runStatus === "waiting";
  const statusBorder = isRunning
    ? "var(--primary)"
    : isFailed
      ? "var(--status-danger-fg)"
      : isDone
        ? "var(--status-success-fg)"
        : isWaiting
          ? "var(--status-warning-fg)"
          : null;
  const ringColor = isRunning
    ? "color-mix(in oklab, var(--primary) 45%, transparent)"
    : isFailed
      ? "color-mix(in oklab, var(--status-danger-fg) 35%, transparent)"
      : null;

  const border = statusBorder
    ? `2px solid ${statusBorder}`
    : selected
      ? `2px solid ${cfg.accent}`
      : "1px solid var(--border)";
  const boxShadow = selected
    ? `0 0 0 4px ${cfg.bg}, 0 4px 12px rgba(40,38,27,0.06)`
    : isFailed
      ? `0 0 0 3px color-mix(in oklab, var(--status-danger-fg) 25%, transparent)`
      : isDone
        ? `0 0 0 2px color-mix(in oklab, var(--status-success-fg) 22%, transparent)`
        : "0 1px 2px rgba(40,38,27,0.04)";

  return (
    <div
      style={
        {
          width: NODE_W,
          minHeight: NODE_H,
          background: "var(--popover)",
          border,
          borderRadius: 12,
          padding: "10px 12px",
          boxShadow,
          transition: "box-shadow 120ms ease, border-color 120ms ease",
          // Soft pulsing ring around active step. CSS reads `--wf-ring-color`
          // so the keyframe stays generic (defined in `globals.css`).
          ...(isRunning && ringColor
            ? {
                animation: "wf-ring 1.6s ease-in-out infinite",
                ["--wf-ring-color" as string]: ringColor,
              }
            : null),
        } as React.CSSProperties
      }
      className="group relative cursor-pointer text-popover-foreground motion-reduce:animate-none"
    >
      <div className="flex items-center gap-2">
        <div
          style={{
            background: cfg.bg,
            color: cfg.fg,
            border: `1px solid ${cfg.border}`,
          }}
          className="grid size-6.5 place-items-center rounded-lg shrink-0"
        >
          <Icon className="size-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div
            style={{ color: cfg.accent }}
            className="text-[9px] font-semibold uppercase tracking-[0.08em]"
          >
            {cfg.shortLabel}
          </div>
          <div className="mt-px truncate text-[13px] font-semibold leading-[1.2]">
            {displayIndex !== null ? `${displayIndex}. ` : ""}
            {node.label}
          </div>
        </div>
        {runStatus && <RunBadge status={runStatus} />}
      </div>
      <div
        className={cn(
          "mt-1.5 truncate pl-8.5 font-mono text-[11px] text-muted-foreground",
        )}
      >
        {node.sub}
      </div>

      {hoverLabel && (
        <div className="pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-0.5 font-mono text-[10px] text-muted-foreground opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100">
          {hoverLabel}
        </div>
      )}

      <Handle type="target" position={Position.Top} style={HANDLE_STYLING} />
      <Handle type="source" position={Position.Bottom} style={HANDLE_STYLING} />
    </div>
  );
}

export const WorkflowNode = memo(WorkflowNodeImpl);
