"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useVarsCatalog, isLeafAvailableAtStep } from "../lib/vars-catalog-context";
import type { WorkflowVarLeaf, WorkflowVarSource } from "@/types";

/** Match the most recent unclosed `{{ ... ` before the caret. Captures the token. */
const OPEN_TEMPLATE_RE = /\{\{([^{}]*)$/;

interface CaretInfo {
  /** Start index (inside the value) of the `{{` we'll replace. */
  openIndex: number;
  /** The text typed after `{{` so far (used to fuzzy-filter). */
  token: string;
  /** True when a closing `}}` is missing immediately after the caret. */
  needsClose: boolean;
}

function detectOpenTemplate(value: string, caret: number): CaretInfo | null {
  const before = value.slice(0, caret);
  const match = OPEN_TEMPLATE_RE.exec(before);
  if (!match) return null;
  const after = value.slice(caret);
  return {
    openIndex: before.length - match[0].length,
    token: match[1],
    needsClose: !after.startsWith("}}"),
  };
}

function fuzzyMatches(leaf: WorkflowVarLeaf, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return leaf.path.toLowerCase().includes(q) || leaf.label.toLowerCase().includes(q);
}

function describeSource(source: WorkflowVarSource): string {
  switch (source.kind) {
    case "static":
      return "Always available";
    case "event":
      return `From event ${source.eventType}`;
    case "step":
      return `Set by step #${source.stepIndex + 1} (${source.stepKind})${
        source.casing ? ` · ${source.casing}_case` : ""
      }`;
    case "wait_for_event":
      return `From resumed event ${source.eventType} (step #${source.stepIndex + 1})`;
    case "loop":
      return `Loop scope (step #${source.stepIndex + 1})`;
  }
}

interface VarPickerPopoverProps {
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string, caret: number) => void;
}

/**
 * Floating autocomplete attached to a `TemplatedField` input/textarea.
 *
 * - Opens automatically when the caret sits inside an unclosed `{{ ... `.
 * - Filters catalog leaves by `path` + `label`.
 * - On selection: replaces the open `{{token` with `{{leaf.path}}` and
 *   moves the caret past the closing braces.
 * - Synthetic display-only paths from the global catalog (those containing
 *   `[ ]`) are shown but cannot be inserted.
 */
export function VarPickerPopover({ inputRef, value, onChange }: VarPickerPopoverProps) {
  const { catalog, stepIndex } = useVarsCatalog();
  const [caret, setCaret] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  // Reset the highlighted row whenever the filter set changes. Tracked via
  // the "store previous value during render" pattern to avoid a setState-in-
  // effect cascade. https://react.dev/reference/react/useState#storing-information-from-previous-renders
  // (Read during render at the `if (lastFilterKey !== filterKey)` check below.)
  const [lastFilterKey, setLastFilterKey] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Watch caret/selection on the input. Polling on focus events + key/input.
  const updateCaret = useCallback(() => {
    const el = inputRef.current;
    if (!el) {
      setCaret(null);
      return;
    }
    if (document.activeElement !== el) {
      setCaret(null);
      return;
    }
    setCaret(el.selectionStart ?? null);
  }, [inputRef]);

  // `updateCaret` is already memoized with useCallback, so the effect only
  // resubscribes when `inputRef` changes (effectively never). useEffectEvent
  // is still experimental in React 19; revisit once stable.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const handler = () => updateCaret();
    el.addEventListener("input", handler);
    el.addEventListener("keyup", handler);
    el.addEventListener("click", handler);
    el.addEventListener("focus", handler);
    el.addEventListener("blur", handler);
    return () => {
      el.removeEventListener("input", handler);
      el.removeEventListener("keyup", handler);
      el.removeEventListener("click", handler);
      el.removeEventListener("focus", handler);
      el.removeEventListener("blur", handler);
    };
  }, [inputRef, updateCaret]);

  const info = useMemo<CaretInfo | null>(
    () => (caret == null ? null : detectOpenTemplate(value, caret)),
    [value, caret]
  );

  const open = info != null && catalog != null && catalog.leaves.length > 0;

  const filtered = useMemo(() => {
    if (!open || !catalog || !info) return [] as WorkflowVarLeaf[];
    return catalog.leaves.filter((l) => fuzzyMatches(l, info.token));
  }, [open, catalog, info]);

  // Reset highlight to row 0 whenever the filter set changes. Done during
  // render to avoid a setState-in-effect cascade.
  const filterKey = `${info?.token ?? ""}::${filtered.length}`;
  if (lastFilterKey !== filterKey) {
    setLastFilterKey(filterKey);
    setActiveIndex(0);
  }

  const insertLeaf = useCallback(
    (leaf: WorkflowVarLeaf) => {
      const el = inputRef.current;
      if (!el || !info) return;
      // Disallow synthetic display-only paths (e.g. `event.payload[<eventType>]`).
      if (/[\[\]]/.test(leaf.path)) return;
      const caretPos = el.selectionStart ?? value.length;
      const before = value.slice(0, info.openIndex);
      const after = value.slice(caretPos);
      const insert = `{{${leaf.path}}}`;
      const next = before + insert + (info.needsClose ? "" : after.slice(0));
      // If a closing `}}` already follows the caret, skip past it.
      const finalAfter = info.needsClose ? after : after.slice(2);
      const finalValue = before + insert + finalAfter;
      const newCaret = (before + insert).length;
      onChange(finalValue, newCaret);
      // Restore caret on next paint.
      requestAnimationFrame(() => {
        const el2 = inputRef.current;
        if (!el2) return;
        el2.focus();
        el2.setSelectionRange(newCaret, newCaret);
      });
      // Suppress the "next" implied insert by closing the popover.
      setCaret(null);
      // Silence unused-var lint for `next` (kept for readability).
      void next;
    },
    [info, inputRef, onChange, value]
  );

  // Keyboard nav while popover is open. setState calls are inside an event
  // handler attached to the input, not a render-driven cascade.
  useEffect(() => {
    if (!open) return;
    const el = inputRef.current;
    if (!el) return;
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        const leaf = filtered[activeIndex];
        if (leaf && !/[\[\]]/.test(leaf.path)) {
          e.preventDefault();
          insertLeaf(leaf);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setCaret(null);
      }
    };
    el.addEventListener("keydown", handler as EventListener);
    return () => el.removeEventListener("keydown", handler as EventListener);
  }, [open, filtered, activeIndex, inputRef, insertLeaf]);

  // Scroll the active row into view.
  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>(
      `[data-row-index="${activeIndex}"]`
    );
    node?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  if (!open || !info) return null;

  return (
    <div
      role="listbox"
      ref={listRef}
      className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-sm shadow-md ring-1 ring-foreground/10"
      // Prevent blurring the input when clicking inside the picker.
      onMouseDown={(e) => e.preventDefault()}
    >
      {filtered.length === 0 && (
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          No matches for{" "}
          <code className="rounded bg-muted px-1">{info.token || "…"}</code>
        </div>
      )}
      {filtered.map((leaf, i) => {
        const synthetic = /[\[\]]/.test(leaf.path);
        const dimmed =
          synthetic || leaf.dynamic || !isLeafAvailableAtStep(leaf, stepIndex);
        return (
          <div
            key={leaf.path}
            data-row-index={i}
            role="option"
            tabIndex={-1}
            aria-selected={i === activeIndex}
            onClick={() => {
              if (synthetic || leaf.dynamic) return;
              insertLeaf(leaf);
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              if (synthetic || leaf.dynamic) return;
              e.preventDefault();
              insertLeaf(leaf);
            }}
            className={cn(
              "flex cursor-pointer flex-col gap-0.5 rounded-md px-2 py-1.5",
              i === activeIndex && "bg-muted",
              dimmed && "opacity-60",
              (synthetic || leaf.dynamic) && "cursor-not-allowed"
            )}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-foreground">
                {leaf.label}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {leaf.type}
                {leaf.optional ? "?" : ""}
                {leaf.type === "array" && leaf.arrayElement
                  ? `<${leaf.arrayElement}>`
                  : ""}
              </span>
              {leaf.source.kind === "step" && leaf.source.casing === "snake" && (
                <span className="rounded bg-muted px-1 text-[10px] font-medium text-muted-foreground">
                  snake_case
                </span>
              )}
              {leaf.dynamic && (
                <span className="rounded bg-muted px-1 text-[10px] text-muted-foreground">
                  any key: autocomplete unavailable
                </span>
              )}
            </div>
            <code className="font-mono text-[11px] text-muted-foreground">
              {leaf.path}
            </code>
            {leaf.description && (
              <div className="text-[11px] text-muted-foreground">
                {leaf.description}
              </div>
            )}
            <div className="text-[10px] italic text-muted-foreground">
              {describeSource(leaf.source)}
            </div>
            {leaf.type === "enum" && leaf.enumValues && leaf.enumValues.length > 0 && (
              <div className="mt-0.5 flex flex-wrap gap-1">
                {leaf.enumValues.slice(0, 8).map((v) => (
                  <span
                    key={v}
                    className="rounded bg-muted px-1 text-[10px] text-muted-foreground"
                  >
                    {v}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
