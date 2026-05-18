import {
  FALLBACK_BRANCH_INDEX,
  type Workflow,
  type WorkflowDefinitionBody,
  type WorkflowRunStep,
  type WorkflowStep,
} from "@/types";

/**
 * For each step in the canvas's flat `WorkflowStep[]`, compute the wire
 * `stepPath` the gateway emits on `WorkflowRunStep` so a run's projection
 * can be joined back to canvas positions.
 *
 * Path grammar (matches the engine's projection):
 *  - Top-level step:         `null`   (the gateway omits the path here)
 *  - Router branch child:    `"<topIdx>.branches[<bi>].steps[<pos>]"`
 *  - Router fallback child:  `"<topIdx>.fallback.steps[<pos>]"`
 *  - Loop body child:        `"<topIdx>.steps[<pos>]"`
 *
 * `<topIdx>` is the parent's ordinal within the top-level chain (the only
 * containers that nest steps today are `router` and `loop_on_items`, and
 * both must sit at the top level). `<pos>` is the child's ordinal within
 * its branch/body chain.
 *
 * Returns an array aligned 1:1 with the input `steps`.
 */
export function canvasStepPaths(
  steps: readonly WorkflowStep[],
): (string | null)[] {
  // Map each top-level container's id → its top-level ordinal so child
  // paths can reference the parent by index.
  const topOrdinalByName = new Map<string, number>();
  let topOrd = 0;
  steps.forEach((s, i) => {
    if (s.parentStepName) return;
    const name = s.id ?? `step_${i}`;
    topOrdinalByName.set(name, topOrd);
    topOrd += 1;
  });

  // Track child positions per (parentName, branchIndex). The flat array
  // already lists children in chain order, so each occurrence increments
  // the per-chain counter.
  const childPosCounter = new Map<string, number>();
  // Index parents by name so we can look up their kind for path shape.
  const stepByName = new Map<string, WorkflowStep>();
  steps.forEach((s, i) => {
    const name = s.id ?? `step_${i}`;
    stepByName.set(name, s);
  });

  return steps.map((s) => {
    if (!s.parentStepName) return null;
    const parentOrd = topOrdinalByName.get(s.parentStepName);
    if (parentOrd === undefined) return null;
    const bi = s.branchIndex ?? 0;
    const key = `${s.parentStepName}|${bi}`;
    const pos = childPosCounter.get(key) ?? 0;
    childPosCounter.set(key, pos + 1);
    const parent = stepByName.get(s.parentStepName);
    if (parent?.kind === "loop_on_items") {
      return `${parentOrd}.steps[${pos}]`;
    }
    if (bi === FALLBACK_BRANCH_INDEX) {
      return `${parentOrd}.fallback.steps[${pos}]`;
    }
    return `${parentOrd}.branches[${bi}].steps[${pos}]`;
  });
}

/**
 * Flatten a tree of `WorkflowRunStep` projections (parent + nested
 * `children`) into a single array in DFS preorder. The resulting order
 * mirrors `normalizeWorkflowDefinition`'s flat `steps[]` order, so the
 * Nth flattened projection lines up with the Nth definition step.
 *
 * The gateway returns `data.steps[]` as a tree where `stepIndex` is reset
 * inside each nested container (router branches, loop bodies). Use this
 * helper any time you need a unique-per-step list or want to index by
 * canvas position. Lookup by `stepPath` remains the canonical key.
 */
export function flattenRunSteps(
  steps: readonly WorkflowRunStep[] | null | undefined,
): WorkflowRunStep[] {
  if (!steps || steps.length === 0) return [];
  const out: WorkflowRunStep[] = [];
  const walk = (list: readonly WorkflowRunStep[]) => {
    for (const s of list) {
      out.push(s);
      if (Array.isArray(s.children) && s.children.length) walk(s.children);
    }
  };
  walk(steps);
  return out;
}

/**
 * Find a step in a (possibly nested) projection tree by its `stepPath`.
 * Returns `undefined` when no match is found.
 */
export function findRunStepByPath(
  steps: readonly WorkflowRunStep[] | null | undefined,
  path: string | null | undefined,
): WorkflowRunStep | undefined {
  if (!steps || !path) return undefined;
  for (const s of steps) {
    if (s.stepPath === path) return s;
    if (Array.isArray(s.children) && s.children.length) {
      const hit = findRunStepByPath(s.children, path);
      if (hit) return hit;
    }
  }
  return undefined;
}

/**
 * Replace a step in a (possibly nested) projection tree by `stepPath`,
 * returning a new tree (immutable update). When no match is found the
 * original tree is returned unchanged.
 */
export function replaceRunStepByPath(
  steps: readonly WorkflowRunStep[],
  next: WorkflowRunStep,
): WorkflowRunStep[] {
  const path = next.stepPath;
  if (!path) return steps as WorkflowRunStep[];
  let mutated = false;
  const walk = (list: readonly WorkflowRunStep[]): WorkflowRunStep[] => {
    const out: WorkflowRunStep[] = new Array(list.length);
    for (let i = 0; i < list.length; i += 1) {
      const s = list[i]!;
      if (s.stepPath === path) {
        out[i] = next;
        mutated = true;
        continue;
      }
      if (Array.isArray(s.children) && s.children.length) {
        const newChildren = walk(s.children);
        out[i] = newChildren === s.children ? s : { ...s, children: newChildren };
        continue;
      }
      out[i] = s;
    }
    return mutated ? out : (list as WorkflowRunStep[]);
  };
  return walk(steps);
}

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

/**
 * Inverse of `normalizeWorkflowDefinition`: rebuild the engine's **nested**
 * wire shape from the canvas's flat representation so the API accepts it.
 *
 * The backend's step validator requires:
 *  - `router.branches[i].conditions: Condition[][]` (OR-of-AND) — never
 *    omitted, even when the branch is unconditional (`[]`).
 *  - `router.branches[i].steps: Step[]` — child chain, always present.
 *  - `router.fallback.steps: Step[]` — fallback child chain, always present
 *    when `fallback` is set.
 *  - `loop_on_items.steps: Step[]` — loop body, always present (may be
 *    empty).
 *
 * The flat shape used by the canvas (`parentStepName` + `branchIndex`
 * markers on children, single `branch.condition`, no `branch.steps` /
 * `fallback.steps`) is rejected by the API as
 * `Invalid workflow definition`. This function re-nests children, wraps
 * the single condition as `[[condition]]`, and strips the canvas-only
 * marker fields along with default-valued audit fields (`capture: 'full'`,
 * `sensitive: false`, missing `retry`).
 *
 * Idempotent against pre-existing wire input: if children are already
 * nested under their parents (no `parentStepName` markers), the function
 * just performs the default-stripping pass and re-emits.
 *
 * Names are derived as `step.id ?? "step_" + flatIndex` to match
 * `hoistSteps`'s naming so children added by the normalizer round-trip
 * correctly.
 */
export function serializeWorkflowSteps(flatSteps: WorkflowStep[]): WorkflowStep[] {
  type Indexed = { step: WorkflowStep; flatIndex: number };
  const childrenByParent = new Map<string, Map<number, Indexed[]>>();
  const topLevel: Indexed[] = [];

  flatSteps.forEach((step, flatIndex) => {
    const parent = step.parentStepName;
    if (parent !== undefined) {
      const branchIdx = step.branchIndex ?? 0;
      let byBranch = childrenByParent.get(parent);
      if (!byBranch) {
        byBranch = new Map();
        childrenByParent.set(parent, byBranch);
      }
      const list = byBranch.get(branchIdx) ?? [];
      byBranch.set(branchIdx, list);
      list.push({ step, flatIndex });
    } else {
      topLevel.push({ step, flatIndex });
    }
  });

  function nameOf({ step, flatIndex }: Indexed): string {
    return typeof step.id === "string" && step.id ? step.id : `step_${flatIndex}`;
  }

  function buildOne(entry: Indexed): WorkflowStep {
    const { step } = entry;
    const {
      // Strip canvas-only flat markers; not part of the wire shape.
      parentStepName: _parentStepName,
      branchIndex: _branchIndex,
      capture,
      sensitive,
      retry,
      ...rest
    } = step as WorkflowStep & {
      parentStepName?: string;
      branchIndex?: number;
      capture?: WorkflowStep["capture"];
      sensitive?: WorkflowStep["sensitive"];
      retry?: WorkflowStep["retry"];
    };
    void _parentStepName;
    void _branchIndex;
    const cleaned: Record<string, unknown> = { ...rest };
    if (capture && capture !== "full") cleaned.capture = capture;
    if (sensitive === true) cleaned.sensitive = true;
    if (retry !== undefined) cleaned.retry = retry;

    const parentName = nameOf(entry);
    const byBranch = childrenByParent.get(parentName);

    if (cleaned.kind === "router") {
      const rawBranches = Array.isArray(cleaned.branches)
        ? (cleaned.branches as Array<{ name: string; condition?: unknown }>)
        : [];
      cleaned.branches = rawBranches.map((branch, branchIdx) => {
        const conditions =
          branch.condition && typeof branch.condition === "object"
            ? [[branch.condition]]
            : [];
        const branchChildren = byBranch?.get(branchIdx) ?? [];
        return {
          name: branch.name,
          conditions,
          steps: branchChildren.map(buildOne),
        };
      });

      const fallbackChildren = byBranch?.get(FALLBACK_BRANCH_INDEX) ?? [];
      const existingFallback = cleaned.fallback as { name?: string } | undefined;
      if (existingFallback || fallbackChildren.length > 0) {
        cleaned.fallback = {
          ...(existingFallback ?? {}),
          steps: fallbackChildren.map(buildOne),
        };
      }
    } else if (cleaned.kind === "loop_on_items") {
      const loopChildren = byBranch?.get(0) ?? [];
      cleaned.steps = loopChildren.map(buildOne);
    }

    return cleaned as unknown as WorkflowStep;
  }

  return topLevel.map(buildOne);
}
