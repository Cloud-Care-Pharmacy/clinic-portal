"use client";

import type { ReactNode } from "react";
import {
  Check,
  Inbox,
  UserRound,
  UsersRound,
  AlertTriangle,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskQueuePresetDef, TaskQueuePresetTone } from "@/types";

/**
 * Legacy union retained for backward compatibility with hard-coded preset ids
 * still referenced by `TasksClient` filter logic. The backend may return
 * additional preset ids beyond these.
 */
export type TaskQueuePreset = "unassigned" | "mine_active" | "completed" | string;

interface TaskQueuePresetBarProps {
  presets: TaskQueuePresetDef[];
  activePreset: string;
  counts: Record<string, number>;
  onPresetChange: (preset: TaskQueuePresetDef) => void;
}

/**
 * Hardcoded fallback used when the backend `/api/tasks/presets` endpoint is not
 * yet available. Mirrors the original three presets shipped with the section.
 */
export const FALLBACK_TASK_PRESETS: TaskQueuePresetDef[] = [
  {
    id: "unassigned",
    label: "Unassigned",
    tone: "warning",
    icon: "users-round",
    filter: { status: ["open", "in_progress"], assignedUserId: null },
  },
  {
    id: "mine_active",
    label: "My tasks",
    tone: "primary",
    icon: "user-round",
    filter: { status: ["open", "in_progress"], assignedUserId: "<self>" },
  },
  {
    id: "completed",
    label: "Completed",
    tone: "success",
    icon: "check",
    filter: { status: ["completed", "cancelled"], assignedUserId: "<self>" },
  },
];

const ICONS: Record<string, LucideIcon> = {
  check: Check,
  inbox: Inbox,
  user: UserRound,
  "user-round": UserRound,
  users: UsersRound,
  "users-round": UsersRound,
  "alert-triangle": AlertTriangle,
  clock: Clock,
};

function iconFor(name: string): LucideIcon {
  return ICONS[name] ?? Inbox;
}

export function TaskQueuePresetBar({
  presets,
  activePreset,
  counts,
  onPresetChange,
}: TaskQueuePresetBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((preset) => (
        <PresetButton
          key={preset.id}
          active={activePreset === preset.id}
          tone={preset.tone}
          icon={iconFor(preset.icon)}
          count={counts[preset.id] ?? 0}
          onClick={() => onPresetChange(preset)}
        >
          {preset.label}
        </PresetButton>
      ))}
    </div>
  );
}

function PresetButton({
  active,
  tone,
  icon: Icon,
  count,
  onClick,
  children,
}: {
  active: boolean;
  tone: TaskQueuePresetTone;
  icon: LucideIcon;
  count: number;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition-all duration-100 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        !active && "border-border bg-popover text-muted-foreground hover:bg-muted",
        active &&
          tone === "warning" &&
          "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
        active &&
          tone === "success" &&
          "border-status-success-border bg-status-success-bg text-status-success-fg",
        active &&
          tone === "info" &&
          "border-status-info-border bg-status-info-bg text-status-info-fg",
        active &&
          tone === "danger" &&
          "border-status-danger-border bg-status-danger-bg text-status-danger-fg",
        active &&
          tone === "neutral" &&
          "border-status-neutral-border bg-status-neutral-bg text-status-neutral-fg",
        active &&
          tone === "primary" &&
          "border-primary bg-primary text-primary-foreground"
      )}
    >
      <Icon className="size-3.5" />
      <span>{children}</span>
      <span
        className={cn(
          "rounded-full px-1.5 font-mono text-xs font-semibold tabular-nums",
          !active && "bg-muted text-muted-foreground",
          active && tone === "warning" && "bg-status-warning-fg text-status-warning-bg",
          active && tone === "success" && "bg-status-success-fg text-status-success-bg",
          active && tone === "info" && "bg-status-info-fg text-status-info-bg",
          active && tone === "danger" && "bg-status-danger-fg text-status-danger-bg",
          active && tone === "neutral" && "bg-status-neutral-fg text-status-neutral-bg",
          active &&
            tone === "primary" &&
            "bg-primary-foreground/20 text-primary-foreground"
        )}
      >
        {count}
      </span>
    </button>
  );
}
