"use client";

import type { SendSmsStep } from "@/types";
import { TemplatedField } from "../Field";
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
    </>
  );
}
