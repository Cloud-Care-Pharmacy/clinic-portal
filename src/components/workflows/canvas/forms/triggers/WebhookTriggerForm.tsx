"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "../Field";
import type { WorkflowWebhookTrigger } from "@/types";
import type { TriggerFormProps } from "./types";

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
    toast.success("Link copied");
  }

  if (!trigger.token) {
    return (
      <div className="rounded-sm border border-dashed border-border bg-card p-3 text-[11px] text-muted-foreground">
        Save the workflow to generate the link.
      </div>
    );
  }

  return (
    <Field
      label="Trigger link"
      hint="Share this link with the system that should start the workflow. Replace the trigger to generate a new link."
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
  );
}
