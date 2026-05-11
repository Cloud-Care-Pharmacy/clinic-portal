"use client";

import type { SendSmsStep, WorkflowStep } from "@/types";
import { TemplatedField } from "../Field";
import { StepIdField } from "./shared";
import type { StepFormProps } from "./types";

export function SendSmsForm(props: StepFormProps<SendSmsStep>) {
  const { step, onChange, errors } = props;
  return (
    <>
      <TemplatedField
        label="To"
        value={step.to ?? ""}
        onChange={(v) => onChange({ ...step, to: v })}
        placeholder="{{vars.patient.phone}}"
        error={errors?.to}
      />
      <TemplatedField
        label="Body"
        value={step.body ?? ""}
        onChange={(v) => onChange({ ...step, body: v })}
        multiline
        rows={4}
        error={errors?.body}
      />
      <StepIdField {...(props as StepFormProps<WorkflowStep>)} />
    </>
  );
}
