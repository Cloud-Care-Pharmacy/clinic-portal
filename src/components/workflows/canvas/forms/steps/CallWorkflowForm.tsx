"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CallWorkflowStep } from "@/types";
import { Field } from "../Field";
import type { StepFormProps } from "./types";

export function CallWorkflowForm(props: StepFormProps<CallWorkflowStep>) {
  const { step, onChange, errors, otherWorkflows = [] } = props;
  return (
    <>
      <Field
        label="Workflow"
        hint="Target workflow must declare a `workflow` trigger and be active."
        error={errors?.workflowId}
      >
        <Select
          value={step.workflowId ?? ""}
          onValueChange={(v) => v && onChange({ ...step, workflowId: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select workflow" />
          </SelectTrigger>
          <SelectContent>
            {otherWorkflows.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Store result as (optional)" error={errors?.storeAs}>
        <Input
          value={step.storeAs ?? ""}
          onChange={(e) => onChange({ ...step, storeAs: e.target.value || undefined })}
          placeholder="subRun"
          className="font-mono text-xs"
        />
      </Field>
    </>
  );
}
