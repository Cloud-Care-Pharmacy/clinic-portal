"use client";

import { Input } from "@/components/ui/input";
import type { WaitForEventStep } from "@/types";
import { Field } from "../Field";
import type { StepFormProps } from "./types";

export function WaitForEventForm(props: StepFormProps<WaitForEventStep>) {
  const { step, onChange, errors } = props;
  return (
    <>
      <Field label="Event type" error={errors?.eventType}>
        <Input
          value={step.eventType ?? ""}
          onChange={(e) => onChange({ ...step, eventType: e.target.value })}
          placeholder="patient.replied"
          className="font-mono text-xs"
        />
      </Field>
      <Field
        label="Timeout (seconds, optional)"
        hint="If set and no matching event arrives, the step fails."
        error={errors?.timeoutSeconds}
      >
        <Input
          type="number"
          min={1}
          max={2_592_000}
          value={step.timeoutSeconds ?? ""}
          onChange={(e) =>
            onChange({
              ...step,
              timeoutSeconds: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        />
      </Field>

    </>
  );
}
