"use client";

import { ChevronDown, ChevronUp, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TRIGGER_KIND_CONFIG,
  STEP_KIND_CONFIG,
  type NodeKindConfig,
} from "./lib/node-kind-config";
import { TriggerInspector, TriggerKindSelect, blankTrigger } from "./forms/TriggerForms";
import { StepInspector } from "./forms/StepForms";
import type {
  Workflow,
  WorkflowStep,
  WorkflowTrigger,
  WorkflowTriggerKind,
} from "@/types";

export type Selection =
  | { kind: "trigger"; index: number }
  | { kind: "step"; index: number };

interface NodeInspectorProps {
  selection: Selection;
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  onChangeTrigger: (index: number, next: WorkflowTrigger) => void;
  onChangeStep: (index: number, next: WorkflowStep) => void;
  onChangeTriggerKind: (index: number, kind: WorkflowTriggerKind) => void;
  onMoveStep: (index: number, dir: -1 | 1) => void;
  onDeleteTrigger: (index: number) => void;
  onDeleteStep: (index: number) => void;
  onClose: () => void;
  webhookBaseUrl?: string;
  otherWorkflows?: Workflow[];
  /** Server-side validation errors keyed by dotted path. */
  serverError?: { path?: string; message: string } | null;
}

function HeaderTile({ cfg }: { cfg: NodeKindConfig }) {
  const Icon = cfg.icon;
  return (
    <div
      style={{
        background: cfg.bg,
        color: cfg.fg,
        border: `1px solid ${cfg.border}`,
      }}
      className="grid size-7.5 place-items-center rounded-lg"
    >
      <Icon className="size-3.5" />
    </div>
  );
}

export function NodeInspector({
  selection,
  triggers,
  steps,
  onChangeTrigger,
  onChangeStep,
  onChangeTriggerKind,
  onMoveStep,
  onDeleteTrigger,
  onDeleteStep,
  onClose,
  webhookBaseUrl,
  otherWorkflows,
  serverError,
}: NodeInspectorProps) {
  const isTrigger = selection.kind === "trigger";
  const trigger = isTrigger ? triggers[selection.index] : undefined;
  const step = !isTrigger ? steps[selection.index] : undefined;
  if (!trigger && !step) return null;

  const cfg = isTrigger
    ? TRIGGER_KIND_CONFIG[trigger!.kind]
    : STEP_KIND_CONFIG[step!.kind];

  // Map server error path → field name. Path looks like
  // "definition.steps[3].subject" or "triggers[1].cron".
  function fieldErrors(prefix: RegExp): Record<string, string | undefined> {
    if (!serverError?.path) return {};
    const m = serverError.path.match(prefix);
    if (!m) return {};
    return { [m[1]]: serverError.message };
  }

  const triggerErrors = trigger
    ? fieldErrors(new RegExp(`^triggers\\[${selection.index}\\]\\.([\\w]+)$`))
    : {};
  const stepErrors = step
    ? fieldErrors(
        new RegExp(`^definition\\.steps\\[${selection.index}\\]\\.([\\w]+)$`)
      )
    : {};

  const otherSteps = !isTrigger
    ? steps
        .map((s, i) => ({
          id: s.id ?? `step_${i + 1}`,
          label: `${i + 1}. ${s.id ?? s.kind}`,
        }))
        .filter((_, i) => i !== selection.index)
    : [];

  return (
    <aside className="flex h-full w-80 flex-col border-l border-border bg-popover">
      <header className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <HeaderTile cfg={cfg} />
          <div className="min-w-0 flex-1">
            <div
              style={{ color: cfg.accent }}
              className="text-[9px] font-semibold uppercase tracking-[0.08em]"
            >
              {cfg.shortLabel}
            </div>
            <div className="truncate text-sm font-semibold">{cfg.label}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close inspector"
        >
          <X className="size-3.5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-3.5 py-3.5">
        {isTrigger && trigger && (
          <>
            <div className="mb-4">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                Trigger kind
              </div>
              <TriggerKindSelect
                value={trigger.kind}
                onChange={(k) => onChangeTriggerKind(selection.index, k)}
              />
            </div>
            <TriggerInspector
              trigger={trigger}
              onChange={(next) => onChangeTrigger(selection.index, next)}
              errors={triggerErrors}
              webhookBaseUrl={webhookBaseUrl}
            />
          </>
        )}
        {!isTrigger && step && (
          <>
            <div className="mb-4 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Step {selection.index + 1} of {steps.length}</span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-6"
                  disabled={selection.index === 0}
                  onClick={() => onMoveStep(selection.index, -1)}
                  aria-label="Move up"
                >
                  <ChevronUp className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-6"
                  disabled={selection.index === steps.length - 1}
                  onClick={() => onMoveStep(selection.index, 1)}
                  aria-label="Move down"
                >
                  <ChevronDown className="size-3.5" />
                </Button>
              </div>
            </div>
            <StepInspector
              step={step}
              onChange={(next) => onChangeStep(selection.index, next)}
              errors={stepErrors}
              otherSteps={otherSteps}
              otherWorkflows={otherWorkflows}
            />
          </>
        )}
      </div>

      <footer className="flex items-center gap-2 border-t border-border px-3.5 py-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() =>
            isTrigger
              ? onDeleteTrigger(selection.index)
              : onDeleteStep(selection.index)
          }
        >
          <Trash2 className="size-3.5" />
          Delete
        </Button>
      </footer>
    </aside>
  );
}

export { blankTrigger };
