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
  const stepName = node.kind === "step" ? node.stepName : null;

  return (
    <div
      style={{
        width: NODE_W,
        minHeight: NODE_H,
        background: "var(--popover)",
        border: selected ? `2px solid ${cfg.accent}` : "1px solid var(--border)",
        borderRadius: 12,
        padding: "10px 12px",
        boxShadow: selected
          ? `0 0 0 4px ${cfg.bg}, 0 4px 12px rgba(40,38,27,0.06)`
          : "0 1px 2px rgba(40,38,27,0.04)",
        transition: "box-shadow 120ms ease, border-color 120ms ease",
      }}
      className="group relative cursor-pointer text-popover-foreground"
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

      {stepName && (
        <div className="pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-0.5 font-mono text-[10px] text-muted-foreground opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100">
          {stepName}
        </div>
      )}

      <Handle type="target" position={Position.Top} style={HANDLE_STYLING} />
      <Handle type="source" position={Position.Bottom} style={HANDLE_STYLING} />
    </div>
  );
}

export const WorkflowNode = memo(WorkflowNodeImpl);
