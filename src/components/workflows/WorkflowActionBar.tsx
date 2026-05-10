"use client";

import { useCallback, useState } from "react";
import {
  Code2,
  Copy,
  Download,
  Files,
  Hand,
  ListTree,
  Maximize2,
  Minus,
  MoreHorizontal,
  MousePointer,
  Pencil,
  Play,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useReactFlow } from "@xyflow/react";
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
  onDownloadJson: () => void;
  onCopyId: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  saveDisabled: boolean;
  saving: boolean;
  duplicating: boolean;
  togglePending: boolean;
  dirty: boolean;
  // Canvas viewport tools — rendered inside the bar when tab === "canvas".
  panningMode: "grab" | "select";
  onTogglePanningMode: () => void;
}

/**
 * Sticky floating bottom bar — combines canvas viewport tools and workflow
 * actions into a single expandable pill. Collapsed state shows only the
 * canvas zoom/hand controls, primary `Test run` button, and a more-actions
 * trigger. Hovering anywhere on the pill reveals the full toolset; the
 * ellipsis opens overflow-only actions.
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
  onDownloadJson,
  onCopyId,
  onRename,
  onDuplicate,
  onDelete,
  saveDisabled,
  saving,
  duplicating,
  togglePending,
  dirty,
  panningMode,
  onTogglePanningMode,
}: WorkflowActionBarProps) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const expanded = hovered || menuOpen;

  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const handleZoomIn = useCallback(() => zoomIn({ duration: 0 }), [zoomIn]);
  const handleZoomOut = useCallback(() => zoomOut({ duration: 0 }), [zoomOut]);
  const handleFit = useCallback(
    () => fitView({ padding: 0.2, duration: 200 }),
    [fitView]
  );

  const showCanvasControls = tab === "canvas";

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center">
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="pointer-events-auto flex h-11 items-center gap-1 overflow-hidden rounded-full border border-border bg-popover/95 p-1.5 shadow-lg backdrop-blur transition-all duration-200 supports-backdrop-filter:bg-popover/80"
      >
        {/* Expanded-only group: tabs + canvas tools + add + save */}
        <div
          className={cn(
            "flex h-8 items-center gap-1 overflow-hidden transition-all duration-200",
            expanded ? "max-w-190 opacity-100" : "pointer-events-none max-w-0 opacity-0"
          )}
        >
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

          {showCanvasControls && (
            <>
              <Separator orientation="vertical" className="mx-1 h-6" />
              <div className="flex items-center gap-0.5">
                <IconButton onClick={handleFit} tooltip="Fit view">
                  <Maximize2 className="size-3.5" />
                </IconButton>
              </div>
            </>
          )}

          <Separator orientation="vertical" className="mx-1 h-6" />

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
        </div>

        {showCanvasControls && (
          <>
            <div className="flex h-8 items-center gap-0.5 rounded-full bg-popover p-0.5">
              <IconButton onClick={handleZoomOut} tooltip="Zoom out">
                <Minus className="size-3.5" />
              </IconButton>
              <IconButton onClick={handleZoomIn} tooltip="Zoom in">
                <Plus className="size-3.5" />
              </IconButton>
              <IconButton
                onClick={onTogglePanningMode}
                tooltip={
                  panningMode === "grab"
                    ? "Switch to select tool"
                    : "Switch to hand tool"
                }
                active={panningMode === "grab"}
              >
                {panningMode === "grab" ? (
                  <Hand className="size-3.5" />
                ) : (
                  <MousePointer className="size-3.5" />
                )}
              </IconButton>
            </div>
            <Separator orientation="vertical" className="mx-0.5 h-6" />
          </>
        )}

        {/* Always-visible: Test run (primary CTA) */}
        <Button
          type="button"
          size="sm"
          onClick={onTestRun}
          className="h-8 gap-1.5 rounded-full px-3 text-xs font-semibold"
        >
          <Play className="size-3.5 fill-current" />
          Test run
        </Button>

        {/* Expanded-only: active toggle */}
        <div
          className={cn(
            "flex h-8 items-center overflow-hidden transition-all duration-200",
            expanded ? "max-w-50 opacity-100" : "pointer-events-none max-w-0 opacity-0"
          )}
        >
          <Separator orientation="vertical" className="mx-1 h-6" />
          <div className="flex items-center gap-2 rounded-full px-2.5 py-1">
            <span
              className={cn(
                "text-xs font-medium",
                isActive ? "text-foreground" : "text-muted-foreground"
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
        </div>

        {/* Always-visible: overflow menu. */}
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger
            type="button"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:border focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label="Workflow actions"
            title="Workflow actions"
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="min-w-56">
            <DropdownMenuItem onClick={onViewJson}>
              <Code2 className="mr-2 size-3.5" />
              View JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDownloadJson}>
              <Download className="mr-2 size-3.5" />
              Download JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCopyId}>
              <Copy className="mr-2 size-3.5" />
              Copy workflow ID
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRename}>
              <Pencil className="mr-2 size-3.5" />
              Rename workflow
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate} disabled={duplicating}>
              <Files className="mr-2 size-3.5" />
              {duplicating ? "Duplicating…" : "Duplicate workflow"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
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
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function IconButton({
  children,
  onClick,
  tooltip,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tooltip: string;
  active?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      title={tooltip}
      aria-label={tooltip}
      onClick={onClick}
      className={cn(
        "size-7 bg-popover p-0 text-muted-foreground hover:bg-popover hover:text-foreground",
        active && "bg-popover text-foreground shadow-sm ring-1 ring-border"
      )}
    >
      {children}
    </Button>
  );
}
