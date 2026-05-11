import {
  FALLBACK_BRANCH_INDEX,
  type Workflow,
  type WorkflowDefinitionBody,
  type WorkflowStep,
} from "@/types";

/**
 * Convert a wire-format workflow definition into the flat representation the
 * canvas / inspector expect.
 *
 * Some workflows (notably hand-seeded ones) are stored in the engine's
 * **nested** form, where router branches embed their child steps directly:
 *
 *   { kind: "router", branches: [{ name, conditions: [[...]], steps: [...] }],
 *                     fallback: { name, steps: [...] } }
 *
 * The frontend, however, models child steps as siblings in the top-level
 * `steps[]` array, tagged with `parentStepName` + `branchIndex`. Without
 * normalization the canvas silently drops every nested child (e.g. the
 * `send_sms` inside an `Appointment reminder` router), so this helper
 * hoists them out, drops the wire-only `steps` / `conditions` fields, and
 * collapses `conditions: [[c]]` → `condition: c` to match the frontend
 * router branch shape.
 *
 * Idempotent: a definition that is already flat round-trips unchanged.
 */
export function normalizeWorkflowDefinition(
  def: WorkflowDefinitionBody | null | undefined,
): WorkflowDefinitionBody {
  if (!def || !Array.isArray(def.steps)) {
    return { version: def?.version, steps: [], ...(def?.notes ? { notes: def.notes } : null) };
  }
  const flat: WorkflowStep[] = [];
  hoistSteps(def.steps, flat, undefined, undefined);
  return { ...def, steps: flat };
}

export function normalizeWorkflow(workflow: Workflow): Workflow {
  return { ...workflow, definition: normalizeWorkflowDefinition(workflow.definition) };
}

interface NestedRouterBranch {
  name?: string;
  condition?: unknown;
  conditions?: unknown;
  steps?: unknown;
}

interface NestedFallback {
  name?: string;
  steps?: unknown;
}

function hoistSteps(
  steps: unknown[],
  out: WorkflowStep[],
  parentStepName: string | undefined,
  branchIndex: number | undefined,
): void {
  for (const raw of steps) {
    if (!raw || typeof raw !== "object") continue;
    const step = { ...(raw as Record<string, unknown>) } as Record<string, unknown>;

    if (parentStepName !== undefined) {
      step.parentStepName = parentStepName;
      step.branchIndex = branchIndex ?? 0;
    }

    if (step.kind === "router" && Array.isArray(step.branches)) {
      const routerName =
        typeof step.id === "string" && step.id ? step.id : `step_${out.length}`;
      const rawBranches = step.branches as NestedRouterBranch[];
      const branchChildren: { index: number; nested: unknown[] }[] = [];
      const fallback = step.fallback as NestedFallback | undefined;
      const fallbackChildren: unknown[] = Array.isArray(fallback?.steps)
        ? (fallback!.steps as unknown[])
        : [];

      step.branches = rawBranches.map((branch, i) => {
        if (Array.isArray(branch.steps) && branch.steps.length) {
          branchChildren.push({ index: i, nested: branch.steps as unknown[] });
        }
        const condition = collapseConditions(branch);
        const next: { name: string; condition?: unknown } = {
          name: branch.name ?? `Branch ${i + 1}`,
        };
        if (condition) next.condition = condition;
        return next;
      });

      if (fallback) {
        step.fallback = fallback.name ? { name: fallback.name } : {};
      }

      out.push(step as unknown as WorkflowStep);

      for (const { index, nested } of branchChildren) {
        hoistSteps(nested, out, routerName, index);
      }
      if (fallbackChildren.length) {
        hoistSteps(fallbackChildren, out, routerName, FALLBACK_BRANCH_INDEX);
      }
      continue;
    }

    if (step.kind === "loop_on_items") {
      const loopName =
        typeof step.id === "string" && step.id ? step.id : `step_${out.length}`;
      const nested = Array.isArray(step.steps)
        ? (step.steps as unknown[])
        : Array.isArray(step.firstLoopAction)
          ? (step.firstLoopAction as unknown[])
          : [];
      delete step.steps;
      delete step.firstLoopAction;
      out.push(step as unknown as WorkflowStep);
      if (nested.length) {
        hoistSteps(nested, out, loopName, 0);
      }
      continue;
    }

    out.push(step as unknown as WorkflowStep);
  }
}

function collapseConditions(branch: NestedRouterBranch): unknown {
  if (branch.condition && typeof branch.condition === "object") {
    return branch.condition;
  }
  const groups = branch.conditions;
  if (Array.isArray(groups)) {
    for (const group of groups) {
      if (Array.isArray(group)) {
        for (const cond of group) {
          if (cond && typeof cond === "object") return cond;
        }
      } else if (group && typeof group === "object") {
        return group;
      }
    }
  }
  return undefined;
}
