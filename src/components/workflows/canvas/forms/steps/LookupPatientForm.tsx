"use client";

import type { LookupPatientStep } from "@/types";
import { Input } from "@/components/ui/input";
import { Field, TemplatedField } from "../Field";
import type { StepFormProps } from "./types";

export function LookupPatientForm(props: StepFormProps<LookupPatientStep>) {
  const { step, onChange, errors } = props;
  return (
    <>
      <TemplatedField
        label="Patient id"
        value={step.patientId ?? ""}
        onChange={(v) => onChange({ ...step, patientId: v })}
        placeholder="{{event.payload.patientId}}"
        error={errors?.patientId}
      />
      <Field
        label="Store as"
        hint="Available later as {{vars.<storeAs>}}."
        error={errors?.storeAs}
      >
        <Input
          value={step.storeAs ?? ""}
          onChange={(e) => onChange({ ...step, storeAs: e.target.value })}
          placeholder="patient"
          className="font-mono text-xs"
        />
      </Field>
    </>
  );
}
