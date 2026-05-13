"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AppSheet } from "@/components/shared/AppSheet";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  STEP_KIND_CONFIG,
  STEP_KINDS,
  TRIGGER_KIND_CONFIG,
  TRIGGER_KINDS,
} from "./lib/node-kind-config";
import type { WorkflowStepKind, WorkflowTriggerKind } from "@/types";

type Tab = "triggers" | "actions";

interface NodePaletteProps {
  open: boolean;
  initialTab?: Tab;
  /**
   * When set, the palette is locked to a single tab and the tab switcher is
   * hidden. Used when (a) the canvas has no trigger yet — the first node must
   * be a trigger — and (b) when replacing an existing trigger.
   */
  lockTab?: Tab;
  /** Title shown at the top of the palette sheet. */
  title?: string;
  onAddTrigger: (kind: WorkflowTriggerKind) => void;
  onAddStep: (kind: WorkflowStepKind) => void;
  onClose: () => void;
}

export function NodePalette({
  open,
  initialTab = "actions",
  lockTab,
  title = "Add node",
  onAddTrigger,
  onAddStep,
  onClose,
}: NodePaletteProps) {
  const effectiveInitial = lockTab ?? initialTab;
  const [tab, setTab] = useState<Tab>(effectiveInitial);
  const [q, setQ] = useState("");

  // Sync tab to initialTab/lockTab when the palette is reopened.
  // (Render-time prev-prop pattern.)
  const [lastInitial, setLastInitial] = useState(effectiveInitial);
  if (effectiveInitial !== lastInitial) {
    setLastInitial(effectiveInitial);
    setTab(effectiveInitial);
  }

  const items = useMemo(() => {
    if (tab === "triggers") {
      return TRIGGER_KINDS.map((kind) => ({
        kind,
        cfg: TRIGGER_KIND_CONFIG[kind],
        onClick: () => onAddTrigger(kind),
      }));
    }
    return STEP_KINDS.map((kind) => ({
      kind,
      cfg: STEP_KIND_CONFIG[kind],
      onClick: () => onAddStep(kind),
    }));
  }, [tab, onAddTrigger, onAddStep]);

  const filtered = q.trim()
    ? items.filter(
        (it) =>
          it.cfg.label.toLowerCase().includes(q.toLowerCase()) ||
          it.cfg.description.toLowerCase().includes(q.toLowerCase())
      )
    : items;

  return (
    <AppSheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title={title}
      bodyClassName="px-0 py-0"
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search nodes"
              className="pl-8"
            />
          </div>
        </div>
        {!lockTab && (
          <div className="flex gap-1 border-b border-border px-3">
            {(["triggers", "actions"] as Tab[]).map((t) => {
              const active = tab === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    "h-8 flex-1 -mb-px border-b-2 text-sm capitalize transition-colors",
                    active
                      ? "border-primary font-semibold text-foreground"
                      : "border-transparent font-medium text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t}
                </button>
              );
            })}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-2.5">
          <ul className="flex flex-col gap-1">
            {filtered.map((it) => {
              const Icon = it.cfg.icon;
              return (
                <li key={it.kind}>
                  <button
                    type="button"
                    onClick={it.onClick}
                    className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-muted"
                  >
                    <span
                      style={{
                        background: it.cfg.bg,
                        color: it.cfg.fg,
                        border: `1px solid ${it.cfg.border}`,
                      }}
                      className="grid size-8 place-items-center rounded-lg shrink-0"
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold leading-tight">
                        {it.cfg.label}
                      </span>
                      <span className="mt-px block text-[11px] text-muted-foreground">
                        {it.cfg.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-2 py-6 text-center text-xs text-muted-foreground">
                No matches.
              </li>
            )}
          </ul>
        </div>
      </div>
    </AppSheet>
  );
}
