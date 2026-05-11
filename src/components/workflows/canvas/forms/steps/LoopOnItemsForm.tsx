"use client";

import { Input } from "@/components/ui/input";
import type { LoopOnItemsStep, WorkflowStep } from "@/types";
import { Field, TemplatedField } from "../Field";
import { StepIdField } from "./shared";
import type { StepFormProps } from "./types";

export function LoopOnItemsForm(props: StepFormProps<LoopOnItemsStep>) {
  const { step, onChange, errors } = props;
  return (
    <>
      <TemplatedField
        label="Items"
        hint="Template expression that resolves to an array."
        value={step.items ?? ""}
        onChange={(v) => onChange({ ...step, items: v })}
        placeholder="{{vars.patients}}"
        error={errors?.items}
      />
      <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
        Inside the loop body, use{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono">
          {"{{loop.item}}"}
        </code>{" "}
        and{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono">
          {"{{loop.index}}"}
        </code>
        .
      </div>
      <Field label="Max iterations (optional)" error={errors?.maxIterations}>
        <Input
          type="number"
          min={1}
          value={step.maxIterations ?? ""}
          onChange={(e) => {
            const n = e.target.value ? Number(e.target.value) : undefined;
            onChange({
              ...step,
              maxIterations:
                typeof n === "number" && Number.isFinite(n) ? n : undefined,
            });
          }}
          placeholder="100"
          className="font-mono text-xs"
        />
      </Field>
      <StepIdField {...(props as StepFormProps<WorkflowStep>)} />
    </>
  );
}
