"use client";

import {
  Code2,
  ListTree,
  Play,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type WorkflowActionTab = "canvas" | "run";

interface WorkflowActionBarProps {
  tab: WorkflowActionTab;
  onTabChange: (tab: WorkflowActionTab) => void;
  isActive: boolean;
  onToggleActive: (checked: boolean) => void;
  onAdd: () => void;
  onSave: () => void;
  onTestRun: () => void;
  onViewJson: () => void;
  onDelete: () => void;
  saveDisabled: boolean;
  saving: boolean;
  togglePending: boolean;
  dirty: boolean;
}

/**
 * Sticky floating action bar centered at the bottom of the workflow page.
 * Contains tab switcher, add/save/test-run actions, active toggle, and a
 * more-menu. Inspired by ClickUp's automation editor footer.
 */
export function WorkflowActionBar({
  tab,
  onTabChange,
  isActive,
  onToggleActive,
  onAdd,
  onSave,
  onTestRun,
  onViewJson,
  onDelete,
  saveDisabled,
  saving,
  togglePending,
  dirty,
}: WorkflowActionBarProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-popover/95 p-1.5 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-popover/80">
        {/* Tab switch */}
        <div className="flex items-center gap-0.5 rounded-full bg-muted p-0.5">
          <TabButton
            active={tab === "canvas"}
            onClick={() => onTabChange("canvas")}
            icon={<ListTree className="size-3.5" />}
            label="Canvas"
          />
          <TabButton
            active={tab === "run"}
            onClick={() => onTabChange("run")}
            icon={<Play className="size-3.5" />}
            label="Live run"
          />
        </div>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Add */}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onAdd}
          className="h-8 gap-1.5 rounded-full px-3 text-xs font-semibold"
        >
          <Plus className="size-3.5" />
          Add step
        </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Save draft */}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onSave}
          disabled={saveDisabled}
          className="h-8 gap-1.5 rounded-full px-3 text-xs"
          aria-label="Save draft"
          title="Save draft"
        >
          <Save className="size-3.5" />
          {saving ? "Saving…" : dirty ? "Save draft" : "Saved"}
        </Button>

        {/* Test run (primary) */}
        <Button
          type="button"
          size="sm"
          onClick={onTestRun}
          className="h-8 gap-1.5 rounded-full px-3 text-xs font-semibold"
        >
          <Play className="size-3.5 fill-current" />
          Test run
        </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Active toggle */}
        <div className="flex items-center gap-2 rounded-full px-2.5 py-1">
          <span
            className={cn(
              "text-xs font-medium",
              isActive ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {isActive ? "Active" : "Inactive"}
          </span>
          <Switch
            checked={isActive}
            onCheckedChange={onToggleActive}
            disabled={togglePending}
            aria-label="Toggle workflow active"
          />
        </div>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* More menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <Code2 className="size-3.5" />
            <span className="sr-only">More actions</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top">
            <DropdownMenuItem onClick={onViewJson}>
              <Code2 className="mr-2 size-3.5" />
              View JSON
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="mr-2 size-3.5" />
              Delete workflow
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-popover text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
