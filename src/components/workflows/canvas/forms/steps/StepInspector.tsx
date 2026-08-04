"use client";

import type {
  BranchIfStep,
  CallWorkflowStep,
  CheckConsultationConflictsStep,
  ConsultationActionStep,
  FindFreeSlotsStep,
  GetPractitionerAvailabilityStep,
  HttpCallStep,
  IsPractitionerOnLeaveStep,
  LookupConsultationStep,
  LookupPatientConsultationsStep,
  LookupPatientStep,
  LoopOnItemsStep,
  PatientActionStep,
  RecordActivityStep,
  RouterStep,
  SendEmailStep,
  SendSmsStep,
  ShopifyAdminStep,
  WaitForEventStep,
  WaitStep,
  Workflow,
  WorkflowStep,
  WorkflowStepKind,
} from "@/types";
import { BranchIfForm } from "./BranchIfForm";
import { CallWorkflowForm } from "./CallWorkflowForm";
import { CheckConsultationConflictsForm } from "./CheckConsultationConflictsForm";
import { ConsultationActionForm } from "./ConsultationActionForm";
import { FindFreeSlotsForm } from "./FindFreeSlotsForm";
import { GetPractitionerAvailabilityForm } from "./GetPractitionerAvailabilityForm";
import { HttpCallForm } from "./HttpCallForm";
import { IsPractitionerOnLeaveForm } from "./IsPractitionerOnLeaveForm";
import { LookupConsultationForm } from "./LookupConsultationForm";
import { LookupPatientConsultationsForm } from "./LookupPatientConsultationsForm";
import { LookupPatientForm } from "./LookupPatientForm";
import { LoopOnItemsForm } from "./LoopOnItemsForm";
import { PatientActionForm } from "./PatientActionForm";
import { RecordActivityForm } from "./RecordActivityForm";
import { RouterForm } from "./RouterForm";
import { SendEmailForm } from "./SendEmailForm";
import { SendSmsForm } from "./SendSmsForm";
import { ShopifyAdminForm } from "./ShopifyAdminForm";
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
        <LookupConsultationForm {...(props as StepFormProps<LookupConsultationStep>)} />
      );
    case "lookup_patient_consultations":
      return (
        <LookupPatientConsultationsForm
          {...(props as StepFormProps<LookupPatientConsultationsStep>)}
        />
      );
    case "find_free_slots":
      return <FindFreeSlotsForm {...(props as StepFormProps<FindFreeSlotsStep>)} />;
    case "check_consultation_conflicts":
      return (
        <CheckConsultationConflictsForm
          {...(props as StepFormProps<CheckConsultationConflictsStep>)}
        />
      );
    case "consultation_action":
      return (
        <ConsultationActionForm {...(props as StepFormProps<ConsultationActionStep>)} />
      );
    case "patient_action":
      return <PatientActionForm {...(props as StepFormProps<PatientActionStep>)} />;
    case "is_practitioner_on_leave":
      return (
        <IsPractitionerOnLeaveForm
          {...(props as StepFormProps<IsPractitionerOnLeaveStep>)}
        />
      );
    case "get_practitioner_availability":
      return (
        <GetPractitionerAvailabilityForm
          {...(props as StepFormProps<GetPractitionerAvailabilityStep>)}
        />
      );
    case "record_activity":
      return <RecordActivityForm {...(props as StepFormProps<RecordActivityStep>)} />;
    case "http_call":
      return <HttpCallForm {...(props as StepFormProps<HttpCallStep>)} />;
    case "call_workflow":
      return <CallWorkflowForm {...(props as StepFormProps<CallWorkflowStep>)} />;
    case "shopify_admin":
      return <ShopifyAdminForm {...(props as StepFormProps<ShopifyAdminStep>)} />;
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
    case "lookup_patient_consultations":
      return {
        kind: "lookup_patient_consultations",
        patientId: "",
        storeAs: "consultations",
      };
    case "find_free_slots":
      return {
        kind: "find_free_slots",
        practitionerUserId: "",
        date: "",
        durationMinutes: 30,
        storeAs: "slots",
      };
    case "check_consultation_conflicts":
      return {
        kind: "check_consultation_conflicts",
        practitionerId: "",
        scheduledAt: "",
        durationMinutes: 30,
        storeAs: "conflicts",
      };
    case "consultation_action":
      return {
        kind: "consultation_action",
        operation: "complete",
        consultationId: "",
        storeAs: "result",
      };
    case "patient_action":
      return {
        kind: "patient_action",
        operation: "update",
        patientId: "",
        storeAs: "patientResult",
      };
    case "is_practitioner_on_leave":
      return {
        kind: "is_practitioner_on_leave",
        practitionerUserId: "",
        date: "",
        storeAs: "leave",
      };
    case "get_practitioner_availability":
      return {
        kind: "get_practitioner_availability",
        practitionerUserId: "",
        storeAs: "availability",
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
    case "shopify_admin":
      return {
        kind: "shopify_admin",
        operation: "update_customer",
      };
  }
}
