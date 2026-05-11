"use client";

import type { LookupConsultationStep, WorkflowStep } from "@/types";
import { Input } from "@/components/ui/input";
import { Field, TemplatedField } from "../Field";
import { StepIdField } from "./shared";
import type { StepFormProps } from "./types";

export function LookupConsultationForm(
  props: StepFormProps<LookupConsultationStep>
) {
  const { step, onChange, errors } = props;
  return (
    <>
      <TemplatedField
        label="Consultation id"
        value={step.consultationId ?? ""}
        onChange={(v) => onChange({ ...step, consultationId: v })}
        placeholder="{{event.payload.consultationId}}"
        error={errors?.consultationId}
      />
      <Field label="Store as" error={errors?.storeAs}>
        <Input
          value={step.storeAs ?? ""}
          onChange={(e) => onChange({ ...step, storeAs: e.target.value })}
          placeholder="consult"
          className="font-mono text-xs"
        />
      </Field>
      <StepIdField {...(props as StepFormProps<WorkflowStep>)} />
    </>
  );
}
