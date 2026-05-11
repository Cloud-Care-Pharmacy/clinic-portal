"use client";

import { ScheduleBuilder } from "../ScheduleBuilder";
import type { WorkflowScheduleTrigger } from "@/types";
import type { TriggerFormProps } from "./types";

export function ScheduleTriggerForm({
  trigger,
  onChange,
  errors,
}: TriggerFormProps<WorkflowScheduleTrigger>) {
  return (
    <ScheduleBuilder
      cron={trigger.cron}
      onChange={(cron) => onChange({ ...trigger, cron })}
      error={errors?.cron}
    />
  );
}
