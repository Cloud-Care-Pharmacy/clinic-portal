"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WorkflowStep, WorkflowStepRetryPolicy } from "@/types";
import { Field } from "../Field";

interface RetrySettingsProps {
  step: WorkflowStep;
  onChange: (next: WorkflowStep) => void;
}

const DEFAULT_RETRY_POLICY: WorkflowStepRetryPolicy = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  backoff: "exponential",
};

/**
 * Compute the delay (ms) before attempt N (N starts at 2). Mirrors the
 * server-side math from the workflow engine v2 handoff:
 *  - `'fixed'`:       `initialDelayMs`
 *  - `'linear'`:      `initialDelayMs * (N - 1)`
 *  - `'exponential'`: `initialDelayMs * 2 ^ (N - 2)`
 *
 * Capped at `maxDelayMs` (default 1h to match the server).
 */
function computeRetryDelayMs(
  policy: WorkflowStepRetryPolicy,
  attemptN: number
): number {
  const backoff = policy.backoff ?? "exponential";
  const cap = policy.maxDelayMs ?? 3_600_000;
  let raw: number;
  switch (backoff) {
    case "fixed":
      raw = policy.initialDelayMs;
      break;
    case "linear":
      raw = policy.initialDelayMs * (attemptN - 1);
      break;
    case "exponential":
    default:
      raw = policy.initialDelayMs * Math.pow(2, attemptN - 2);
      break;
  }
  return Math.min(Math.max(0, Math.round(raw)), cap);
}

function formatRetryDelayPreview(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) {
    const s = ms / 1000;
    return Number.isInteger(s) ? `${s}s` : `${s.toFixed(1)}s`;
  }
  const totalSec = Math.round(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
}

/**
 * Per-step retry policy authoring. Off by default — when toggled on,
 * prefills the recommended `{ maxAttempts: 3, initialDelayMs: 1000,
 * backoff: 'exponential' }` policy. The save path strips the field when
 * absent so unused steps don't persist an empty `retry: {}`.
 */
export function RetrySettings({ step, onChange }: RetrySettingsProps) {
  const enabled = step.retry !== undefined;
  const policy = step.retry ?? DEFAULT_RETRY_POLICY;
  const idBase = step.id ?? step.kind;

  function update(next: Partial<WorkflowStepRetryPolicy>) {
    onChange({ ...step, retry: { ...policy, ...next } });
  }

  function toggle(on: boolean) {
    if (on) {
      onChange({ ...step, retry: { ...DEFAULT_RETRY_POLICY } });
    } else {
      const { retry: _retry, ...rest } = step as WorkflowStep & {
        retry?: WorkflowStepRetryPolicy;
      };
      void _retry;
      onChange(rest as WorkflowStep);
    }
  }

  // Preview the delays before attempts 2 / 3 / 4 (capped to maxAttempts).
  const previewDelays: number[] = [];
  if (enabled) {
    const last = Math.min(policy.maxAttempts, 4);
    for (let n = 2; n <= last; n += 1) {
      previewDelays.push(computeRetryDelayMs(policy, n));
    }
  }

  return (
    <fieldset className="mt-4 rounded-md border border-border/60 bg-muted/20 p-3">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Retry on failure
      </legend>
      <label
        htmlFor={`retry-enabled-${idBase}`}
        className="flex cursor-pointer items-start gap-2"
      >
        <Checkbox
          id={`retry-enabled-${idBase}`}
          checked={enabled}
          onCheckedChange={(c) => toggle(Boolean(c))}
          className="mt-0.5"
        />
        <span className="flex flex-col">
          <span className="text-sm font-medium">Retry on failure</span>
          <span className="text-xs text-muted-foreground">
            When this step fails, the engine schedules another attempt instead
            of failing the run immediately.
          </span>
        </span>
      </label>

      {enabled ? (
        <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Max attempts">
              <Input
                id={`retry-max-${idBase}`}
                type="number"
                min={1}
                max={10}
                step={1}
                value={policy.maxAttempts}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n)) {
                    update({ maxAttempts: Math.max(1, Math.min(10, Math.round(n))) });
                  }
                }}
                className="font-mono text-xs"
              />
            </Field>
            <Field label="Initial delay (ms)">
              <Input
                id={`retry-init-${idBase}`}
                type="number"
                min={100}
                max={3_600_000}
                step={100}
                value={policy.initialDelayMs}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n)) {
                    update({
                      initialDelayMs: Math.max(100, Math.min(3_600_000, Math.round(n))),
                    });
                  }
                }}
                className="font-mono text-xs"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Backoff">
              <Select
                value={policy.backoff ?? "exponential"}
                onValueChange={(v) => {
                  if (v) update({ backoff: v as WorkflowStepRetryPolicy["backoff"] });
                }}
              >
                <SelectTrigger id={`retry-backoff-${idBase}`} className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exponential">Exponential</SelectItem>
                  <SelectItem value="linear">Linear</SelectItem>
                  <SelectItem value="fixed">Fixed</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Max delay (ms, optional)">
              <Input
                id={`retry-cap-${idBase}`}
                type="number"
                min={100}
                max={86_400_000}
                step={100}
                value={policy.maxDelayMs ?? ""}
                placeholder="3600000"
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") {
                    const { maxDelayMs: _drop, ...rest } = policy;
                    void _drop;
                    onChange({ ...step, retry: rest });
                    return;
                  }
                  const n = Number(raw);
                  if (Number.isFinite(n)) {
                    update({
                      maxDelayMs: Math.max(100, Math.min(86_400_000, Math.round(n))),
                    });
                  }
                }}
                className="font-mono text-xs"
              />
            </Field>
          </div>
          {previewDelays.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Retries:{" "}
              <span className="font-mono">
                {previewDelays.map(formatRetryDelayPreview).join(" → ")}
              </span>{" "}
              ({policy.maxAttempts} attempts max,{" "}
              {policy.backoff ?? "exponential"} backoff)
            </p>
          ) : null}
        </div>
      ) : null}
    </fieldset>
  );
}
