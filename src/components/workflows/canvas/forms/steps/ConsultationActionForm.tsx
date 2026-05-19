"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CONSULTATION_ACTION_OPERATIONS,
  WORKFLOW_STEP_ACTOR_ROLES,
  type ConsultationActionOperation,
  type ConsultationActionStep,
  type WorkflowStepActor,
  type WorkflowStepActorRole,
} from "@/types";
import { Field, TemplatedField } from "../Field";
import { Collapsible } from "./shared";
import type { StepFormProps } from "./types";

export function ConsultationActionForm(props: StepFormProps<ConsultationActionStep>) {
  const { step, onChange, errors } = props;

  function patchActor(patch: Partial<WorkflowStepActor>) {
    const next: WorkflowStepActor = { ...(step.actor ?? {}), ...patch };
    // Strip empty strings so we don't send `{ actorId: "" }` to the API.
    const cleaned: WorkflowStepActor = {};
    if (next.actorId) cleaned.actorId = next.actorId;
    if (next.actorName) cleaned.actorName = next.actorName;
    if (next.actorRole) cleaned.actorRole = next.actorRole;
    onChange({
      ...step,
      actor: Object.keys(cleaned).length ? cleaned : undefined,
    });
  }

  return (
    <>
      <Field label="Operation" error={errors?.operation}>
        <Select
          value={step.operation ?? ""}
          onValueChange={(v) => {
            if (v)
              onChange({
                ...step,
                operation: v as ConsultationActionOperation,
              });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select operation" />
          </SelectTrigger>
          <SelectContent>
            {CONSULTATION_ACTION_OPERATIONS.map((op) => (
              <SelectItem key={op} value={op}>
                {op}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <TemplatedField
        label="Consultation id"
        value={step.consultationId ?? ""}
        onChange={(v) => onChange({ ...step, consultationId: v })}
        placeholder="{{event.payload.consultationId}}"
        error={errors?.consultationId}
      />

      {step.operation === "reschedule" && (
        <>
          <TemplatedField
            label="Scheduled at"
            value={step.scheduledAt ?? ""}
            onChange={(v) => onChange({ ...step, scheduledAt: v })}
            placeholder="2026-05-20T10:00:00Z"
            hint="ISO-8601 datetime or template."
            error={errors?.scheduledAt}
          />
          <Field label="Duration (minutes, optional)" error={errors?.durationMinutes}>
            <Input
              type="number"
              min={1}
              max={1440}
              value={step.durationMinutes ?? ""}
              onChange={(e) => {
                const n = e.target.value ? Number(e.target.value) : undefined;
                onChange({
                  ...step,
                  durationMinutes:
                    typeof n === "number" && Number.isFinite(n) ? n : undefined,
                });
              }}
              placeholder="30"
              className="font-mono text-xs"
            />
          </Field>
          <TemplatedField
            label="Doctor id (optional)"
            value={step.doctorId ?? ""}
            onChange={(v) => onChange({ ...step, doctorId: v ? v : undefined })}
            placeholder="{{vars.doctorId}}"
            error={errors?.doctorId}
          />
          <TemplatedField
            label="Doctor name (optional)"
            value={step.doctorName ?? ""}
            onChange={(v) => onChange({ ...step, doctorName: v ? v : undefined })}
            placeholder="Dr Smith"
            error={errors?.doctorName}
          />
          <Field label="Skip conflict check">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={!!step.skipConflictCheck}
                onChange={(e) =>
                  onChange({
                    ...step,
                    skipConflictCheck: e.target.checked ? true : undefined,
                  })
                }
              />
              Allow rescheduling even if it conflicts
            </label>
          </Field>
        </>
      )}

      {step.operation === "complete" && (
        <>
          <TemplatedField
            label="Outcome (optional)"
            value={step.outcome ?? ""}
            onChange={(v) => onChange({ ...step, outcome: v ? v : undefined })}
            placeholder="prescribed"
            error={errors?.outcome}
          />
          <Field label="Notes (optional)" error={errors?.notes}>
            <Textarea
              value={step.notes ?? ""}
              onChange={(e) =>
                onChange({
                  ...step,
                  notes: e.target.value ? e.target.value : undefined,
                })
              }
              rows={3}
            />
          </Field>
        </>
      )}

      <Field
        label="Store as"
        hint="Available later as {{vars.<storeAs>}}."
        error={errors?.storeAs}
      >
        <Input
          value={step.storeAs ?? ""}
          onChange={(e) => onChange({ ...step, storeAs: e.target.value })}
          placeholder="result"
          className="font-mono text-xs"
        />
      </Field>

      <Collapsible label="Actor (optional)">
        <p className="mb-3 text-[11px] text-muted-foreground">
          Stamped on activity / audit records for this change. When omitted, the backend
          records this as “System”.
        </p>
        <TemplatedField
          label="Actor id"
          value={step.actor?.actorId ?? ""}
          onChange={(v) => patchActor({ actorId: v })}
          placeholder="{{event.payload.userId}}"
        />
        <TemplatedField
          label="Actor name"
          value={step.actor?.actorName ?? ""}
          onChange={(v) => patchActor({ actorName: v })}
          placeholder="Dr Smith"
        />
        <Field label="Actor role">
          <Select
            value={step.actor?.actorRole ?? ""}
            onValueChange={(v) =>
              v && patchActor({ actorRole: v as WorkflowStepActorRole })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {WORKFLOW_STEP_ACTOR_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </Collapsible>
    </>
  );
}
