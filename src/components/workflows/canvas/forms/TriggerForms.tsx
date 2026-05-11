"use client";

import { useMemo } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "./Field";
import { cronWarnings } from "../lib/workflow-schema";
import type {
  WorkflowEventTrigger,
  WorkflowScheduleTrigger,
  WorkflowTrigger,
  WorkflowWebhookTrigger,
} from "@/types";

type TriggerErrors = Record<string, string | undefined>;

interface TriggerFormProps<T extends WorkflowTrigger> {
  trigger: T;
  onChange: (next: T) => void;
  errors?: TriggerErrors;
}

const COMMON_EVENT_TYPES = [
  "patient.created",
  "consultation.scheduled",
  "consultation.completed",
  "prescription.created",
  "task.created",
  "system.tick.daily",
];

const CRON_PRESETS: { label: string; cron: string }[] = [
  { label: "Every 5 minutes", cron: "*/5 * * * *" },
  { label: "Top of every hour", cron: "0 * * * *" },
  { label: "9:00 AM UTC daily", cron: "0 9 * * *" },
  { label: "Weekdays at 9:00 AM UTC", cron: "0 9 * * 1-5" },
  { label: "1st of every month, 9:30 AM UTC", cron: "30 9 1 * *" },
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

export function ManualTriggerForm() {
  return (
    <p className="text-sm text-muted-foreground">
      Manual triggers fire only when the <strong>Test run</strong> button or the{" "}
      <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
        /workflows/trigger
      </code>{" "}
      API is invoked.
    </p>
  );
}

export function SubWorkflowTriggerForm() {
  return (
    <p className="text-sm text-muted-foreground">
      This workflow is invokable from another workflow&apos;s{" "}
      <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
        call_workflow
      </code>{" "}
      step. It must also be active.
    </p>
  );
}

export function ScheduleTriggerForm({
  trigger,
  onChange,
  errors,
}: TriggerFormProps<WorkflowScheduleTrigger>) {
  const warnings = useMemo(
    () => (trigger.cron ? cronWarnings(trigger.cron) : []),
    [trigger.cron]
  );

  return (
    <>
      <Field
        label="Cron (UTC)"
        hint="Standard 5-field cron. The evaluator runs every 5 minutes."
        error={errors?.cron}
      >
        <Input
          value={trigger.cron}
          onChange={(e) => onChange({ ...trigger, cron: e.target.value })}
          placeholder="0 9 * * *"
          className="font-mono text-xs"
        />
      </Field>
      {warnings.length > 0 && (
        <div className="-mt-2 mb-4 rounded-md border border-status-warning-border bg-status-warning-bg px-3 py-2 text-[11px] text-status-warning-fg">
          {warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      )}
      <Field label="Presets">
        <div className="flex flex-col gap-1">
          {CRON_PRESETS.map((p) => (
            <button
              key={p.cron}
              type="button"
              onClick={() => onChange({ ...trigger, cron: p.cron })}
              className="flex items-center justify-between rounded-md border border-border bg-card px-2.5 py-1.5 text-left text-xs transition-colors hover:border-primary"
            >
              <span>{p.label}</span>
              <code className="font-mono text-[11px] text-muted-foreground">
                {p.cron}
              </code>
            </button>
          ))}
        </div>
      </Field>
    </>
  );
}

interface WebhookTriggerFormProps extends TriggerFormProps<WorkflowWebhookTrigger> {
  webhookBaseUrl?: string;
}

export function WebhookTriggerForm({
  trigger,
  webhookBaseUrl,
}: WebhookTriggerFormProps) {
  const fullUrl = trigger.token
    ? `${webhookBaseUrl ?? ""}/webhooks/workflows/${trigger.token}`
    : null;

  function copy() {
    if (!fullUrl) return;
    void navigator.clipboard.writeText(fullUrl);
    toast.success("URL copied");
  }

  if (!trigger.token) {
    return (
      <div className="rounded-md border border-dashed border-border bg-card p-3 text-[11px] text-muted-foreground">
        The webhook token is generated on save. Save the workflow to reveal the URL.
      </div>
    );
  }

  return (
    <>
      <Field
        label="Webhook URL"
        hint="Removing and re-adding the trigger generates a new token."
      >
        <div className="flex items-center gap-1.5">
          <Input
            readOnly
            value={fullUrl ?? ""}
            className="font-mono text-[11px]"
            onFocus={(e) => e.currentTarget.select()}
          />
          <Button variant="outline" size="icon" onClick={copy} type="button">
            <Copy className="size-3.5" />
          </Button>
        </div>
      </Field>
      <p className="text-[11px] text-muted-foreground">
        POST any JSON body. It becomes{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono">event.payload</code>.
        Pass{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono">
          X-Idempotency-Key
        </code>{" "}
        for safe retries.
      </p>
    </>
  );
}

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

