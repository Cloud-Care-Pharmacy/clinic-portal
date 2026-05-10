"use client";

import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import {
  Hand,
  Map as MapIcon,
  Maximize2,
  Minus,
  MousePointer,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface CanvasControlsProps {
  panningMode: "grab" | "select";
  onTogglePanningMode: () => void;
  showMinimap: boolean;
  onToggleMinimap: () => void;
}

/**
 * Floating bottom-left toolbar — zoom in/out, fit-to-view, panning-mode
 * toggle, minimap toggle.
 */
export function CanvasControls({
  panningMode,
  onTogglePanningMode,
  showMinimap,
  onToggleMinimap,
}: CanvasControlsProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const handleZoomIn = useCallback(() => zoomIn({ duration: 0 }), [zoomIn]);
  const handleZoomOut = useCallback(() => zoomOut({ duration: 0 }), [zoomOut]);
  const handleFit = useCallback(
    () => fitView({ padding: 0.2, duration: 200 }),
    [fitView],
  );

  return (
    <div className="absolute bottom-3 left-3 z-10 flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-sm">
      <ToolbarButton onClick={handleZoomOut} tooltip="Zoom out">
        <Minus className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={handleZoomIn} tooltip="Zoom in">
        <Plus className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton onClick={handleFit} tooltip="Fit view">
        <Maximize2 className="size-3.5" />
      </ToolbarButton>
      <Separator orientation="vertical" className="mx-0.5 h-5" />
      <ToolbarButton
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
      </ToolbarButton>
      <ToolbarButton
        onClick={onToggleMinimap}
        tooltip={showMinimap ? "Hide minimap" : "Show minimap"}
        active={showMinimap}
      >
        <MapIcon className="size-3.5" />
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
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
