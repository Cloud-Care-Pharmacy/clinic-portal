"use client";

import { Input } from "@/components/ui/input";
import type { GetPractitionerAvailabilityStep } from "@/types";
import { Field, TemplatedField } from "../Field";
import type { StepFormProps } from "./types";

export function GetPractitionerAvailabilityForm(
  props: StepFormProps<GetPractitionerAvailabilityStep>
) {
  const { step, onChange, errors } = props;
  return (
    <>
      <TemplatedField
        label="Practitioner user id"
        value={step.practitionerUserId ?? ""}
        onChange={(v) => onChange({ ...step, practitionerUserId: v })}
        placeholder="{{vars.practitionerId}}"
        error={errors?.practitionerUserId}
      />
      <Field
        label="Store as"
        hint="Available later as {{vars.<storeAs>}}."
        error={errors?.storeAs}
      >
        <Input
          value={step.storeAs ?? ""}
          onChange={(e) => onChange({ ...step, storeAs: e.target.value })}
          placeholder="availability"
          className="font-mono text-xs"
        />
      </Field>
    </>
  );
}
