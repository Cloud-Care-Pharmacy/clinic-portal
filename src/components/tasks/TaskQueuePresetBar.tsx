"use client";

import type { ReactNode } from "react";
import { Check, UserRound, UsersRound, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type TaskQueuePreset = "unassigned" | "mine_active" | "completed";

interface TaskQueuePresetBarProps {
  activePreset: TaskQueuePreset;
  counts: Record<TaskQueuePreset, number>;
  onPresetChange: (preset: TaskQueuePreset) => void;
}

const PRESETS: Array<{
  id: TaskQueuePreset;
  label: string;
  tone: "warning" | "primary" | "success";
  icon: LucideIcon;
}> = [
  { id: "unassigned", label: "Unassigned", tone: "warning", icon: UsersRound },
  { id: "mine_active", label: "My tasks", tone: "primary", icon: UserRound },
  { id: "completed", label: "Completed", tone: "success", icon: Check },
];

export function TaskQueuePresetBar({
  activePreset,
  counts,
  onPresetChange,
}: TaskQueuePresetBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((preset) => (
        <PresetButton
          key={preset.id}
          active={activePreset === preset.id}
          tone={preset.tone}
          icon={preset.icon}
          count={counts[preset.id]}
          onClick={() => onPresetChange(preset.id)}
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
  tone: "warning" | "primary" | "success";
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
        "inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition-all duration-100 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        !active && "border-border bg-popover text-muted-foreground hover:bg-muted",
        active &&
          tone === "warning" &&
          "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
        active &&
          tone === "success" &&
          "border-status-success-border bg-status-success-bg text-status-success-fg",
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
