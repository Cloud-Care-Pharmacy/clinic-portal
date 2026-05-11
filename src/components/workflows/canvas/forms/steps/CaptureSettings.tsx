"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { WorkflowStep, WorkflowStepCaptureMode } from "@/types";

interface CaptureSettingsProps {
  step: WorkflowStep;
  onChange: (next: WorkflowStep) => void;
}

const CAPTURE_OPTIONS: ReadonlyArray<{
  value: WorkflowStepCaptureMode;
  label: string;
  description: string;
}> = [
  {
    value: "summary",
    label: "Summary",
    description:
      "Records a redacted, ≤ 2 KB snapshot of inputs and outputs. Recommended.",
  },
  {
    value: "full",
    label: "Full",
    description:
      "Stores the complete payload in object storage. Use for steps you frequently need to debug.",
  },
  {
    value: "none",
    label: "None",
    description: "Records timing only. Use for high-frequency steps.",
  },
];

/**
 * Per-step audit capture controls (capture mode + sensitive flag). Renders
 * inside `StepInspector` for every step kind. Defaults are not persisted —
 * the save path strips `capture: 'summary'` and `sensitive: false` so the
 * stored definition stays clean.
 */
export function CaptureSettings({ step, onChange }: CaptureSettingsProps) {
  const sensitive = step.sensitive === true;
  // When `sensitive`, capture is forced to `'none'`.
  const captureMode: WorkflowStepCaptureMode = sensitive
    ? "none"
    : (step.capture ?? "summary");

  function updateCapture(next: WorkflowStepCaptureMode) {
    onChange({ ...step, capture: next });
  }

  function updateSensitive(next: boolean) {
    if (next) {
      onChange({ ...step, sensitive: true, capture: "none" });
    } else {
      onChange({ ...step, sensitive: false, capture: "summary" });
    }
  }

  const idBase = step.id ?? step.kind;

  return (
    <fieldset className="mt-4 rounded-md border border-border/60 bg-muted/20 p-3">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Capture
      </legend>
      <RadioGroup
        value={captureMode}
        onValueChange={(v) => {
          if (v) updateCapture(v as WorkflowStepCaptureMode);
        }}
        disabled={sensitive}
        className="gap-2"
      >
        {CAPTURE_OPTIONS.map((opt) => {
          const id = `capture-${idBase}-${opt.value}`;
          return (
            <label
              key={opt.value}
              htmlFor={id}
              className="flex cursor-pointer items-start gap-2 rounded-md p-1.5 hover:bg-accent/40"
            >
              <RadioGroupItem
                value={opt.value}
                id={id}
                className="mt-0.5"
                disabled={sensitive}
              />
              <span className="flex flex-col">
                <span className="text-sm font-medium">{opt.label}</span>
                <span className="text-xs text-muted-foreground">{opt.description}</span>
              </span>
            </label>
          );
        })}
      </RadioGroup>
      <label
        htmlFor={`capture-sensitive-${idBase}`}
        className="mt-3 flex cursor-pointer items-start gap-2 border-t border-border/60 pt-3"
      >
        <Checkbox
          id={`capture-sensitive-${idBase}`}
          checked={sensitive}
          onCheckedChange={(c) => updateSensitive(Boolean(c))}
          className="mt-0.5"
        />
        <span className="flex flex-col">
          <span className="text-sm font-medium">Sensitive</span>
          <span className="text-xs text-muted-foreground">
            Disables capture entirely. Use for steps handling secrets or PHI.
          </span>
        </span>
      </label>
    </fieldset>
  );
}
