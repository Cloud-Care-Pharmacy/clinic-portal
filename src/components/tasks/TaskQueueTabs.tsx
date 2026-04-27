"use client";

import { cn } from "@/lib/utils";

export type TaskQueueTab = "all" | "open" | "in_progress" | "mine" | "completed";

interface TaskQueueTabsProps {
  activeTab: TaskQueueTab;
  counts: Record<TaskQueueTab, number>;
  onTabChange: (tab: TaskQueueTab) => void;
}

const TABS: Array<{ id: TaskQueueTab; label: string }> = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In progress" },
  { id: "mine", label: "My tasks" },
  { id: "completed", label: "Completed" },
];

export function TaskQueueTabs({ activeTab, counts, onTabChange }: TaskQueueTabsProps) {
  return (
    <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl bg-muted p-1.5">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-medium text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              isActive && "bg-background text-foreground shadow-xs"
            )}
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted-foreground/15 px-1.5 text-[11px] font-semibold tabular-nums text-muted-foreground",
                isActive && "bg-muted text-foreground"
              )}
            >
              {counts[tab.id]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
