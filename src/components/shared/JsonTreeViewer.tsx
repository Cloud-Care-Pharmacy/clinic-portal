"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { JsonView, defaultStyles, darkStyles } from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface JsonTreeViewerProps {
  /** Parsed JSON value to render. `null`/`undefined` renders the empty state. */
  value: unknown;
  /** Optional label for the copy/empty header. */
  label?: string;
  /** Override the empty-state message. */
  emptyMessage?: string;
  /** Force the dark colour preset (defaults to light tokens). */
  dark?: boolean;
  /** Initially-expanded depth. Defaults to 2. */
  expandedDepth?: number;
  className?: string;
}

/**
 * Collapsible JSON tree viewer for run logs Input/Output panes. Wraps
 * `react-json-view-lite` with a copy button and design-system surface tokens.
 */
export function JsonTreeViewer({
  value,
  label,
  emptyMessage = "No data.",
  dark = false,
  expandedDepth = 2,
  className,
}: JsonTreeViewerProps) {
  const [copied, setCopied] = useState(false);

  if (value === null || value === undefined) {
    return (
      <div
        className={cn(
          "rounded-md border border-dashed border-border/60 bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground",
          className
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(value, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore clipboard failures
    }
  }

  return (
    <div
      className={cn("relative rounded-md border border-border/60 bg-card", className)}
    >
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          {label ?? "JSON"}
        </span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 gap-1 px-2 text-xs"
          onClick={onCopy}
        >
          {copied ? (
            <>
              <Check className="size-3" /> Copied
            </>
          ) : (
            <>
              <Copy className="size-3" /> Copy
            </>
          )}
        </Button>
      </div>
      <div className="max-h-[60vh] overflow-auto p-2 font-mono text-xs">
        <JsonView
          data={value as object}
          shouldExpandNode={(level) => level < expandedDepth}
          style={dark ? darkStyles : defaultStyles}
        />
      </div>
    </div>
  );
}
