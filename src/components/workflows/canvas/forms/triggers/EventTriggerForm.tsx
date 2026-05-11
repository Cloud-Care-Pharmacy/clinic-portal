"use client";

import { Input } from "@/components/ui/input";
import { Field } from "../Field";
import type { WorkflowEventTrigger } from "@/types";
import type { TriggerErrors, TriggerFormProps } from "./types";

const COMMON_EVENT_TYPES = [
  "patient.created",
  "consultation.scheduled",
  "consultation.completed",
  "prescription.created",
  "task.created",
  "system.tick.daily",
];

export function EventTriggerForm({
  trigger,
  onChange,
  errors,
}: TriggerFormProps<WorkflowEventTrigger>) {
  return (
    <>
      <Field
        label="Event type"
        hint="Dotted name like `consultation.scheduled`. Free text — no enum yet."
        error={errors?.eventType}
      >
        <Input
          value={trigger.eventType}
          onChange={(e) => onChange({ ...trigger, eventType: e.target.value })}
          placeholder="consultation.scheduled"
          className="font-mono text-xs"
        />
      </Field>
      <Field label="Common types">
        <div className="flex flex-wrap gap-1.5">
          {COMMON_EVENT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange({ ...trigger, eventType: t })}
              className="rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              {t}
            </button>
          ))}
        </div>
      </Field>
    </>
  );
}

export type { TriggerErrors };
