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
  GitFork,
  Repeat,
  UserSearch,
  CalendarSearch,
  CalendarRange,
  CalendarPlus,
  CalendarX,
  CalendarCheck,
  CalendarDays,
  UserMinus,
  UserPlus,
  Activity,
  PhoneOutgoing,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import type {
  WorkflowStep,
  WorkflowStepKind,
  WorkflowTrigger,
  WorkflowTriggerKind,
} from "@/types";

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

const FAMILIES: Record<
  NodeKindConfig["family"],
  Omit<NodeKindConfig, "label" | "shortLabel" | "description" | "icon" | "family">
> = {
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
    description: "Run when something happens in the system",
    icon: Zap,
  }),
  manual: fam("trigger", {
    label: "Manual trigger",
    shortLabel: "Manual",
    description: "Start the workflow by hand for testing",
    icon: Hand,
  }),
  schedule: fam("trigger", {
    label: "Schedule",
    shortLabel: "Schedule",
    description: "Run automatically on a recurring schedule",
    icon: Clock,
  }),
  webhook: fam("trigger", {
    label: "Webhook",
    shortLabel: "Webhook",
    description: "Run when an external service calls a unique URL",
    icon: Webhook,
  }),
  workflow: fam("trigger", {
    label: "Sub-workflow trigger",
    shortLabel: "Sub-workflow",
    description: "Run when another workflow calls this one",
    icon: GitMerge,
  }),
};

export const STEP_KIND_CONFIG: Record<WorkflowStepKind, NodeKindConfig> = {
  send_email: fam("tool", {
    label: "Send email",
    shortLabel: "Email",
    description: "Send an email to one or more recipients",
    icon: Mail,
  }),
  send_sms: fam("tool", {
    label: "Send SMS",
    shortLabel: "SMS",
    description: "Send a text message to a phone number",
    icon: MessageSquare,
  }),
  http_call: fam("tool", {
    label: "HTTP call",
    shortLabel: "HTTP",
    description: "Call an external service over the web",
    icon: Globe,
  }),
  record_activity: fam("tool", {
    label: "Record activity",
    shortLabel: "Activity",
    description: "Add an entry to a patient's activity timeline",
    icon: Activity,
  }),
  lookup_patient: fam("tool", {
    label: "Lookup patient",
    shortLabel: "Patient",
    description: "Find a patient to use later in the workflow",
    icon: UserSearch,
  }),
  lookup_consultation: fam("tool", {
    label: "Lookup consultation",
    shortLabel: "Consultation",
    description: "Find a consultation to use later in the workflow",
    icon: CalendarSearch,
  }),
  lookup_patient_consultations: fam("tool", {
    label: "List patient consultations",
    shortLabel: "Consults",
    description: "List a patient's consultations with optional filters",
    icon: CalendarRange,
  }),
  find_free_slots: fam("tool", {
    label: "Find free slots",
    shortLabel: "Free slots",
    description: "Find a practitioner's open slots for a day",
    icon: CalendarPlus,
  }),
  check_consultation_conflicts: fam("tool", {
    label: "Check conflicts",
    shortLabel: "Conflicts",
    description: "Check a practitioner's calendar for conflicting consultations",
    icon: CalendarX,
  }),
  consultation_action: fam("tool", {
    label: "Consultation action",
    shortLabel: "Consult action",
    description: "Cancel, complete or reschedule a consultation",
    icon: CalendarCheck,
  }),
  patient_action: fam("tool", {
    label: "Patient action",
    shortLabel: "Patient action",
    description: "Create, update or archive a patient record",
    icon: UserPlus,
  }),
  is_practitioner_on_leave: fam("tool", {
    label: "Practitioner on leave?",
    shortLabel: "On leave",
    description: "Check whether a practitioner is on leave for a date",
    icon: UserMinus,
  }),
  get_practitioner_availability: fam("tool", {
    label: "Practitioner availability",
    shortLabel: "Availability",
    description: "Read a practitioner's stored availability + schedule",
    icon: CalendarDays,
  }),
  wait: fam("human", {
    label: "Wait",
    shortLabel: "Wait",
    description: "Pause for a set amount of time",
    icon: Hourglass,
  }),
  wait_for_event: fam("human", {
    label: "Wait for event",
    shortLabel: "Wait event",
    description: "Pause until something specific happens",
    icon: Hourglass,
  }),
  branch_if: fam("branch", {
    label: "Branch (if/else)",
    shortLabel: "Branch",
    description: "Older two-way choice — use Router for new flows",
    icon: GitBranch,
  }),
  router: fam("branch", {
    label: "Router",
    shortLabel: "Router",
    description: "Send the workflow down different paths based on rules",
    icon: GitFork,
  }),
  loop_on_items: fam("branch", {
    label: "Loop on items",
    shortLabel: "Loop",
    description: "Repeat steps once for each item in a list",
    icon: Repeat,
  }),
  call_workflow: fam("agent", {
    label: "Call workflow",
    shortLabel: "Sub-flow",
    description: "Run another workflow as part of this one",
    icon: PhoneOutgoing,
  }),
  shopify_admin: fam("tool", {
    label: "Shopify Admin",
    shortLabel: "Shopify",
    description: "Create or update Shopify customers, orders, and products",
    icon: ShoppingBag,
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
  "shopify_admin",
  "wait",
  "wait_for_event",
  "branch_if",
  "router",
  "loop_on_items",
  "lookup_patient",
  "lookup_consultation",
  "lookup_patient_consultations",
  "find_free_slots",
  "check_consultation_conflicts",
  "consultation_action",
  "patient_action",
  "is_practitioner_on_leave",
  "get_practitioner_availability",
  "record_activity",
  "call_workflow",
];

export function triggerConfig(kind: WorkflowTriggerKind): NodeKindConfig {
  return TRIGGER_KIND_CONFIG[kind];
}

export function stepConfig(kind: WorkflowStepKind): NodeKindConfig {
  return STEP_KIND_CONFIG[kind];
}

/**
 * Default labelers for graph nodes. The graph builder calls these to render
 * the visible name/sub-label on each step or trigger card.
 */
export function triggerLabel(t: WorkflowTrigger): { label: string; sub: string } {
  const named = t.name?.trim();
  switch (t.kind) {
    case "event":
      return { label: named || "Event", sub: t.eventType || "—" };
    case "manual":
      return { label: named || "Manual", sub: "Test run / API" };
    case "schedule":
      return { label: named || "Schedule", sub: t.cron || "—" };
    case "webhook":
      return {
        label: named || "Webhook",
        sub: t.token ? "/" + t.token.slice(0, 10) + "…" : "(saves on create)",
      };
    case "workflow":
      return { label: named || "Sub-workflow", sub: "Called by another flow" };
    default:
      return {
        label: named || "Trigger",
        sub: (t as { kind?: string })?.kind ?? "unknown",
      };
  }
}

export function stepLabel(
  s: WorkflowStep,
  flatIndex: number
): { label: string; sub: string } {
  const fallback = s.id ?? `step_${flatIndex + 1}`;
  const named = s.name?.trim();
  switch (s.kind) {
    case "send_email":
      return { label: named || "Send email", sub: s.subject || s.to || fallback };
    case "send_sms":
      return { label: named || "Send SMS", sub: s.to || fallback };
    case "wait":
      return { label: named || "Wait", sub: `${s.seconds ?? 0}s` };
    case "wait_for_event":
      return { label: named || "Wait for event", sub: s.eventType || fallback };
    case "branch_if":
      return {
        label: named || "Branch",
        sub: `${s.left ?? "?"} ${s.op ?? "?"} ${s.right ?? ""}`.trim(),
      };
    case "router":
      return {
        label: named || "Router",
        sub: `${s.branches.length} branch${s.branches.length === 1 ? "" : "es"}`,
      };
    case "loop_on_items":
      return { label: named || "Loop", sub: s.items || fallback };
    case "lookup_patient":
      return { label: named || "Lookup patient", sub: s.storeAs || fallback };
    case "lookup_consultation":
      return { label: named || "Lookup consultation", sub: s.storeAs || fallback };
    case "lookup_patient_consultations":
      return {
        label: named || "List consultations",
        sub: s.storeAs || fallback,
      };
    case "find_free_slots":
      return {
        label: named || "Find free slots",
        sub: s.storeAs || fallback,
      };
    case "check_consultation_conflicts":
      return {
        label: named || "Check conflicts",
        sub: s.storeAs || fallback,
      };
    case "consultation_action":
      return {
        label: named || "Consultation action",
        sub: s.operation ? `${s.operation} · ${s.storeAs || fallback}` : fallback,
      };
    case "patient_action":
      return {
        label: named || "Patient action",
        sub: s.operation ? `${s.operation} · ${s.storeAs || fallback}` : fallback,
      };
    case "is_practitioner_on_leave":
      return {
        label: named || "Practitioner on leave?",
        sub: s.storeAs || fallback,
      };
    case "get_practitioner_availability":
      return {
        label: named || "Practitioner availability",
        sub: s.storeAs || fallback,
      };
    case "record_activity":
      return { label: named || "Record activity", sub: s.title || fallback };
    case "http_call":
      return {
        label: named || "HTTP call",
        sub: `${s.method ?? "GET"} ${s.url || fallback}`,
      };
    case "call_workflow":
      return { label: named || "Call workflow", sub: s.workflowId || fallback };
    case "shopify_admin":
      return {
        label: named || "Shopify Admin",
        sub: s.operation ? s.operation.replace(/_/g, " ") : fallback,
      };
    default:
      return {
        label: named || ((s as { kind?: string })?.kind ?? "Step"),
        sub: fallback,
      };
  }
}
