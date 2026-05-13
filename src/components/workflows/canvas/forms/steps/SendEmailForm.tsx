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
import type { SendEmailAttachment, SendEmailStep } from "@/types";
import { Field, TemplatedField } from "../Field";
import { KeyValueEditor, StringListEditor } from "./shared";
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
        // eslint-disable-next-line react-doctor/no-array-index-as-key
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
  return (
    <>
      <TemplatedField
        label="To"
        value={step.to ?? ""}
        onChange={(v) => onChange({ ...step, to: v })}
        placeholder="{{vars.patient.email}}"
        error={errors?.to}
      />
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
          onChange={(e) => onChange({ ...step, fromName: e.target.value || undefined })}
          placeholder="Cloud Care Pharmacy"
        />
      </Field>
      <Field label="Reply-To (optional)" error={errors?.replyTo}>
        <Input
          value={step.replyTo ?? ""}
          onChange={(e) => onChange({ ...step, replyTo: e.target.value || undefined })}
          placeholder="reply@cloudcare.example"
          className="font-mono text-xs"
        />
      </Field>
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
      <TemplatedField
        label="Subject"
        value={step.subject ?? ""}
        onChange={(v) => onChange({ ...step, subject: v })}
        placeholder="Reminder: your appointment tomorrow"
        error={errors?.subject}
      />
      <SendEmailContent step={step} onChange={onChange} errors={errors} />
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
    </>
  );
}
