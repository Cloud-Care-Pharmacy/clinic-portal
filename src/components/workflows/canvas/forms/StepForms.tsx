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
import { Field, TemplatedField } from "./Field";
import {
  RECORD_ACTIVITY_STEP_ENTITY_TYPES,
  RECORD_ACTIVITY_STEP_TYPES,
  UNARY_BRANCH_OPS,
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
      <Field label="From (optional)" hint="Override the configured sender address." error={errors?.from}>
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
            <SelectItem value="eq">eq (==)</SelectItem>
            <SelectItem value="neq">neq (!=)</SelectItem>
            <SelectItem value="gt">gt (&gt;)</SelectItem>
            <SelectItem value="lt">lt (&lt;)</SelectItem>
            <SelectItem value="truthy">truthy</SelectItem>
            <SelectItem value="falsy">falsy</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      {step.op !== "truthy" && step.op !== "falsy" && (
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
            onChange={(v) =>
              onChange({ ...step, auth: { ...auth, username: v } })
            }
            placeholder="{{vars.creds.user}}"
            monospace
          />
          <TemplatedField
            label="Basic — password"
            value={auth.password}
            onChange={(v) =>
              onChange({ ...step, auth: { ...auth, password: v } })
            }
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
              maxResponseBytes: e.target.value
                ? Number(e.target.value)
                : undefined,
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

const ROUTER_OPS: WorkflowBranchOp[] = [
  "eq",
  "neq",
  "gt",
  "lt",
  "contains",
  "starts_with",
  "ends_with",
  "truthy",
  "falsy",
  "exists",
  "not_exists",
];

function RouterForm(props: StepFormProps<RouterStep>) {
  const { step, onChange, errors } = props;
  const branches = step.branches ?? [];

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

        {branches.map((branch, idx) => {
          const op = branch.condition?.op;
          const isUnary = op ? UNARY_BRANCH_OPS.has(op) : false;
          const branchErr = errors?.[`branches.${idx}.name`];
          return (
            <div
              key={idx}
              className="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/30 p-3"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <Field label={`Branch ${idx + 1} name`} error={branchErr}>
                    <Input
                      value={branch.name}
                      onChange={(e) =>
                        updateBranch(idx, { ...branch, name: e.target.value })
                      }
                      placeholder="Branch name"
                    />
                  </Field>
                </div>
                {branches.length > 1 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeBranch(idx)}
                    className="mt-6 h-8 w-8 text-muted-foreground"
                    aria-label="Remove branch"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <Field
                label="Condition (optional)"
                hint="Leave blank for a default/fallback branch."
              >
                <div className="flex flex-col gap-2">
                  <TemplatedField
                    label=""
                    value={branch.condition?.left ?? ""}
                    onChange={(v) =>
                      updateBranch(idx, {
                        ...branch,
                        condition: v
                          ? {
                              left: v,
                              op: branch.condition?.op ?? "eq",
                              right: branch.condition?.right,
                            }
                          : undefined,
                      })
                    }
                    placeholder="{{vars.outreach.outcome}}"
                  />
                  {branch.condition?.left ? (
                    <div className="flex gap-2">
                      <Select
                        value={branch.condition.op}
                        onValueChange={(v) =>
                          v &&
                          branch.condition &&
                          updateBranch(idx, {
                            ...branch,
                            condition: {
                              ...branch.condition,
                              op: v as WorkflowBranchOp,
                            },
                          })
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROUTER_OPS.map((op) => (
                            <SelectItem key={op} value={op}>
                              {op}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!isUnary && (
                        <Input
                          value={branch.condition.right ?? ""}
                          onChange={(e) =>
                            branch.condition &&
                            updateBranch(idx, {
                              ...branch,
                              condition: {
                                ...branch.condition,
                                right: e.target.value,
                              },
                            })
                          }
                          placeholder='"reached"'
                          className="flex-1 font-mono text-xs"
                        />
                      )}
                    </div>
                  ) : null}
                </div>
              </Field>
            </div>
          );
        })}
      </div>

      <StepIdField {...(props as StepFormProps<WorkflowStep>)} />
    </>
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
        branches: [{ name: "Branch 1" }, { name: "Otherwise" }],
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
