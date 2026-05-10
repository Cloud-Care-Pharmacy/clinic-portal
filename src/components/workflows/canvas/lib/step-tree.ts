import type {
  LoopOnItemsStep,
  RouterStep,
  WorkflowStep,
} from "@/types";

/**
 * In-memory tree representation of a flat workflow `steps[]`. Each node
 * carries its original step + a generated `nodeName` (used as React Flow
 * node id) + optional children for routers and loops.
 *
 * Top-level chain: linked list via `nextAction`.
 *
 * - `RouterStep` → `branches[i]` is the head of branch `i` (or `null` empty).
 * - `LoopOnItemsStep` → `firstLoopAction` is the head of the loop body.
 */
export type StepTreeNode = StepTreeAction | StepTreeRouter | StepTreeLoop;

interface StepTreeBase {
  /** Stable name used as the React Flow node id. */
  nodeName: string;
  /** Original step reference (for editing). */
  step: WorkflowStep;
  /** Index of this step in the original flat array. */
  flatIndex: number;
  /** Display index (1-based) within its chain (for "1. Send email" labels). */
  displayIndex: number;
  /** The step that follows this one in its chain, or null. */
  nextAction: StepTreeNode | null;
}

export interface StepTreeAction extends StepTreeBase {
  kind: "action";
}

export interface StepTreeRouter extends StepTreeBase {
  kind: "router";
  step: RouterStep;
  branches: (StepTreeNode | null)[];
}

export interface StepTreeLoop extends StepTreeBase {
  kind: "loop";
  step: LoopOnItemsStep;
  firstLoopAction: StepTreeNode | null;
}

export interface StepTree {
  /** Head of the top-level chain, or null when there are no steps. */
  head: StepTreeNode | null;
  /** All flat-step indices reachable from the tree. */
  reachable: Set<number>;
}

/** Stable name for a step (used as both React Flow node id and parent ref). */
export function stepNodeName(step: WorkflowStep, flatIndex: number): string {
  return step.id ?? `step_${flatIndex}`;
}

interface BuildContext {
  /** All steps grouped by `parentStepName` then `branchIndex`. */
  byParent: Map<string, Map<number, IndexedStep[]>>;
  /** Steps with no parent (top-level chain), in original order. */
  rootChain: IndexedStep[];
  reachable: Set<number>;
}

interface IndexedStep {
  step: WorkflowStep;
  flatIndex: number;
}

function indexSteps(steps: WorkflowStep[]): BuildContext {
  const byParent = new Map<string, Map<number, IndexedStep[]>>();
  const rootChain: IndexedStep[] = [];
  steps.forEach((step, flatIndex) => {
    const entry: IndexedStep = { step, flatIndex };
    const parent = step.parentStepName;
    if (!parent) {
      rootChain.push(entry);
      return;
    }
    const branchIndex = step.branchIndex ?? 0;
    let branches = byParent.get(parent);
    if (!branches) {
      branches = new Map();
      byParent.set(parent, branches);
    }
    let chain = branches.get(branchIndex);
    if (!chain) {
      chain = [];
      branches.set(branchIndex, chain);
    }
    chain.push(entry);
  });
  return { byParent, rootChain, reachable: new Set() };
}

function buildChain(
  ctx: BuildContext,
  chain: IndexedStep[],
): StepTreeNode | null {
  if (chain.length === 0) return null;
  let head: StepTreeNode | null = null;
  let prev: StepTreeNode | null = null;
  chain.forEach(({ step, flatIndex }, i) => {
    const node = buildNode(ctx, step, flatIndex, i + 1);
    if (!head) head = node;
    if (prev) prev.nextAction = node;
    prev = node;
  });
  return head;
}

function buildNode(
  ctx: BuildContext,
  step: WorkflowStep,
  flatIndex: number,
  displayIndex: number,
): StepTreeNode {
  ctx.reachable.add(flatIndex);
  const nodeName = stepNodeName(step, flatIndex);
  const base = {
    nodeName,
    step,
    flatIndex,
    displayIndex,
    nextAction: null as StepTreeNode | null,
  };

  if (step.kind === "router") {
    const branchMap = ctx.byParent.get(nodeName);
    const branches: (StepTreeNode | null)[] = step.branches.map((_b, i) =>
      buildChain(ctx, branchMap?.get(i) ?? []),
    );
    return { ...base, kind: "router", step, branches };
  }

  if (step.kind === "loop_on_items") {
    const branchMap = ctx.byParent.get(nodeName);
    const firstLoopAction = buildChain(ctx, branchMap?.get(0) ?? []);
    return { ...base, kind: "loop", step, firstLoopAction };
  }

  return { ...base, kind: "action" };
}

export function buildStepTree(steps: WorkflowStep[]): StepTree {
  const ctx = indexSteps(steps);
  const head = buildChain(ctx, ctx.rootChain);
  return { head, reachable: ctx.reachable };
}

/**
 * Compute a flat insertion plan for "insert a new step after this node in
 * this chain". Used by edge `+` buttons to know where to splice into the
 * original `WorkflowStep[]`.
 */
export interface InsertionLocation {
  /** Step we are inserting after (null = beginning of the chain). */
  afterFlatIndex: number | null;
  /** Parent step name + branch (omitted for top-level chain). */
  parentStepName?: string;
  branchIndex?: number;
}

/**
 * Splice a new step into a flat array at `loc`. The new step is given the
 * appropriate `parentStepName` / `branchIndex` and inserted directly after
 * the `afterFlatIndex` (or at the very front of its sub-chain if null).
 */
export function insertStep(
  steps: WorkflowStep[],
  newStep: WorkflowStep,
  loc: InsertionLocation,
): WorkflowStep[] {
  const decorated: WorkflowStep = {
    ...newStep,
    parentStepName: loc.parentStepName,
    branchIndex:
      loc.parentStepName !== undefined ? (loc.branchIndex ?? 0) : undefined,
  };
  if (loc.afterFlatIndex === null) {
    // Insert at the head of the matching chain. Find the first index where a
    // step with this parent/branch lives — insert just before it; otherwise
    // append.
    const matchIdx = steps.findIndex(
      (s) =>
        s.parentStepName === loc.parentStepName &&
        (s.branchIndex ?? 0) === (loc.branchIndex ?? 0),
    );
    const next = [...steps];
    if (matchIdx === -1) {
      next.push(decorated);
    } else {
      next.splice(matchIdx, 0, decorated);
    }
    return next;
  }
  const next = [...steps];
  next.splice(loc.afterFlatIndex + 1, 0, decorated);
  return next;
}

/**
 * Remove a step + everything beneath it (children of routers/loops are
 * orphaned otherwise). Returns the new flat array.
 */
export function removeStepAndDescendants(
  steps: WorkflowStep[],
  flatIndex: number,
): WorkflowStep[] {
  const target = steps[flatIndex];
  if (!target) return steps;
  const targetName = stepNodeName(target, flatIndex);

  // Collect descendants by walking the parent map.
  const tombstones = new Set<number>([flatIndex]);
  let changed = true;
  while (changed) {
    changed = false;
    steps.forEach((s, i) => {
      if (tombstones.has(i)) return;
      if (s.parentStepName === undefined) return;
      // Find the flat index of the parent step.
      const parentIdx = steps.findIndex(
        (p, pi) => stepNodeName(p, pi) === s.parentStepName,
      );
      if (parentIdx >= 0 && tombstones.has(parentIdx)) {
        tombstones.add(i);
        changed = true;
      }
    });
    // Account for steps whose parent name matches the deleted step.
    steps.forEach((s, i) => {
      if (tombstones.has(i)) return;
      if (s.parentStepName === targetName) {
        tombstones.add(i);
        changed = true;
      }
    });
  }
  return steps.filter((_, i) => !tombstones.has(i));
}
