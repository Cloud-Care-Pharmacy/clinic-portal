"use client";

import { Input } from "@/components/ui/input";
import type { IsPractitionerOnLeaveStep } from "@/types";
import { Field, TemplatedField } from "../Field";
import type { StepFormProps } from "./types";

export function IsPractitionerOnLeaveForm(
  props: StepFormProps<IsPractitionerOnLeaveStep>
) {
  const { step, onChange, errors } = props;
  return (
    <>
      <TemplatedField
        label="Practitioner user id"
        value={step.practitionerUserId ?? ""}
        onChange={(v) => onChange({ ...step, practitionerUserId: v })}
        placeholder="{{vars.doctorId}}"
        error={errors?.practitionerUserId}
      />
      <TemplatedField
        label="Date"
        value={step.date ?? ""}
        onChange={(v) => onChange({ ...step, date: v })}
        placeholder="2026-05-20"
        hint="ISO date (YYYY-MM-DD) or template."
        error={errors?.date}
      />
      <Field
        label="Store as"
        hint="Available later as {{vars.<storeAs>}}."
        error={errors?.storeAs}
      >
        <Input
          value={step.storeAs ?? ""}
          onChange={(e) => onChange({ ...step, storeAs: e.target.value })}
          placeholder="leave"
          className="font-mono text-xs"
        />
      </Field>
    </>
  );
}
