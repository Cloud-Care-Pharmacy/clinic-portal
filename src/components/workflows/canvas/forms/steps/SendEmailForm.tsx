"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTemplate, useTemplates } from "@/lib/hooks/use-templates";
import type { EmailTemplate, SendEmailAttachment, SendEmailStep } from "@/types";
import { Field, TemplatedField } from "../Field";
import {
  Collapsible,
  KeyValueEditor,
  StringListEditor,
  VariablesEditor,
} from "./shared";
import type { StepFormProps } from "./types";

function SendEmailContent({ step, onChange, errors }: StepFormProps<SendEmailStep>) {
  // Derive content type from existing data: any html value (even empty string)
  // means HTML mode; otherwise text mode.
  const contentType: "text" | "html" = step.html !== undefined ? "html" : "text";
  return (
    <>
      <Field label="Content type">
        <Select
          value={contentType}
          onValueChange={(v) => {
            if (!v) return;
            if (v === "html") {
              onChange({ ...step, text: undefined, html: step.html ?? "" });
            } else {
              onChange({ ...step, html: undefined, text: step.text ?? "" });
            }
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Plain text</SelectItem>
            <SelectItem value="html">HTML</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      {contentType === "html" ? (
        <TemplatedField
          label="HTML body"
          value={step.html ?? ""}
          onChange={(v) => onChange({ ...step, html: v })}
          multiline
          rows={5}
          monospace
          error={errors?.html}
        />
      ) : (
        <TemplatedField
          label="Text body"
          value={step.text ?? ""}
          onChange={(v) => onChange({ ...step, text: v })}
          multiline
          rows={5}
          error={errors?.text}
        />
      )}
    </>
  );
}

function AttachmentsEditor({
  values,
  onChange,
}: {
  values: SendEmailAttachment[] | undefined;
  onChange: (next: SendEmailAttachment[] | undefined) => void;
}) {
  const list = values ?? [];
  function update(next: SendEmailAttachment[]) {
    onChange(next.length ? next : undefined);
  }
  return (
    <div className="flex flex-col gap-1.5">
      {list.map((a, i) => (
        // Append/remove-from-end editor; stable ids would require restructuring
        // the SendEmailAttachment[] controlled-component API.
        <div key={i} className="flex items-center gap-1.5">
          <Input
            value={a.url}
            onChange={(e) => {
              const next = [...list];
              next[i] = { ...next[i], url: e.target.value };
              update(next);
            }}
            placeholder="https://r2.example.com/file.pdf"
            className="font-mono text-xs"
          />
          <Input
            value={a.filename ?? ""}
            onChange={(e) => {
              const next = [...list];
              next[i] = { ...next[i], filename: e.target.value || undefined };
              update(next);
            }}
            placeholder="filename.pdf"
            className="font-mono text-xs"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={() => update(list.filter((_, j) => j !== i))}
            aria-label="Remove attachment"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      {list.length < 10 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit gap-1 text-xs"
          onClick={() => update([...list, { url: "" }])}
        >
          <Plus className="size-3.5" />
          Add attachment
        </Button>
      )}
    </div>
  );
}

export function SendEmailForm(props: StepFormProps<SendEmailStep>) {
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
              // Switching to template mode: clear inline subject/html/text so
              // the template's stored values apply by default.
              onChange({
                ...step,
                templateId: step.templateId ?? "",
                subject: undefined,
                html: undefined,
                text: undefined,
              });
            } else {
              // Switching to inline mode: drop templateId + variables (server
              // rejects `variables` without `templateId`).
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
        placeholder="{{vars.patient.email}}"
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
}: StepFormProps<SendEmailStep>) {
  const { data: templates, isLoading } = useTemplates("email", { active: true });
  // Selected template details give us its declared variable bindings.
  const selectedId = step.templateId || undefined;
  const { data: selected } = useTemplate(selectedId);
  return (
    <>
      <Field
        label="Template"
        hint="Active email templates. The template's subject/body apply unless overridden below."
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
              .filter((t): t is EmailTemplate => t.type === "email" && t.active)
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
            selected && selected.type === "email" ? selected.variables : undefined
          }
          values={step.variables}
          onChange={(variables) => onChange({ ...step, variables })}
          error={errors?.variables}
        />
      ) : null}

      <Collapsible label="Overrides (optional)">
        <p className="-mt-1 mb-3 text-[11px] text-muted-foreground">
          Inline subject/body/from/replyTo replace the template values. Cc and
          Bcc lists merge with the template (de-duped). Reserved headers
          (to/from/cc/bcc/subject/reply-to/authorization/idempotency-key/etc.)
          cannot be set via custom headers.
        </p>
        <SubjectField step={step} onChange={onChange} errors={errors} />
        <SendEmailContent step={step} onChange={onChange} errors={errors} />
        <SenderFields step={step} onChange={onChange} errors={errors} />
        <RecipientFields step={step} onChange={onChange} errors={errors} />
        <HeadersField step={step} onChange={onChange} errors={errors} />
        <AttachmentsField step={step} onChange={onChange} errors={errors} />
      </Collapsible>
    </>
  );
}

function InlineModeFields({
  step,
  onChange,
  errors,
}: StepFormProps<SendEmailStep>) {
  return (
    <>
      <SubjectField step={step} onChange={onChange} errors={errors} required />
      <SendEmailContent step={step} onChange={onChange} errors={errors} />
      <SenderFields step={step} onChange={onChange} errors={errors} />
      <RecipientFields step={step} onChange={onChange} errors={errors} />
      <HeadersField step={step} onChange={onChange} errors={errors} />
      <AttachmentsField step={step} onChange={onChange} errors={errors} />
    </>
  );
}

function SubjectField({
  step,
  onChange,
  errors,
  required,
}: StepFormProps<SendEmailStep> & { required?: boolean }) {
  return (
    <TemplatedField
      label={required ? "Subject" : "Subject (override)"}
      value={step.subject ?? ""}
      onChange={(v) =>
        onChange({ ...step, subject: v === "" && !required ? undefined : v })
      }
      placeholder={
        required
          ? "Reminder: your appointment tomorrow"
          : "Leave blank to use the template's subject"
      }
      error={errors?.subject}
    />
  );
}

function SenderFields({ step, onChange, errors }: StepFormProps<SendEmailStep>) {
  return (
    <>
      <Field
        label="From (optional)"
        hint="Override the configured sender address."
        error={errors?.from}
      >
        <Input
          value={step.from ?? ""}
          onChange={(e) => onChange({ ...step, from: e.target.value || undefined })}
          placeholder="alerts@cloudcare.example"
          className="font-mono text-xs"
        />
      </Field>
      <Field
        label="From name (optional)"
        hint='Display name composed into "From" as "Name <addr>".'
        error={errors?.fromName}
      >
        <Input
          value={step.fromName ?? ""}
          onChange={(e) =>
            onChange({ ...step, fromName: e.target.value || undefined })
          }
          placeholder="Cloud Care Pharmacy"
        />
      </Field>
      <Field label="Reply-To (optional)" error={errors?.replyTo}>
        <Input
          value={step.replyTo ?? ""}
          onChange={(e) =>
            onChange({ ...step, replyTo: e.target.value || undefined })
          }
          placeholder="reply@cloudcare.example"
          className="font-mono text-xs"
        />
      </Field>
    </>
  );
}

function RecipientFields({ step, onChange, errors }: StepFormProps<SendEmailStep>) {
  return (
    <>
      <Field label="Cc (optional)" hint="Up to 50 recipients." error={errors?.cc}>
        <StringListEditor
          values={step.cc}
          onChange={(cc) => onChange({ ...step, cc })}
          placeholder="{{vars.team.email}}"
          addLabel="Add Cc"
          monospace
          max={50}
        />
      </Field>
      <Field label="Bcc (optional)" hint="Up to 50 recipients." error={errors?.bcc}>
        <StringListEditor
          values={step.bcc}
          onChange={(bcc) => onChange({ ...step, bcc })}
          placeholder="audit@cloudcare.example"
          addLabel="Add Bcc"
          monospace
          max={50}
        />
      </Field>
    </>
  );
}

function HeadersField({ step, onChange, errors }: StepFormProps<SendEmailStep>) {
  return (
    <Field
      label="Custom headers (optional)"
      hint="X-* headers only. Reserved names (To/From/Cc/Bcc/Reply-To/Subject/Authorization/Idempotency-Key/Content-Type/MIME-Version/Message-ID/Date) are rejected."
      error={errors?.headers}
    >
      <KeyValueEditor
        values={step.headers}
        onChange={(headers) => onChange({ ...step, headers })}
        keyPlaceholder="X-Tenant-Id"
        valuePlaceholder="{{vars.tenant.id}}"
        addLabel="Add header"
      />
    </Field>
  );
}

function AttachmentsField({ step, onChange, errors }: StepFormProps<SendEmailStep>) {
  return (
    <Field
      label="Attachments (optional)"
      hint="Up to 10 URL-referenced attachments. The provider downloads each URL."
      error={errors?.attachments}
    >
      <AttachmentsEditor
        values={step.attachments}
        onChange={(attachments) => onChange({ ...step, attachments })}
      />
    </Field>
  );
}

