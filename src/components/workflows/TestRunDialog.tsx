"use client";

import { useId, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTriggerWorkflow, WorkflowApiError } from "@/lib/hooks/use-workflows";
import type { Workflow } from "@/types";

interface TestRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow: Workflow;
  /** Called once the trigger has been published, before the run id is known. */
  onTriggered?: () => void;
}

function defaultEventType(workflow: Workflow): string {
  const evt = workflow.triggers.find((t) => t.kind === "event");
  if (evt && evt.kind === "event") return evt.eventType;
  return workflow.triggerEventType ?? "manual.run";
}

function newIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `manual-${crypto.randomUUID()}`;
  }
  return `manual-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function TestRunDialog({
  open,
  onOpenChange,
  workflow,
  onTriggered,
}: TestRunDialogProps) {
  const eventTypeId = useId();
  const idempotencyId = useId();
  const payloadId = useId();
  const trigger = useTriggerWorkflow();

  const [eventType, setEventType] = useState(() => defaultEventType(workflow));
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [payloadText, setPayloadText] = useState("{}");

  const payloadError = useMemo(() => {
    if (!payloadText.trim()) return null;
    try {
      const v = JSON.parse(payloadText);
      if (v === null || typeof v !== "object" || Array.isArray(v)) {
        return "Payload must be a JSON object.";
      }
      return null;
    } catch {
      return "Invalid JSON.";
    }
  }, [payloadText]);

  function reset() {
    setEventType(defaultEventType(workflow));
    setIdempotencyKey(newIdempotencyKey());
    setPayloadText("{}");
  }

  async function submit() {
    if (payloadError) return;
    try {
      const payload = payloadText.trim() ? JSON.parse(payloadText) : {};
      await trigger.mutateAsync({
        entityId: workflow.entityId,
        eventType: eventType.trim(),
        idempotencyKey: idempotencyKey.trim() || newIdempotencyKey(),
        payload,
      });
      toast.success("Trigger published", {
        description: "The run will appear in the Live run tab shortly.",
      });
      onTriggered?.();
      onOpenChange(false);
      reset();
    } catch (err) {
      const message =
        err instanceof WorkflowApiError ? err.message : "Failed to trigger workflow";
      toast.error(message);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Test run</DialogTitle>
          <DialogDescription>
            Publishes a synthetic event so the workflow runs end-to-end.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor={eventTypeId}>Event type</Label>
            <Input
              id={eventTypeId}
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="mt-1 font-mono text-xs"
            />
          </div>
          <div>
            <Label htmlFor={idempotencyId}>Idempotency key</Label>
            <div className="mt-1 flex gap-1.5">
              <Input
                id={idempotencyId}
                value={idempotencyKey}
                onChange={(e) => setIdempotencyKey(e.target.value)}
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIdempotencyKey(newIdempotencyKey())}
              >
                New
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor={payloadId}>Payload (JSON)</Label>
            <Textarea
              id={payloadId}
              value={payloadText}
              onChange={(e) => setPayloadText(e.target.value)}
              rows={6}
              className="mt-1 font-mono text-xs"
            />
            {payloadError && (
              <p className="mt-1 text-[11px] font-medium text-destructive">
                {payloadError}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={trigger.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={trigger.isPending || Boolean(payloadError)}
          >
            {trigger.isPending ? "Publishing…" : "Publish event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
