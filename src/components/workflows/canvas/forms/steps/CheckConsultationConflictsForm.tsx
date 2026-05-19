"use client";

import { Input } from "@/components/ui/input";
import type { CheckConsultationConflictsStep } from "@/types";
import { Field, TemplatedField } from "../Field";
import type { StepFormProps } from "./types";

export function CheckConsultationConflictsForm(
  props: StepFormProps<CheckConsultationConflictsStep>
) {
  const { step, onChange, errors } = props;
  return (
    <>
      <TemplatedField
        label="Doctor id"
        value={step.doctorId ?? ""}
        onChange={(v) => onChange({ ...step, doctorId: v })}
        placeholder="{{vars.doctorId}}"
        error={errors?.doctorId}
      />
      <TemplatedField
        label="Scheduled at"
        value={step.scheduledAt ?? ""}
        onChange={(v) => onChange({ ...step, scheduledAt: v })}
        placeholder="2026-05-20T10:00:00Z"
        hint="ISO-8601 datetime or template."
        error={errors?.scheduledAt}
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
        label="Exclude consultation id (optional)"
        value={step.excludeConsultationId ?? ""}
        onChange={(v) =>
          onChange({ ...step, excludeConsultationId: v ? v : undefined })
        }
        placeholder="{{event.payload.consultationId}}"
        error={errors?.excludeConsultationId}
      />
      <Field
        label="Store as"
        hint="Available later as {{vars.<storeAs>}}."
        error={errors?.storeAs}
      >
        <Input
          value={step.storeAs ?? ""}
          onChange={(e) => onChange({ ...step, storeAs: e.target.value })}
          placeholder="conflicts"
          className="font-mono text-xs"
        />
      </Field>
    </>
  );
}
