import {
  Webhook,
  Clock,
  Zap,
  Hand,
  GitMerge,
  Mail,
  MessageSquare,
  Globe,
  Hourglass,
  GitBranch,
  UserSearch,
  CalendarSearch,
  Activity,
  PhoneOutgoing,
  type LucideIcon,
} from "lucide-react";
import type { WorkflowStepKind, WorkflowTriggerKind } from "@/types";

/**
 * Visual config for a workflow node. Maps directly to the design's family
 * palette (trigger / tool / branch / human / agent) — see
 * `workflow-handoff/design_handoff_workflow_builder/README.md` §3.
 */
export interface NodeKindConfig {
  family: "trigger" | "tool" | "branch" | "human" | "agent";
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  /** CSS color tokens. */
  bg: string;
  fg: string;
  border: string;
  /** Strong accent for the kind label + selection ring. */
  accent: string;
}

const FAMILIES: Record<NodeKindConfig["family"], Omit<NodeKindConfig, "label" | "shortLabel" | "description" | "icon" | "family">> = {
  trigger: {
    bg: "var(--status-warning-bg)",
    fg: "var(--status-warning-fg)",
    border: "var(--status-warning-border)",
    accent: "#854d0e",
  },
  tool: {
    bg: "var(--status-info-bg)",
    fg: "var(--status-info-fg)",
    border: "var(--status-info-border)",
    accent: "#1e40af",
  },
  branch: {
    bg: "var(--status-accent-bg)",
    fg: "var(--status-accent-fg)",
    border: "var(--status-accent-border)",
    accent: "#6b21a8",
  },
  human: {
    bg: "var(--status-success-bg)",
    fg: "var(--status-success-fg)",
    border: "var(--status-success-border)",
    accent: "#166534",
  },
  agent: {
    bg: "#fef0eb",
    fg: "#9a3412",
    border: "#fbd0c3",
    accent: "var(--primary)",
  },
};

function fam(
  family: NodeKindConfig["family"],
  rest: { label: string; shortLabel: string; description: string; icon: LucideIcon }
): NodeKindConfig {
  return { family, ...FAMILIES[family], ...rest };
}

export const TRIGGER_KIND_CONFIG: Record<WorkflowTriggerKind, NodeKindConfig> = {
  event: fam("trigger", {
    label: "Event trigger",
    shortLabel: "Event",
    description: "Fires when a domain event matches",
    icon: Zap,
  }),
  manual: fam("trigger", {
    label: "Manual trigger",
    shortLabel: "Manual",
    description: "Triggered from the Test run button",
    icon: Hand,
  }),
  schedule: fam("trigger", {
    label: "Schedule",
    shortLabel: "Schedule",
    description: "Cron schedule (5-minute granularity, UTC)",
    icon: Clock,
  }),
  webhook: fam("trigger", {
    label: "Webhook",
    shortLabel: "Webhook",
    description: "HTTP POST to a generated URL",
    icon: Webhook,
  }),
  workflow: fam("trigger", {
    label: "Sub-workflow trigger",
    shortLabel: "Sub-workflow",
    description: "Called from another workflow",
    icon: GitMerge,
  }),
};

export const STEP_KIND_CONFIG: Record<WorkflowStepKind, NodeKindConfig> = {
  send_email: fam("tool", {
    label: "Send email",
    shortLabel: "Email",
    description: "Send transactional email via Resend",
    icon: Mail,
  }),
  send_sms: fam("tool", {
    label: "Send SMS",
    shortLabel: "SMS",
    description: "Send SMS via Twilio",
    icon: MessageSquare,
  }),
  http_call: fam("tool", {
    label: "HTTP call",
    shortLabel: "HTTP",
    description: "Outbound HTTP request",
    icon: Globe,
  }),
  record_activity: fam("tool", {
    label: "Record activity",
    shortLabel: "Activity",
    description: "Append a patient activity event",
    icon: Activity,
  }),
  lookup_patient: fam("tool", {
    label: "Lookup patient",
    shortLabel: "Patient",
    description: "Load a patient into context",
    icon: UserSearch,
  }),
  lookup_consultation: fam("tool", {
    label: "Lookup consultation",
    shortLabel: "Consultation",
    description: "Load a consultation into context",
    icon: CalendarSearch,
  }),
  wait: fam("human", {
    label: "Wait",
    shortLabel: "Wait",
    description: "Durable timer pause",
    icon: Hourglass,
  }),
  wait_for_event: fam("human", {
    label: "Wait for event",
    shortLabel: "Wait event",
    description: "Pause until a matching domain event arrives",
    icon: Hourglass,
  }),
  branch_if: fam("branch", {
    label: "Branch (if/else)",
    shortLabel: "Branch",
    description: "Conditional jump to another step",
    icon: GitBranch,
  }),
  call_workflow: fam("agent", {
    label: "Call workflow",
    shortLabel: "Sub-flow",
    description: "Invoke another workflow as a sub-flow",
    icon: PhoneOutgoing,
  }),
};

export const TRIGGER_KINDS: WorkflowTriggerKind[] = [
  "webhook",
  "schedule",
  "event",
  "manual",
  "workflow",
];

export const STEP_KINDS: WorkflowStepKind[] = [
  "send_email",
  "send_sms",
  "http_call",
  "wait",
  "wait_for_event",
  "branch_if",
  "lookup_patient",
  "lookup_consultation",
  "record_activity",
  "call_workflow",
];

export function triggerConfig(kind: WorkflowTriggerKind): NodeKindConfig {
  return TRIGGER_KIND_CONFIG[kind];
}

export function stepConfig(kind: WorkflowStepKind): NodeKindConfig {
  return STEP_KIND_CONFIG[kind];
}
