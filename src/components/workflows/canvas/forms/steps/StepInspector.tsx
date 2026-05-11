"use client";

import type {
  BranchIfStep,
  CallWorkflowStep,
  HttpCallStep,
  LookupConsultationStep,
  LookupPatientStep,
  LoopOnItemsStep,
  RecordActivityStep,
  RouterStep,
  SendEmailStep,
  SendSmsStep,
  WaitForEventStep,
  WaitStep,
  Workflow,
  WorkflowStep,
  WorkflowStepKind,
} from "@/types";
import { BranchIfForm } from "./BranchIfForm";
import { CallWorkflowForm } from "./CallWorkflowForm";
import { HttpCallForm } from "./HttpCallForm";
import { LookupConsultationForm } from "./LookupConsultationForm";
import { LookupPatientForm } from "./LookupPatientForm";
import { LoopOnItemsForm } from "./LoopOnItemsForm";
import { RecordActivityForm } from "./RecordActivityForm";
import { RouterForm } from "./RouterForm";
import { SendEmailForm } from "./SendEmailForm";
import { SendSmsForm } from "./SendSmsForm";
import { WaitForEventForm } from "./WaitForEventForm";
import { WaitForm } from "./WaitForm";
import type { StepErrors, StepFormProps } from "./types";

interface StepInspectorProps {
  step: WorkflowStep;
  onChange: (next: WorkflowStep) => void;
  errors?: StepErrors;
  otherSteps?: { id: string; label: string }[];
  otherWorkflows?: Workflow[];
}

/**
 * Renders the parameters form for a step (kind-specific fields only). The
 * advanced settings (rename / capture / retry) live in `NodeInspector`'s
 * Settings tab so the parameters surface stays focused.
 */
export function StepInspector(props: StepInspectorProps) {
  return <StepKindForm {...props} />;
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
        <LookupConsultationForm
          {...(props as StepFormProps<LookupConsultationStep>)}
        />
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
