import type { Edge, Node } from "@xyflow/react";
import type {
  WorkflowStep,
  WorkflowStepKind,
  WorkflowTrigger,
  WorkflowTriggerKind,
} from "@/types";
import { dagreLayout } from "./dagre-layout";

export const NODE_W = 200;
export const NODE_H = 76;

export type WorkflowNodeData =
  | {
      kind: "trigger";
      triggerIndex: number;
      triggerKind: WorkflowTriggerKind;
      label: string;
      sub: string;
    }
  | {
      kind: "step";
      stepIndex: number;
      stepKind: WorkflowStepKind;
      label: string;
      sub: string;
      runStatus?: NodeRunStatus;
    };

export type WorkflowNode = Node<WorkflowNodeData>;

export type NodeRunStatus = "pending" | "running" | "done" | "failed" | "waiting";

interface BuildOptions {
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  /** Optional run status keyed by step index. */
  stepRunStatus?: Record<number, NodeRunStatus>;
}

function triggerLabel(t: WorkflowTrigger): { label: string; sub: string } {
  switch (t.kind) {
    case "event":
      return { label: "Event", sub: t.eventType || "—" };
    case "manual":
      return { label: "Manual", sub: "Test run / API" };
    case "schedule":
      return { label: "Schedule", sub: t.cron || "—" };
    case "webhook":
      return { label: "Webhook", sub: t.token ? "/" + t.token.slice(0, 10) + "…" : "(saves on create)" };
    case "workflow":
      return { label: "Sub-workflow", sub: "Called by another flow" };
  }
}

function stepLabel(s: WorkflowStep, index: number): { label: string; sub: string } {
  const id = s.id ?? `step_${index + 1}`;
  switch (s.kind) {
    case "send_email":
      return { label: "Send email", sub: s.subject || s.to || id };
    case "send_sms":
      return { label: "Send SMS", sub: s.to || id };
    case "wait":
      return { label: "Wait", sub: `${s.seconds ?? 0}s` };
    case "wait_for_event":
      return { label: "Wait for event", sub: s.eventType || id };
    case "branch_if":
      return {
        label: "Branch",
        sub: `${s.left ?? "?"} ${s.op ?? "?"} ${s.right ?? ""}`.trim(),
      };
    case "lookup_patient":
      return { label: "Lookup patient", sub: s.storeAs || id };
    case "lookup_consultation":
      return { label: "Lookup consultation", sub: s.storeAs || id };
    case "record_activity":
      return { label: "Record activity", sub: s.title || id };
    case "http_call":
      return {
        label: "HTTP call",
        sub: `${s.method ?? "GET"} ${s.url || id}`,
      };
    case "call_workflow":
      return { label: "Call workflow", sub: s.workflowId || id };
  }
}

function findStepIndexById(steps: WorkflowStep[], id: string): number | undefined {
  const idx = steps.findIndex((s) => s.id === id);
  return idx >= 0 ? idx : undefined;
}

/**
 * Convert (triggers, steps) into a positioned node-graph for `<ReactFlow>`.
 * The conversion is pure — no manual positioning state is preserved.
 */
export function buildGraph({
  triggers,
  steps,
  stepRunStatus,
}: BuildOptions): { nodes: WorkflowNode[]; edges: Edge[] } {
  const nodes: WorkflowNode[] = [];
  const edges: Edge[] = [];

  triggers.forEach((t, i) => {
    const { label, sub } = triggerLabel(t);
    nodes.push({
      id: `trigger-${i}`,
      type: "workflow",
      position: { x: 0, y: 0 },
      data: {
        kind: "trigger",
        triggerIndex: i,
        triggerKind: t.kind,
        label,
        sub,
      },
    });
  });

  steps.forEach((s, i) => {
    const { label, sub } = stepLabel(s, i);
    nodes.push({
      id: `step-${i}`,
      type: "workflow",
      position: { x: 0, y: 0 },
      data: {
        kind: "step",
        stepIndex: i,
        stepKind: s.kind,
        label,
        sub,
        runStatus: stepRunStatus?.[i],
      },
    });
  });

  // All triggers funnel into step 0.
  if (steps.length > 0) {
    triggers.forEach((_t, i) => {
      edges.push({
        id: `e-trigger-${i}-step-0`,
        source: `trigger-${i}`,
        target: `step-0`,
        type: "workflow",
      });
    });
  }

  // Sequential edges between steps, plus branch_if true/false jumps.
  steps.forEach((s, i) => {
    if (s.kind === "branch_if") {
      const trueIdx =
        s.gotoIfTrue !== undefined ? findStepIndexById(steps, s.gotoIfTrue) : undefined;
      const falseIdx =
        s.gotoIfFalse !== undefined ? findStepIndexById(steps, s.gotoIfFalse) : undefined;

      if (trueIdx !== undefined) {
        edges.push({
          id: `e-step-${i}-true-${trueIdx}`,
          source: `step-${i}`,
          target: `step-${trueIdx}`,
          type: "workflow",
          label: "true",
        });
      }
      if (falseIdx !== undefined && falseIdx !== trueIdx) {
        edges.push({
          id: `e-step-${i}-false-${falseIdx}`,
          source: `step-${i}`,
          target: `step-${falseIdx}`,
          type: "workflow",
          label: "false",
        });
      }
      // If neither target is set, fall through to next step.
      if (trueIdx === undefined && falseIdx === undefined && i < steps.length - 1) {
        edges.push({
          id: `e-step-${i}-next`,
          source: `step-${i}`,
          target: `step-${i + 1}`,
          type: "workflow",
        });
      }
    } else if (i < steps.length - 1) {
      edges.push({
        id: `e-step-${i}-next`,
        source: `step-${i}`,
        target: `step-${i + 1}`,
        type: "workflow",
      });
    }
  });

  const laidOut = dagreLayout(
    nodes.map((node) => ({ node, width: NODE_W, height: NODE_H })),
    edges
  );

  return { nodes: laidOut, edges };
}

/**
 * Compute per-step run status from a list of run events. Used by the run view
 * to color the canvas.
 */
export function computeStepRunStatus(
  events: { eventType: string; stepIndex: number | null }[],
  runStatus: "running" | "waiting" | "completed" | "failed" | "cancelled"
): Record<number, NodeRunStatus> {
  const map: Record<number, NodeRunStatus> = {};
  for (const e of events) {
    if (e.stepIndex == null) continue;
    if (e.eventType === "step_started") map[e.stepIndex] = "running";
    else if (e.eventType === "step_completed") map[e.stepIndex] = "done";
    else if (e.eventType === "step_failed") map[e.stepIndex] = "failed";
    else if (e.eventType === "wait_scheduled") map[e.stepIndex] = "waiting";
  }
  // If the run is no longer active, downgrade any lingering "running" to done/failed.
  if (runStatus === "completed") {
    Object.keys(map).forEach((k) => {
      if (map[+k] === "running") map[+k] = "done";
    });
  }
  return map;
}
