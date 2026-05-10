"use client";

import { useCallback, useState } from "react";
import {
  Code2,
  Hand,
  ListTree,
  Map as MapIcon,
  Maximize2,
  Minus,
  MoreHorizontal,
  MousePointer,
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
  onDelete: () => void;
  saveDisabled: boolean;
  saving: boolean;
  togglePending: boolean;
  dirty: boolean;
  // Canvas viewport tools — rendered inside the bar when tab === "canvas".
  panningMode: "grab" | "select";
  onTogglePanningMode: () => void;
  showMinimap: boolean;
  onToggleMinimap: () => void;
}

/**
 * Sticky floating bottom bar — combines canvas viewport tools and workflow
 * actions into a single expandable pill. Collapsed state shows only the
 * primary `Test run` button and an expand toggle. Hovering anywhere on the
 * pill or clicking the ellipsis reveals the full toolset.
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
  panningMode,
  onTogglePanningMode,
  showMinimap,
  onToggleMinimap,
}: WorkflowActionBarProps) {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const expanded = hovered || pinned || menuOpen;

  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const handleZoomIn = useCallback(() => zoomIn({ duration: 0 }), [zoomIn]);
  const handleZoomOut = useCallback(() => zoomOut({ duration: 0 }), [zoomOut]);
  const handleFit = useCallback(
    () => fitView({ padding: 0.2, duration: 200 }),
    [fitView],
  );

  const showCanvasControls = tab === "canvas";

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center">
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-popover/95 p-1.5 shadow-lg backdrop-blur transition-all duration-200 supports-backdrop-filter:bg-popover/80"
      >
        {/* Expanded-only group: tabs + canvas tools + add + save */}
        <div
          className={cn(
            "flex items-center gap-1 overflow-hidden transition-all duration-200",
            expanded
              ? "max-w-190 opacity-100"
              : "pointer-events-none max-w-0 opacity-0",
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
                <IconButton onClick={handleZoomOut} tooltip="Zoom out">
                  <Minus className="size-3.5" />
                </IconButton>
                <IconButton onClick={handleZoomIn} tooltip="Zoom in">
                  <Plus className="size-3.5" />
                </IconButton>
                <IconButton onClick={handleFit} tooltip="Fit view">
                  <Maximize2 className="size-3.5" />
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
                <IconButton
                  onClick={onToggleMinimap}
                  tooltip={showMinimap ? "Hide minimap" : "Show minimap"}
                  active={showMinimap}
                >
                  <MapIcon className="size-3.5" />
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
            "flex items-center overflow-hidden transition-all duration-200",
            expanded
              ? "max-w-50 opacity-100"
              : "pointer-events-none max-w-0 opacity-0",
          )}
        >
          <Separator orientation="vertical" className="mx-1 h-6" />
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
        </div>

        {/* Always-visible: expand toggle / more menu.
            Click toggles expanded; menu opens via dropdown context. */}
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger
            onClick={(e) => {
              // Plain click toggles the bar instead of opening the menu.
              e.preventDefault();
              setPinned((p) => !p);
            }}
            onContextMenu={(e) => {
              // Right-click opens the menu.
              e.preventDefault();
              setMenuOpen(true);
            }}
            onDoubleClick={(e) => {
              e.preventDefault();
              setMenuOpen(true);
            }}
            className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label={expanded ? "Collapse toolbar" : "Expand toolbar"}
            title={
              expanded
                ? "Collapse (double-click for menu)"
                : "Expand (double-click for menu)"
            }
          >
            <MoreHorizontal className="size-4" />
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
        "size-7 p-0 text-muted-foreground hover:text-foreground",
        active && "bg-muted text-foreground",
      )}
    >
      {children}
    </Button>
  );
}
