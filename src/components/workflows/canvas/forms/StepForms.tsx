"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, TemplatedField } from "./Field";
import {
  BRANCH_OPS,
  isUnaryBranchOp,
  RECORD_ACTIVITY_STEP_ENTITY_TYPES,
  RECORD_ACTIVITY_STEP_TYPES,
  type RecordActivityStepEntityType,
  type RecordActivityStepType,
} from "@/types";
import type {
  BranchIfStep,
  CallWorkflowStep,
  HttpCallAuth,
  HttpCallStep,
  LookupConsultationStep,
  LookupPatientStep,
  LoopOnItemsStep,
  RecordActivityStep,
  RouterStep,
  SendEmailAttachment,
  SendEmailStep,
  SendSmsStep,
  WaitForEventStep,
  WaitStep,
  Workflow,
  WorkflowBranchOp,
  WorkflowRouterBranch,
  WorkflowStep,
  WorkflowStepKind,
  WorkflowStepCaptureMode,
  WorkflowStepRetryPolicy,
} from "@/types";

type StepErrors = Record<string, string | undefined>;

interface StepFormProps<T extends WorkflowStep> {
  step: T;
  onChange: (next: T) => void;
  errors?: StepErrors;
  /** Other steps (used for branch_if target picker). */
  otherSteps?: { id: string; label: string }[];
  /** Other workflows (used for call_workflow picker). */
  otherWorkflows?: Workflow[];
}

// ---- shared helpers ----

function StringListEditor({
  values,
  onChange,
  placeholder,
  addLabel,
  monospace,
  max,
}: {
  values: string[] | undefined;
  onChange: (next: string[] | undefined) => void;
  placeholder?: string;
  addLabel: string;
  monospace?: boolean;
  max?: number;
}) {
  const list = values ?? [];
  function update(next: string[]) {
    onChange(next.length ? next : undefined);
  }
  return (
    <div className="flex flex-col gap-1.5">
      {list.map((v, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Input
            value={v}
            onChange={(e) => {
              const next = [...list];
              next[i] = e.target.value;
              update(next);
            }}
            placeholder={placeholder}
            className={monospace ? "font-mono text-xs" : undefined}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={() => update(list.filter((_, j) => j !== i))}
            aria-label="Remove"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      {(max === undefined || list.length < max) && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit gap-1 text-xs"
          onClick={() => update([...list, ""])}
        >
          <Plus className="size-3.5" />
          {addLabel}
        </Button>
      )}
    </div>
  );
}

function KeyValueEditor({
  values,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
  addLabel,
}: {
  values: Record<string, string> | undefined;
  onChange: (next: Record<string, string> | undefined) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  addLabel: string;
}) {
  const entries = Object.entries(values ?? {});
  function update(next: [string, string][]) {
    if (next.length === 0) {
      onChange(undefined);
      return;
    }
    const obj: Record<string, string> = {};
    for (const [k, v] of next) {
      if (k) obj[k] = v;
    }
    onChange(Object.keys(obj).length ? obj : undefined);
  }
  return (
    <div className="flex flex-col gap-1.5">
      {entries.map(([k, v], i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Input
            value={k}
            onChange={(e) => {
              const next: [string, string][] = entries.map((p, j) =>
                j === i ? [e.target.value, p[1]] : p
              );
              update(next);
            }}
            placeholder={keyPlaceholder ?? "key"}
            className="font-mono text-xs"
          />
          <Input
            value={v}
            onChange={(e) => {
              const next: [string, string][] = entries.map((p, j) =>
                j === i ? [p[0], e.target.value] : p
              );
              update(next);
            }}
            placeholder={valuePlaceholder ?? "value"}
            className="font-mono text-xs"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={() => update(entries.filter((_, j) => j !== i))}
            aria-label="Remove"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-fit gap-1 text-xs"
        onClick={() => update([...entries, ["", ""]])}
      >
        <Plus className="size-3.5" />
        {addLabel}
      </Button>
    </div>
  );
}

function StepIdField({ step, onChange, errors }: StepFormProps<WorkflowStep>) {
  return (
    <Field
      label="Step id (optional)"
      hint="Use as a goto target from a branch step. Letters, digits, _ or -."
      error={errors?.id}
    >
      <Input
        value={step.id ?? ""}
        onChange={(e) =>
          onChange({ ...step, id: e.target.value || undefined } as WorkflowStep)
        }
        placeholder="auto"
        className="font-mono text-xs"
      />
    </Field>
  );
}

function SendEmailForm(props: StepFormProps<SendEmailStep>) {
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
      <TemplatedField
        label="Text body"
        value={step.text ?? ""}
        onChange={(v) => onChange({ ...step, text: v })}
        multiline
        rows={5}
        error={errors?.text}
      />
      <TemplatedField
        label="HTML body (optional)"
        value={step.html ?? ""}
        onChange={(v) => onChange({ ...step, html: v })}
        multiline
        rows={4}
        monospace
        error={errors?.html}
      />
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
      <StepIdField {...(props as StepFormProps<WorkflowStep>)} />
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

function SendSmsForm(props: StepFormProps<SendSmsStep>) {
  const { step, onChange, errors } = props;
  return (
    <>
      <TemplatedField
        label="To"
        value={step.to ?? ""}
        onChange={(v) => onChange({ ...step, to: v })}
        placeholder="{{vars.patient.phone}}"
        error={errors?.to}
      />
      <TemplatedField
        label="Body"
        value={step.body ?? ""}
        onChange={(v) => onChange({ ...step, body: v })}
        multiline
        rows={4}
        error={errors?.body}
      />
      <StepIdField {...(props as StepFormProps<WorkflowStep>)} />
    </>
  );
}

function WaitForm(props: StepFormProps<WaitStep>) {
  const { step, onChange, errors } = props;
  return (
    <>
      <Field
        label="Seconds"
        hint="1 to 2,592,000 (30 days). Run pauses; cron sweeper resumes it."
        error={errors?.seconds}
      >
        <Input
          type="number"
          min={1}
          max={2_592_000}
          value={step.seconds ?? 0}
          onChange={(e) => onChange({ ...step, seconds: Number(e.target.value) || 0 })}
        />
      </Field>
      <StepIdField {...(props as StepFormProps<WorkflowStep>)} />
    </>
  );
}

function WaitForEventForm(props: StepFormProps<WaitForEventStep>) {
  const { step, onChange, errors } = props;
  return (
    <>
      <Field label="Event type" error={errors?.eventType}>
        <Input
          value={step.eventType ?? ""}
          onChange={(e) => onChange({ ...step, eventType: e.target.value })}
          placeholder="patient.replied"
          className="font-mono text-xs"
        />
      </Field>
      <Field
        label="Timeout (seconds, optional)"
        hint="If set and no matching event arrives, the step fails."
        error={errors?.timeoutSeconds}
      >
        <Input
          type="number"
          min={1}
          max={2_592_000}
          value={step.timeoutSeconds ?? ""}
          onChange={(e) =>
            onChange({
              ...step,
              timeoutSeconds: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        />
      </Field>
      <StepIdField {...(props as StepFormProps<WorkflowStep>)} />
    </>
  );
}

function BranchIfForm(props: StepFormProps<BranchIfStep>) {
  const { step, onChange, errors, otherSteps = [] } = props;
  const targets = [{ id: "", label: "(fall through)" }, ...otherSteps];
  return (
    <>
      <TemplatedField
        label="Left"
        value={step.left ?? ""}
        onChange={(v) => onChange({ ...step, left: v })}
        placeholder="{{vars.outreach.outcome}}"
        error={errors?.left}
      />
      <Field label="Operator" error={errors?.op}>
        <Select
          value={step.op}
          onValueChange={(v) => v && onChange({ ...step, op: v as BranchIfStep["op"] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BRANCH_OPS.map((op) => (
              <SelectItem key={op.value} value={op.value}>
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      {!isUnaryBranchOp(step.op) && (
        <TemplatedField
          label="Right"
          value={step.right ?? ""}
          onChange={(v) => onChange({ ...step, right: v })}
          placeholder='"reached"'
          error={errors?.right}
        />
      )}
      <Field label="Goto if true" hint="Pick a step id to jump to.">
        <Select
          value={step.gotoIfTrue ?? ""}
          onValueChange={(v) => onChange({ ...step, gotoIfTrue: v || undefined })}
        >
          <SelectTrigger>
            <SelectValue placeholder="(fall through)" />
          </SelectTrigger>
          <SelectContent>
            {targets.map((t) => (
              <SelectItem key={t.id || "_"} value={t.id || "_none"}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Goto if false">
        <Select
          value={step.gotoIfFalse ?? ""}
          onValueChange={(v) => onChange({ ...step, gotoIfFalse: v || undefined })}
        >
          <SelectTrigger>
            <SelectValue placeholder="(fall through)" />
          </SelectTrigger>
          <SelectContent>
            {targets.map((t) => (
              <SelectItem key={t.id || "_"} value={t.id || "_none"}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <StepIdField {...(props as StepFormProps<WorkflowStep>)} />
    </>
  );
}

function LookupPatientForm(props: StepFormProps<LookupPatientStep>) {
  const { step, onChange, errors } = props;
  return (
    <>
      <TemplatedField
        label="Patient id"
        value={step.patientId ?? ""}
        onChange={(v) => onChange({ ...step, patientId: v })}
        placeholder="{{event.payload.patientId}}"
        error={errors?.patientId}
      />
      <Field
        label="Store as"
        hint="Available later as {{vars.<storeAs>}}."
        error={errors?.storeAs}
      >
        <Input
          value={step.storeAs ?? ""}
          onChange={(e) => onChange({ ...step, storeAs: e.target.value })}
          placeholder="patient"
          className="font-mono text-xs"
        />
      </Field>
      <StepIdField {...(props as StepFormProps<WorkflowStep>)} />
    </>
  );
}

function LookupConsultationForm(props: StepFormProps<LookupConsultationStep>) {
  const { step, onChange, errors } = props;
  return (
    <>
      <TemplatedField
        label="Consultation id"
        value={step.consultationId ?? ""}
        onChange={(v) => onChange({ ...step, consultationId: v })}
        placeholder="{{event.payload.consultationId}}"
        error={errors?.consultationId}
      />
      <Field label="Store as" error={errors?.storeAs}>
        <Input
          value={step.storeAs ?? ""}
          onChange={(e) => onChange({ ...step, storeAs: e.target.value })}
          placeholder="consult"
          className="font-mono text-xs"
        />
      </Field>
      <StepIdField {...(props as StepFormProps<WorkflowStep>)} />
    </>
  );
}

function RecordActivityForm(props: StepFormProps<RecordActivityStep>) {
  const { step, onChange, errors } = props;
  return (
    <>
      <TemplatedField
        label="Patient id"
        value={step.patientId ?? ""}
        onChange={(v) => onChange({ ...step, patientId: v })}
        error={errors?.patientId}
      />
      <Field label="Type" error={errors?.type}>
        <Select
          value={step.type ?? ""}
          onValueChange={(v) => {
            if (v) onChange({ ...step, type: v as RecordActivityStepType });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select activity type" />
          </SelectTrigger>
          <SelectContent>
            {RECORD_ACTIVITY_STEP_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Entity type" error={errors?.entityType}>
        <Select
          value={step.entityType ?? ""}
          onValueChange={(v) => {
            if (v)
              onChange({
                ...step,
                entityType: v as RecordActivityStepEntityType,
              });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select entity type" />
          </SelectTrigger>
          <SelectContent>
            {RECORD_ACTIVITY_STEP_ENTITY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <TemplatedField
        label="Title"
        value={step.title ?? ""}
        onChange={(v) => onChange({ ...step, title: v })}
        error={errors?.title}
      />
      <TemplatedField
        label="Description (optional)"
        value={step.description ?? ""}
        onChange={(v) => onChange({ ...step, description: v })}
        multiline
        rows={3}
        error={errors?.description}
      />
      <StepIdField {...(props as StepFormProps<WorkflowStep>)} />
    </>
  );
}

function HttpCallForm(props: StepFormProps<HttpCallStep>) {
  const { step, onChange, errors } = props;
  const auth: HttpCallAuth = step.auth ?? { type: "none" };
  return (
    <>
      <Field label="Method" error={errors?.method}>
        <Select
          value={step.method ?? "GET"}
          onValueChange={(v) =>
            v && onChange({ ...step, method: v as HttpCallStep["method"] })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["GET", "POST", "PUT", "PATCH", "DELETE"] as const).map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <TemplatedField
        label="URL"
        value={step.url ?? ""}
        onChange={(v) => onChange({ ...step, url: v })}
        placeholder="https://example.com/hook"
        hint="Only public https:// URLs are allowed. Cloud metadata and private IP ranges (e.g. 169.254.169.254, 10.0.0.0/8) are blocked."
        monospace
        error={errors?.url}
      />
      <Field
        label="Query params (optional)"
        hint="Templated values appended to the URL after template resolution."
        error={errors?.queryParams}
      >
        <KeyValueEditor
          values={step.queryParams}
          onChange={(queryParams) => onChange({ ...step, queryParams })}
          keyPlaceholder="patientId"
          valuePlaceholder="{{event.payload.patientId}}"
          addLabel="Add param"
        />
      </Field>
      <Field label="Headers (optional)" error={errors?.headers}>
        <KeyValueEditor
          values={step.headers}
          onChange={(headers) => onChange({ ...step, headers })}
          keyPlaceholder="X-Tenant-Id"
          valuePlaceholder="{{vars.tenant.id}}"
          addLabel="Add header"
        />
      </Field>
      <Field label="Auth (optional)">
        <Select
          value={auth.type}
          onValueChange={(v) => {
            if (!v) return;
            if (v === "none") {
              onChange({ ...step, auth: undefined });
            } else if (v === "basic") {
              onChange({
                ...step,
                auth: { type: "basic", username: "", password: "" },
              });
            } else if (v === "bearer") {
              onChange({ ...step, auth: { type: "bearer", token: "" } });
            }
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="bearer">Bearer</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      {auth.type === "basic" && (
        <>
          <TemplatedField
            label="Basic — username"
            value={auth.username}
            onChange={(v) => onChange({ ...step, auth: { ...auth, username: v } })}
            placeholder="{{vars.creds.user}}"
            monospace
          />
          <TemplatedField
            label="Basic — password"
            value={auth.password}
            onChange={(v) => onChange({ ...step, auth: { ...auth, password: v } })}
            placeholder="{{vars.creds.password}}"
            monospace
          />
        </>
      )}
      {auth.type === "bearer" && (
        <TemplatedField
          label="Bearer — token"
          value={auth.token}
          onChange={(v) => onChange({ ...step, auth: { ...auth, token: v } })}
          placeholder="{{vars.token}}"
          monospace
        />
      )}
      <TemplatedField
        label="Body (optional)"
        value={
          typeof step.body === "string"
            ? step.body
            : step.body
              ? JSON.stringify(step.body, null, 2)
              : ""
        }
        onChange={(v) => onChange({ ...step, body: v })}
        multiline
        rows={5}
        monospace
        error={errors?.body}
      />
      <Field
        label="Timeout (ms, optional)"
        hint="100 to 60,000."
        error={errors?.timeoutMs}
      >
        <Input
          type="number"
          min={100}
          max={60_000}
          value={step.timeoutMs ?? ""}
          onChange={(e) =>
            onChange({
              ...step,
              timeoutMs: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          placeholder="30000"
          className="font-mono text-xs"
        />
      </Field>
      <Field label="Follow redirects" hint="Defaults to true.">
        <Select
          value={step.followRedirects === false ? "false" : "true"}
          onValueChange={(v) => {
            if (!v) return;
            onChange({
              ...step,
              followRedirects: v === "false" ? false : undefined,
            });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Follow (default)</SelectItem>
            <SelectItem value="false">Manual (do not follow)</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field
        label="Failure mode"
        hint="Default 'return' stores non-2xx responses; 'throw' fails the run."
      >
        <Select
          value={step.failureMode ?? "return"}
          onValueChange={(v) => {
            if (!v) return;
            onChange({
              ...step,
              failureMode: v === "return" ? undefined : "throw",
            });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="return">Return (default)</SelectItem>
            <SelectItem value="throw">Throw on non-2xx</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Store response as (optional)" error={errors?.storeAs}>
        <Input
          value={step.storeAs ?? ""}
          onChange={(e) => onChange({ ...step, storeAs: e.target.value || undefined })}
          placeholder="response"
          className="font-mono text-xs"
        />
      </Field>
      <Field
        label="Max response bytes (optional)"
        hint="1 to 65,536. Defaults to 16,384."
        error={errors?.maxResponseBytes}
      >
        <Input
          type="number"
          min={1}
          max={65_536}
          value={step.maxResponseBytes ?? ""}
          onChange={(e) =>
            onChange({
              ...step,
              maxResponseBytes: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          placeholder="16384"
          className="font-mono text-xs"
        />
      </Field>
      <StepIdField {...(props as StepFormProps<WorkflowStep>)} />
    </>
  );
}

function CallWorkflowForm(props: StepFormProps<CallWorkflowStep>) {
  const { step, onChange, errors, otherWorkflows = [] } = props;
  return (
    <>
      <Field
        label="Workflow"
        hint="Target workflow must declare a `workflow` trigger and be active."
        error={errors?.workflowId}
      >
        <Select
          value={step.workflowId ?? ""}
          onValueChange={(v) => v && onChange({ ...step, workflowId: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select workflow" />
          </SelectTrigger>
          <SelectContent>
            {otherWorkflows.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Store result as (optional)" error={errors?.storeAs}>
        <Input
          value={step.storeAs ?? ""}
          onChange={(e) => onChange({ ...step, storeAs: e.target.value || undefined })}
          placeholder="subRun"
          className="font-mono text-xs"
        />
      </Field>
      <StepIdField {...(props as StepFormProps<WorkflowStep>)} />
    </>
  );
}

function RouterForm(props: StepFormProps<RouterStep>) {
  const { step, onChange, errors } = props;
  const branches = step.branches ?? [];
  const fallback = step.fallback;

  const updateBranch = (idx: number, next: WorkflowRouterBranch) => {
    const copy = branches.slice();
    copy[idx] = next;
    onChange({ ...step, branches: copy });
  };

  const addBranch = () => {
    onChange({
      ...step,
      branches: [...branches, { name: `Branch ${branches.length + 1}` }],
    });
  };

  const removeBranch = (idx: number) => {
    onChange({
      ...step,
      branches: branches.filter((_, i) => i !== idx),
    });
  };

  const moveBranch = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= branches.length) return;
    const copy = branches.slice();
    const [removed] = copy.splice(idx, 1);
    copy.splice(target, 0, removed);
    onChange({ ...step, branches: copy });
  };

  const setCondition = (idx: number, next: WorkflowRouterBranch["condition"]) =>
    updateBranch(idx, { ...branches[idx], condition: next });

  const enableCondition = (idx: number) => {
    setCondition(idx, { left: "", op: "eq", right: "" });
  };

  const disableCondition = (idx: number) => {
    setCondition(idx, undefined);
  };

  const toggleFallback = (enabled: boolean) => {
    onChange({
      ...step,
      fallback: enabled ? { name: "Otherwise" } : undefined,
    });
  };

  return (
    <>
      <Field
        label="Execution"
        hint="Whether all matching branches run, or only the first."
      >
        <Select
          value={step.executionType ?? "first_match"}
          onValueChange={(v) =>
            v &&
            onChange({
              ...step,
              executionType: v as RouterStep["executionType"],
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="first_match">First match wins</SelectItem>
            <SelectItem value="all_match">Run all matching</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Branches</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={addBranch}
            className="h-7 gap-1 px-2 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Add branch
          </Button>
        </div>

        {branches.map((branch, idx) => (
          <RouterBranchEditor
            key={idx}
            index={idx}
            total={branches.length}
            branch={branch}
            error={errors?.[`branches.${idx}.name`]}
            onChange={(next) => updateBranch(idx, next)}
            onRemove={() => removeBranch(idx)}
            onMove={(dir) => moveBranch(idx, dir)}
            onEnableCondition={() => enableCondition(idx)}
            onDisableCondition={() => disableCondition(idx)}
          />
        ))}

        <FallbackEditor
          fallback={fallback}
          onToggle={toggleFallback}
          onRename={(name) => onChange({ ...step, fallback: { ...fallback, name } })}
        />
      </div>

      <StepIdField {...(props as StepFormProps<WorkflowStep>)} />
    </>
  );
}

interface RouterBranchEditorProps {
  index: number;
  total: number;
  branch: WorkflowRouterBranch;
  error?: string;
  onChange: (next: WorkflowRouterBranch) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onEnableCondition: () => void;
  onDisableCondition: () => void;
}

function RouterBranchEditor({
  index,
  total,
  branch,
  error,
  onChange,
  onRemove,
  onMove,
  onEnableCondition,
  onDisableCondition,
}: RouterBranchEditorProps) {
  const condition = branch.condition;
  const isUnary = condition ? isUnaryBranchOp(condition.op) : false;

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/30 p-3">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <Field label={`Branch ${index + 1} name`} error={error}>
            <Input
              value={branch.name}
              onChange={(e) => onChange({ ...branch, name: e.target.value })}
              placeholder="Branch name"
            />
          </Field>
        </div>
        <div className="mt-6 flex items-center gap-0.5">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7 text-muted-foreground"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            aria-label="Move branch up"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7 text-muted-foreground"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            aria-label="Move branch down"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          {total > 1 && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7 text-muted-foreground"
              onClick={onRemove}
              aria-label="Remove branch"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {!condition ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 w-fit gap-1 px-2 text-xs"
          onClick={onEnableCondition}
        >
          <Plus className="h-3.5 w-3.5" />
          Add condition
        </Button>
      ) : (
        <Field label="Condition">
          <div className="flex flex-col gap-2">
            <TemplatedField
              label=""
              value={condition.left}
              onChange={(v) =>
                onChange({ ...branch, condition: { ...condition, left: v } })
              }
              placeholder="{{vars.outreach.outcome}}"
            />
            <div className="flex gap-2">
              <Select
                value={condition.op}
                onValueChange={(v) =>
                  v &&
                  onChange({
                    ...branch,
                    condition: { ...condition, op: v as WorkflowBranchOp },
                  })
                }
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRANCH_OPS.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isUnary && (
                <Input
                  value={condition.right ?? ""}
                  onChange={(e) =>
                    onChange({
                      ...branch,
                      condition: { ...condition, right: e.target.value },
                    })
                  }
                  placeholder='"reached"'
                  className="flex-1 font-mono text-xs"
                />
              )}
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 w-fit gap-1 px-2 text-[11px] text-muted-foreground"
              onClick={onDisableCondition}
            >
              <Trash2 className="h-3 w-3" />
              Remove condition
            </Button>
          </div>
        </Field>
      )}
    </div>
  );
}

interface FallbackEditorProps {
  fallback: { name?: string } | undefined;
  onToggle: (enabled: boolean) => void;
  onRename: (name: string) => void;
}

function FallbackEditor({ fallback, onToggle, onRename }: FallbackEditorProps) {
  if (!fallback) {
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 w-fit gap-1 px-2 text-xs"
        onClick={() => onToggle(true)}
      >
        <Plus className="h-3.5 w-3.5" />
        Add fallback branch
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed border-border/60 bg-muted/20 p-3">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <Field label="Fallback branch" hint="Runs when no branch condition matches.">
            <Input
              value={fallback.name ?? ""}
              onChange={(e) => onRename(e.target.value)}
              placeholder="Otherwise"
            />
          </Field>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="mt-6 size-7 text-muted-foreground"
          onClick={() => onToggle(false)}
          aria-label="Remove fallback branch"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function LoopOnItemsForm(props: StepFormProps<LoopOnItemsStep>) {
  const { step, onChange, errors } = props;
  return (
    <>
      <TemplatedField
        label="Items"
        hint="Template expression that resolves to an array."
        value={step.items ?? ""}
        onChange={(v) => onChange({ ...step, items: v })}
        placeholder="{{vars.patients}}"
        error={errors?.items}
      />
      <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
        Inside the loop body, use{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono">
          {"{{loop.item}}"}
        </code>{" "}
        and{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono">
          {"{{loop.index}}"}
        </code>
        .
      </div>
      <Field label="Max iterations (optional)" error={errors?.maxIterations}>
        <Input
          type="number"
          min={1}
          value={step.maxIterations ?? ""}
          onChange={(e) => {
            const n = e.target.value ? Number(e.target.value) : undefined;
            onChange({
              ...step,
              maxIterations:
                typeof n === "number" && Number.isFinite(n) ? n : undefined,
            });
          }}
          placeholder="100"
          className="font-mono text-xs"
        />
      </Field>
      <StepIdField {...(props as StepFormProps<WorkflowStep>)} />
    </>
  );
}

interface StepInspectorProps {
  step: WorkflowStep;
  onChange: (next: WorkflowStep) => void;
  errors?: StepErrors;
  otherSteps?: { id: string; label: string }[];
  otherWorkflows?: Workflow[];
}

export function StepInspector(props: StepInspectorProps) {
  return (
    <>
      <StepKindForm {...props} />
      <CaptureSettings step={props.step} onChange={props.onChange} />
      <RetrySettings step={props.step} onChange={props.onChange} />
    </>
  );
}

function StepKindForm(props: StepInspectorProps) {
  switch (props.step.kind) {
    case "send_email":
      return <SendEmailForm {...(props as StepFormProps<SendEmailStep>)} />;
    case "send_sms":
      return <SendSmsForm {...(props as StepFormProps<SendSmsStep>)} />;
    case "wait":
      return <WaitForm {...(props as StepFormProps<WaitStep>)} />;
    case "wait_for_event":
      return <WaitForEventForm {...(props as StepFormProps<WaitForEventStep>)} />;
    case "branch_if":
      return <BranchIfForm {...(props as StepFormProps<BranchIfStep>)} />;
    case "router":
      return <RouterForm {...(props as StepFormProps<RouterStep>)} />;
    case "loop_on_items":
      return <LoopOnItemsForm {...(props as StepFormProps<LoopOnItemsStep>)} />;
    case "lookup_patient":
      return <LookupPatientForm {...(props as StepFormProps<LookupPatientStep>)} />;
    case "lookup_consultation":
      return (
        <LookupConsultationForm {...(props as StepFormProps<LookupConsultationStep>)} />
      );
    case "record_activity":
      return <RecordActivityForm {...(props as StepFormProps<RecordActivityStep>)} />;
    case "http_call":
      return <HttpCallForm {...(props as StepFormProps<HttpCallStep>)} />;
    case "call_workflow":
      return <CallWorkflowForm {...(props as StepFormProps<CallWorkflowStep>)} />;
  }
}

interface CaptureSettingsProps {
  step: WorkflowStep;
  onChange: (next: WorkflowStep) => void;
}

const CAPTURE_OPTIONS: ReadonlyArray<{
  value: WorkflowStepCaptureMode;
  label: string;
  description: string;
}> = [
  {
    value: "summary",
    label: "Summary",
    description:
      "Records a redacted, ≤ 2 KB snapshot of inputs and outputs. Recommended.",
  },
  {
    value: "full",
    label: "Full",
    description:
      "Stores the complete payload in object storage. Use for steps you frequently need to debug.",
  },
  {
    value: "none",
    label: "None",
    description: "Records timing only. Use for high-frequency steps.",
  },
];

/**
 * Per-step audit capture controls (capture mode + sensitive flag). Renders
 * inside `StepInspector` for every step kind. Defaults are not persisted —
 * the save path strips `capture: 'summary'` and `sensitive: false` so the
 * stored definition stays clean.
 */
function CaptureSettings({ step, onChange }: CaptureSettingsProps) {
  const sensitive = step.sensitive === true;
  // When `sensitive`, capture is forced to `'none'`.
  const captureMode: WorkflowStepCaptureMode = sensitive
    ? "none"
    : (step.capture ?? "summary");

  function updateCapture(next: WorkflowStepCaptureMode) {
    onChange({ ...step, capture: next });
  }

  function updateSensitive(next: boolean) {
    if (next) {
      onChange({ ...step, sensitive: true, capture: "none" });
    } else {
      onChange({ ...step, sensitive: false, capture: "summary" });
    }
  }

  const idBase = step.id ?? step.kind;

  return (
    <fieldset className="mt-4 rounded-md border border-border/60 bg-muted/20 p-3">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Capture
      </legend>
      <RadioGroup
        value={captureMode}
        onValueChange={(v) => {
          if (v) updateCapture(v as WorkflowStepCaptureMode);
        }}
        disabled={sensitive}
        className="gap-2"
      >
        {CAPTURE_OPTIONS.map((opt) => {
          const id = `capture-${idBase}-${opt.value}`;
          return (
            <label
              key={opt.value}
              htmlFor={id}
              className="flex cursor-pointer items-start gap-2 rounded-md p-1.5 hover:bg-accent/40"
            >
              <RadioGroupItem
                value={opt.value}
                id={id}
                className="mt-0.5"
                disabled={sensitive}
              />
              <span className="flex flex-col">
                <span className="text-sm font-medium">{opt.label}</span>
                <span className="text-xs text-muted-foreground">{opt.description}</span>
              </span>
            </label>
          );
        })}
      </RadioGroup>
      <label
        htmlFor={`capture-sensitive-${idBase}`}
        className="mt-3 flex cursor-pointer items-start gap-2 border-t border-border/60 pt-3"
      >
        <Checkbox
          id={`capture-sensitive-${idBase}`}
          checked={sensitive}
          onCheckedChange={(c) => updateSensitive(Boolean(c))}
          className="mt-0.5"
        />
        <span className="flex flex-col">
          <span className="text-sm font-medium">Sensitive</span>
          <span className="text-xs text-muted-foreground">
            Disables capture entirely. Use for steps handling secrets or PHI.
          </span>
        </span>
      </label>
    </fieldset>
  );
}

interface RetrySettingsProps {
  step: WorkflowStep;
  onChange: (next: WorkflowStep) => void;
}

const DEFAULT_RETRY_POLICY: WorkflowStepRetryPolicy = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  backoff: "exponential",
};

/**
 * Compute the delay (ms) before attempt N (N starts at 2). Mirrors the
 * server-side math from the workflow engine v2 handoff:
 *  - `'fixed'`:       `initialDelayMs`
 *  - `'linear'`:      `initialDelayMs * (N - 1)`
 *  - `'exponential'`: `initialDelayMs * 2 ^ (N - 2)`
 *
 * Capped at `maxDelayMs` (default 1h to match the server).
 */
function computeRetryDelayMs(
  policy: WorkflowStepRetryPolicy,
  attemptN: number
): number {
  const backoff = policy.backoff ?? "exponential";
  const cap = policy.maxDelayMs ?? 3_600_000;
  let raw: number;
  switch (backoff) {
    case "fixed":
      raw = policy.initialDelayMs;
      break;
    case "linear":
      raw = policy.initialDelayMs * (attemptN - 1);
      break;
    case "exponential":
    default:
      raw = policy.initialDelayMs * Math.pow(2, attemptN - 2);
      break;
  }
  return Math.min(Math.max(0, Math.round(raw)), cap);
}

function formatRetryDelayPreview(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) {
    const s = ms / 1000;
    return Number.isInteger(s) ? `${s}s` : `${s.toFixed(1)}s`;
  }
  const totalSec = Math.round(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
}

/**
 * Per-step retry policy authoring. Off by default — when toggled on,
 * prefills the recommended `{ maxAttempts: 3, initialDelayMs: 1000,
 * backoff: 'exponential' }` policy. The save path strips the field when
 * absent so unused steps don't persist an empty `retry: {}`.
 */
function RetrySettings({ step, onChange }: RetrySettingsProps) {
  const enabled = step.retry !== undefined;
  const policy = step.retry ?? DEFAULT_RETRY_POLICY;
  const idBase = step.id ?? step.kind;

  function update(next: Partial<WorkflowStepRetryPolicy>) {
    onChange({ ...step, retry: { ...policy, ...next } });
  }

  function toggle(on: boolean) {
    if (on) {
      onChange({ ...step, retry: { ...DEFAULT_RETRY_POLICY } });
    } else {
      const { retry: _retry, ...rest } = step as WorkflowStep & {
        retry?: WorkflowStepRetryPolicy;
      };
      void _retry;
      onChange(rest as WorkflowStep);
    }
  }

  // Preview the delays before attempts 2 / 3 / 4 (capped to maxAttempts).
  const previewDelays: number[] = [];
  if (enabled) {
    const last = Math.min(policy.maxAttempts, 4);
    for (let n = 2; n <= last; n += 1) {
      previewDelays.push(computeRetryDelayMs(policy, n));
    }
  }

  return (
    <fieldset className="mt-4 rounded-md border border-border/60 bg-muted/20 p-3">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Retry on failure
      </legend>
      <label
        htmlFor={`retry-enabled-${idBase}`}
        className="flex cursor-pointer items-start gap-2"
      >
        <Checkbox
          id={`retry-enabled-${idBase}`}
          checked={enabled}
          onCheckedChange={(c) => toggle(Boolean(c))}
          className="mt-0.5"
        />
        <span className="flex flex-col">
          <span className="text-sm font-medium">Retry on failure</span>
          <span className="text-xs text-muted-foreground">
            When this step fails, the engine schedules another attempt instead
            of failing the run immediately.
          </span>
        </span>
      </label>

      {enabled ? (
        <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Max attempts">
              <Input
                id={`retry-max-${idBase}`}
                type="number"
                min={1}
                max={10}
                step={1}
                value={policy.maxAttempts}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n)) {
                    update({ maxAttempts: Math.max(1, Math.min(10, Math.round(n))) });
                  }
                }}
                className="font-mono text-xs"
              />
            </Field>
            <Field label="Initial delay (ms)">
              <Input
                id={`retry-init-${idBase}`}
                type="number"
                min={100}
                max={3_600_000}
                step={100}
                value={policy.initialDelayMs}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n)) {
                    update({
                      initialDelayMs: Math.max(100, Math.min(3_600_000, Math.round(n))),
                    });
                  }
                }}
                className="font-mono text-xs"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Backoff">
              <Select
                value={policy.backoff ?? "exponential"}
                onValueChange={(v) => {
                  if (v) update({ backoff: v as WorkflowStepRetryPolicy["backoff"] });
                }}
              >
                <SelectTrigger id={`retry-backoff-${idBase}`} className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exponential">Exponential</SelectItem>
                  <SelectItem value="linear">Linear</SelectItem>
                  <SelectItem value="fixed">Fixed</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Max delay (ms, optional)">
              <Input
                id={`retry-cap-${idBase}`}
                type="number"
                min={100}
                max={86_400_000}
                step={100}
                value={policy.maxDelayMs ?? ""}
                placeholder="3600000"
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") {
                    const { maxDelayMs: _drop, ...rest } = policy;
                    void _drop;
                    onChange({ ...step, retry: rest });
                    return;
                  }
                  const n = Number(raw);
                  if (Number.isFinite(n)) {
                    update({
                      maxDelayMs: Math.max(100, Math.min(86_400_000, Math.round(n))),
                    });
                  }
                }}
                className="font-mono text-xs"
              />
            </Field>
          </div>
          {previewDelays.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Retries:{" "}
              <span className="font-mono">
                {previewDelays.map(formatRetryDelayPreview).join(" → ")}
              </span>{" "}
              ({policy.maxAttempts} attempts max,{" "}
              {policy.backoff ?? "exponential"} backoff)
            </p>
          ) : null}
        </div>
      ) : null}
    </fieldset>
  );
}

/** Build a minimal valid (or close to valid) step for a given kind. */
export function blankStep(kind: WorkflowStepKind): WorkflowStep {
  switch (kind) {
    case "send_email":
      return { kind: "send_email", to: "", subject: "" };
    case "send_sms":
      return { kind: "send_sms", to: "", body: "" };
    case "wait":
      return { kind: "wait", seconds: 60 };
    case "wait_for_event":
      return { kind: "wait_for_event", eventType: "" };
    case "branch_if":
      return { kind: "branch_if", left: "", op: "eq", right: "" };
    case "router":
      return {
        kind: "router",
        branches: [{ name: "Branch 1" }],
        fallback: { name: "Otherwise" },
        executionType: "first_match",
      };
    case "loop_on_items":
      return { kind: "loop_on_items", items: "" };
    case "lookup_patient":
      return { kind: "lookup_patient", patientId: "", storeAs: "patient" };
    case "lookup_consultation":
      return {
        kind: "lookup_consultation",
        consultationId: "",
        storeAs: "consult",
      };
    case "record_activity":
      return {
        kind: "record_activity",
        patientId: "",
        type: "note-added",
        entityType: "patient",
        title: "",
      };
    case "http_call":
      return { kind: "http_call", url: "", method: "GET" };
    case "call_workflow":
      return { kind: "call_workflow", workflowId: "" };
  }
}
