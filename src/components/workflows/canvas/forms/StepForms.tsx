"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, TemplatedField } from "./Field";
import type {
  BranchIfStep,
  CallWorkflowStep,
  HttpCallStep,
  LookupConsultationStep,
  LookupPatientStep,
  RecordActivityStep,
  SendEmailStep,
  SendSmsStep,
  WaitForEventStep,
  WaitStep,
  Workflow,
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

function StepIdField({
  step,
  onChange,
  errors,
}: StepFormProps<WorkflowStep>) {
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
      <StepIdField {...(props as StepFormProps<WorkflowStep>)} />
    </>
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
          onValueChange={(v) =>
            onChange({ ...step, gotoIfTrue: v || undefined })
          }
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
          onValueChange={(v) =>
            onChange({ ...step, gotoIfFalse: v || undefined })
          }
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
      <Field label="Store as" hint="Available later as {{vars.<storeAs>}}." error={errors?.storeAs}>
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
        <Input
          value={step.type ?? ""}
          onChange={(e) => onChange({ ...step, type: e.target.value })}
          placeholder="note"
        />
      </Field>
      <Field label="Entity type" error={errors?.entityType}>
        <Input
          value={step.entityType ?? ""}
          onChange={(e) => onChange({ ...step, entityType: e.target.value })}
          placeholder="patient"
        />
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
      <TemplatedField
        label="Body (optional)"
        value={step.body ?? ""}
        onChange={(v) => onChange({ ...step, body: v })}
        multiline
        rows={5}
        monospace
        error={errors?.body}
      />
      <Field label="Store response as (optional)" error={errors?.storeAs}>
        <Input
          value={step.storeAs ?? ""}
          onChange={(e) =>
            onChange({ ...step, storeAs: e.target.value || undefined })
          }
          placeholder="response"
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
          onChange={(e) =>
            onChange({ ...step, storeAs: e.target.value || undefined })
          }
          placeholder="subRun"
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
    case "lookup_patient":
      return <LookupPatientForm {...(props as StepFormProps<LookupPatientStep>)} />;
    case "lookup_consultation":
      return (
        <LookupConsultationForm {...(props as StepFormProps<LookupConsultationStep>)} />
      );
    case "record_activity":
      return (
        <RecordActivityForm {...(props as StepFormProps<RecordActivityStep>)} />
      );
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
        type: "note",
        entityType: "patient",
        title: "",
      };
    case "http_call":
      return { kind: "http_call", url: "", method: "GET" };
    case "call_workflow":
      return { kind: "call_workflow", workflowId: "" };
  }
}
