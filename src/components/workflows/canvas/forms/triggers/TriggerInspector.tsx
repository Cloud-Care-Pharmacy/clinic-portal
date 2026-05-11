"use client";

import type {
  WorkflowEventTrigger,
  WorkflowScheduleTrigger,
  WorkflowTrigger,
  WorkflowWebhookTrigger,
} from "@/types";
import { EventTriggerForm } from "./EventTriggerForm";
import { ManualTriggerForm } from "./ManualTriggerForm";
import { ScheduleTriggerForm } from "./ScheduleTriggerForm";
import { SubWorkflowTriggerForm } from "./SubWorkflowTriggerForm";
import { WebhookTriggerForm } from "./WebhookTriggerForm";
import type { TriggerErrors } from "./types";

interface TriggerInspectorProps {
  trigger: WorkflowTrigger;
  onChange: (next: WorkflowTrigger) => void;
  errors?: TriggerErrors;
  webhookBaseUrl?: string;
}

export function TriggerInspector({
  trigger,
  onChange,
  errors,
  webhookBaseUrl,
}: TriggerInspectorProps) {
  switch (trigger.kind) {
    case "event":
      return (
        <EventTriggerForm
          trigger={trigger}
          onChange={onChange as (t: WorkflowEventTrigger) => void}
          errors={errors}
        />
      );
    case "schedule":
      return (
        <ScheduleTriggerForm
          trigger={trigger}
          onChange={onChange as (t: WorkflowScheduleTrigger) => void}
          errors={errors}
        />
      );
    case "webhook":
      return (
        <WebhookTriggerForm
          trigger={trigger}
          onChange={onChange as (t: WorkflowWebhookTrigger) => void}
          errors={errors}
          webhookBaseUrl={webhookBaseUrl}
        />
      );
    case "manual":
      return <ManualTriggerForm />;
    case "workflow":
      return <SubWorkflowTriggerForm />;
  }
}

/** Helper to switch a trigger's kind while preserving compatible fields. */
export function blankTrigger(kind: WorkflowTrigger["kind"]): WorkflowTrigger {
  switch (kind) {
    case "event":
      return { kind: "event", eventType: "" };
    case "schedule":
      return { kind: "schedule", cron: "0 9 * * *" };
    case "webhook":
      return { kind: "webhook" };
    case "manual":
      return { kind: "manual" };
    case "workflow":
      return { kind: "workflow" };
  }
}
