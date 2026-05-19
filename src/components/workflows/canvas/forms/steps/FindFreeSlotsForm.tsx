"use client";

import { Input } from "@/components/ui/input";
import type { FindFreeSlotsStep } from "@/types";
import { Field, TemplatedField } from "../Field";
import type { StepFormProps } from "./types";

export function FindFreeSlotsForm(props: StepFormProps<FindFreeSlotsStep>) {
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
      <Field label="Duration (minutes)" error={errors?.durationMinutes}>
        <Input
          type="number"
          min={1}
          max={1440}
          value={step.durationMinutes ?? ""}
          onChange={(e) => {
            const n = Number(e.target.value) || 0;
            onChange({ ...step, durationMinutes: n });
          }}
          placeholder="30"
          className="font-mono text-xs"
        />
      </Field>
      <TemplatedField
        label="Timezone (optional)"
        value={step.timezone ?? ""}
        onChange={(v) => onChange({ ...step, timezone: v ? v : undefined })}
        placeholder="Europe/London"
        error={errors?.timezone}
      />
      <Field
        label="Store as"
        hint="Available later as {{vars.<storeAs>}}."
        error={errors?.storeAs}
      >
        <Input
          value={step.storeAs ?? ""}
          onChange={(e) => onChange({ ...step, storeAs: e.target.value })}
          placeholder="slots"
          className="font-mono text-xs"
        />
      </Field>
    </>
  );
}
