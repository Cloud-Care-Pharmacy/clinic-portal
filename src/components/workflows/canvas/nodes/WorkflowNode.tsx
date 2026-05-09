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
import type { WorkflowNodeData, NodeRunStatus } from "../lib/workflow-graph";
import { NODE_W, NODE_H } from "../lib/workflow-graph";

interface RunBadgeProps {
  status: NodeRunStatus;
}

function RunBadge({ status }: RunBadgeProps) {
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
        animation: variant.pulse
          ? "wf-pulse 1.5s infinite"
          : undefined,
      }}
      className="grid size-[18px] place-items-center rounded-full motion-reduce:animate-none"
    >
      <Icon className="size-2.5" />
    </span>
  );
}

function configFor(data: WorkflowNodeData): NodeKindConfig {
  return data.kind === "trigger"
    ? TRIGGER_KIND_CONFIG[data.triggerKind]
    : STEP_KIND_CONFIG[data.stepKind];
}

function WorkflowNodeImpl({ data, selected }: NodeProps) {
  const node = data as WorkflowNodeData;
  const cfg = configFor(node);
  const Icon = cfg.icon;
  const runStatus = node.kind === "step" ? node.runStatus : undefined;

  return (
    <div
      style={{
        width: NODE_W,
        minHeight: NODE_H,
        background: "var(--popover)",
        border: selected
          ? `2px solid ${cfg.accent}`
          : "1px solid var(--border)",
        borderRadius: 12,
        padding: "10px 12px",
        boxShadow: selected
          ? `0 0 0 4px ${cfg.bg}, 0 4px 12px rgba(40,38,27,0.06)`
          : "0 1px 2px rgba(40,38,27,0.04)",
        transition:
          "box-shadow 120ms ease, border-color 120ms ease",
      }}
      className="cursor-pointer text-popover-foreground"
    >
      <div className="flex items-center gap-2">
        <div
          style={{
            background: cfg.bg,
            color: cfg.fg,
            border: `1px solid ${cfg.border}`,
          }}
          className="grid size-[26px] place-items-center rounded-lg shrink-0"
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
            {node.label}
          </div>
        </div>
        {runStatus && <RunBadge status={runStatus} />}
      </div>
      <div
        className={cn(
          "mt-1.5 truncate pl-[34px] font-mono text-[11px] text-muted-foreground"
        )}
      >
        {node.sub}
      </div>

      {/* Handles — invisible, positioned at sides for edges */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: "transparent",
          border: "none",
          width: 1,
          height: 1,
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: "transparent",
          border: "none",
          width: 1,
          height: 1,
        }}
      />
    </div>
  );
}

export const WorkflowNode = memo(WorkflowNodeImpl);
