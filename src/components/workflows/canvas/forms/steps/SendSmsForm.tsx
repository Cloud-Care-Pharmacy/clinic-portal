"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTemplate, useTemplates } from "@/lib/hooks/use-templates";
import type { SendSmsStep, SmsTemplate } from "@/types";
import { Field, TemplatedField } from "../Field";
import { Collapsible, VariablesEditor } from "./shared";
import type { StepFormProps } from "./types";

export function SendSmsForm(props: StepFormProps<SendSmsStep>) {
  const { step, onChange, errors } = props;
  const mode: "template" | "inline" = step.templateId ? "template" : "inline";
  return (
    <>
      <Field label="Source">
        <Select
          value={mode}
          onValueChange={(v) => {
            if (!v) return;
            if (v === "template") {
              // Switching to template mode: clear inline body so the
              // template's stored body applies by default.
              onChange({
                ...step,
                templateId: step.templateId ?? "",
                body: undefined,
              });
            } else {
              // Switching to inline mode: drop templateId + variables
              // (server rejects `variables` without `templateId`).
              onChange({
                ...step,
                templateId: undefined,
                variables: undefined,
              });
            }
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="template">Use template</SelectItem>
            <SelectItem value="inline">Compose inline</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <TemplatedField
        label="To"
        value={step.to ?? ""}
        onChange={(v) => onChange({ ...step, to: v })}
        placeholder="{{vars.patient.phone}}"
        error={errors?.to}
      />

      {mode === "template" ? (
        <TemplateModeFields step={step} onChange={onChange} errors={errors} />
      ) : (
        <InlineModeFields step={step} onChange={onChange} errors={errors} />
      )}
    </>
  );
}

function TemplateModeFields({
  step,
  onChange,
  errors,
}: StepFormProps<SendSmsStep>) {
  const { data: templates, isLoading } = useTemplates("sms", { active: true });
  const selectedId = step.templateId || undefined;
  const { data: selected } = useTemplate(selectedId);
  return (
    <>
      <Field
        label="Template"
        hint="Active SMS templates. The template's body applies unless overridden below."
        error={errors?.templateId}
      >
        <Select
          value={step.templateId || undefined}
          onValueChange={(v) => {
            if (!v) return;
            onChange({ ...step, templateId: v });
          }}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={isLoading ? "Loading…" : "Select a template"}
            >
              {(value: unknown) => {
                if (!value || typeof value !== "string") return null;
                const match = templates.find((t) => t.id === value);
                return match?.name ?? selected?.name ?? value;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {templates
              .filter((t): t is SmsTemplate => t.type === "sms" && t.active)
              .map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </Field>

      {selectedId ? (
        <VariablesEditor
          declared={
            selected && selected.type === "sms" ? selected.variables : undefined
          }
          values={step.variables}
          onChange={(variables) => onChange({ ...step, variables })}
          error={errors?.variables}
        />
      ) : null}

      <Collapsible label="Overrides (optional)">
        <p className="-mt-1 mb-3 text-[11px] text-muted-foreground">
          Inline <code>body</code> replaces the template body. <code>from</code>{" "}
          resolves to: inline → template <code>senderId</code> → provider
          default.
        </p>
        <BodyField step={step} onChange={onChange} errors={errors} />
        <FromField step={step} onChange={onChange} errors={errors} />
      </Collapsible>
    </>
  );
}

function InlineModeFields({
  step,
  onChange,
  errors,
}: StepFormProps<SendSmsStep>) {
  return (
    <>
      <BodyField step={step} onChange={onChange} errors={errors} required />
      <FromField step={step} onChange={onChange} errors={errors} />
    </>
  );
}

function BodyField({
  step,
  onChange,
  errors,
  required,
}: StepFormProps<SendSmsStep> & { required?: boolean }) {
  return (
    <TemplatedField
      label={required ? "Body" : "Body (override)"}
      value={step.body ?? ""}
      onChange={(v) =>
        onChange({ ...step, body: v === "" && !required ? undefined : v })
      }
      placeholder={
        required
          ? "Hi {{vars.patient.firstName}}, your appointment is tomorrow."
          : "Leave blank to use the template's body"
      }
      multiline
      rows={4}
      hint="Max 1600 characters after interpolation."
      error={errors?.body}
    />
  );
}

function FromField({ step, onChange, errors }: StepFormProps<SendSmsStep>) {
  return (
    <Field
      label="From (optional)"
      hint='Sender ID. Falls back to the template\u2019s senderId, then the provider default.'
      error={errors?.from}
    >
      <Input
        value={step.from ?? ""}
        onChange={(e) => onChange({ ...step, from: e.target.value || undefined })}
        placeholder="CloudCare"
        className="font-mono text-xs"
      />
    </Field>
  );
}
