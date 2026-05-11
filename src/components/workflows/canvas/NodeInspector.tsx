"use client";

import { ChevronDown, ChevronUp, Repeat, Trash2 } from "lucide-react";
import { AppSheet } from "@/components/shared/AppSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TRIGGER_KIND_CONFIG,
  STEP_KIND_CONFIG,
  type NodeKindConfig,
} from "./lib/node-kind-config";
import { TriggerInspector, blankTrigger } from "./forms/triggers";
import { StepInspector } from "./forms/steps";
import { CaptureSettings } from "./forms/steps/CaptureSettings";
import { RetrySettings } from "./forms/steps/RetrySettings";
import { Field } from "./forms/Field";
import type {
  Workflow,
  WorkflowStep,
  WorkflowTrigger,
} from "@/types";

export type Selection =
  | { kind: "trigger"; index: number }
  | { kind: "step"; index: number };

interface NodeInspectorProps {
  open: boolean;
  selection: Selection | null;
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  onChangeTrigger: (index: number, next: WorkflowTrigger) => void;
  onChangeStep: (index: number, next: WorkflowStep) => void;
  /**
   * Open the trigger picker to replace the trigger at `index`. The trigger
   * kind cannot be changed in-place via a dropdown — the user must pick a
   * new trigger from the same list shown when adding the first one.
   */
  onReplaceTrigger: (index: number) => void;
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
  open,
  selection,
  triggers,
  steps,
  onChangeTrigger,
  onChangeStep,
  onReplaceTrigger,
  onMoveStep,
  onDeleteTrigger,
  onDeleteStep,
  onClose,
  webhookBaseUrl,
  otherWorkflows,
  serverError,
}: NodeInspectorProps) {
  const isTrigger = selection?.kind === "trigger";
  const trigger =
    selection?.kind === "trigger" ? triggers[selection.index] : undefined;
  const step = selection?.kind === "step" ? steps[selection.index] : undefined;
  const cfg: NodeKindConfig | null = trigger
    ? TRIGGER_KIND_CONFIG[trigger.kind]
    : step
      ? STEP_KIND_CONFIG[step.kind]
      : null;

  function fieldErrors(prefix: RegExp): Record<string, string | undefined> {
    if (!serverError?.path) return {};
    const m = serverError.path.match(prefix);
    if (!m) return {};
    return { [m[1]]: serverError.message };
  }

  const triggerErrors =
    trigger && selection
      ? fieldErrors(new RegExp(`^triggers\\[${selection.index}\\]\\.([\\w]+)$`))
      : {};
  const stepErrors =
    step && selection
      ? fieldErrors(
          new RegExp(`^definition\\.steps\\[${selection.index}\\]\\.([\\w]+)$`),
        )
      : {};

  const otherSteps =
    selection?.kind === "step"
      ? steps
          .map((s, i) => ({
            id: s.id ?? `step_${i + 1}`,
            label: `${i + 1}. ${s.id ?? s.kind}`,
          }))
          .filter((_, i) => i !== selection.index)
      : [];

  const title =
    cfg && selection ? (
      <div className="flex min-w-0 items-center gap-2.5">
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
    ) : (
      "Inspector"
    );

  const footer =
    selection && cfg ? (
      <>
        {isTrigger ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="sm:mr-auto"
            onClick={() => onReplaceTrigger(selection.index)}
          >
            <Repeat className="size-3.5" />
            Replace trigger
          </Button>
        ) : null}
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
      </>
    ) : null;

  return (
    <AppSheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title={title}
      footer={footer}
    >
      {selection && trigger && (
        <TriggerInspector
          trigger={trigger}
          onChange={(next) => onChangeTrigger(selection.index, next)}
          errors={triggerErrors}
          webhookBaseUrl={webhookBaseUrl}
        />
      )}
      {selection && step && (
        <Tabs defaultValue="parameters" className="gap-3">
          <TabsList variant="line" className="-mt-1">
            <TabsTrigger value="parameters">Parameters</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="parameters" className="space-y-0">
            <div className="mb-4 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                Step {selection.index + 1} of {steps.length}
              </span>
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
          </TabsContent>
          <TabsContent value="settings">
            <Field
              label="Name (optional)"
              hint="Used as a goto target from a branch step. Letters, digits, _ or -."
              error={stepErrors.id}
            >
              <Input
                value={step.id ?? ""}
                onChange={(e) =>
                  onChangeStep(selection.index, {
                    ...step,
                    id: e.target.value || undefined,
                  } as WorkflowStep)
                }
                placeholder="auto"
                className="font-mono text-xs"
              />
            </Field>
            <CaptureSettings
              step={step}
              onChange={(next) => onChangeStep(selection.index, next)}
            />
            <RetrySettings
              step={step}
              onChange={(next) => onChangeStep(selection.index, next)}
            />
          </TabsContent>
        </Tabs>
      )}
    </AppSheet>
  );
}

export { blankTrigger };
