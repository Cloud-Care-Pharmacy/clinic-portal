"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type TaskQueueTab =
  | "all"
  | "open"
  | "in_progress"
  | "mine"
  | "unassigned"
  | "completed";

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
  { id: "unassigned", label: "Unassigned" },
  { id: "completed", label: "Completed" },
];

function isTaskQueueTab(value: unknown): value is TaskQueueTab {
  return TABS.some((tab) => tab.id === value);
}

export function TaskQueueTabs({ activeTab, counts, onTabChange }: TaskQueueTabsProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        if (isTaskQueueTab(value)) onTabChange(value);
      }}
      className="space-y-0"
    >
      <div className="w-full overflow-x-auto pb-2">
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
              <span className="count tabular-nums">{counts[tab.id]}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </Tabs>
  );
}
