import {
  FALLBACK_BRANCH_INDEX,
  type LoopOnItemsStep,
  type RouterStep,
  type WorkflowStep,
} from "@/types";

/**
 * In-memory tree representation of a flat workflow `steps[]`. Each node
 * carries its original step + a generated `nodeName` (used as React Flow
 * node id) + optional children for routers and loops.
 *
 * Top-level chain: linked list via `nextAction`.
 *
 * - `RouterStep` → `branches[i]` is one branch (regular or fallback).
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

/** A single branch (regular or fallback) of a router. */
export interface StepTreeBranch {
  /** Display label rendered above the branch. */
  label: string;
  /**
   * `branchIndex` value used to tag child steps in the flat array. Regular
   * branches use `0..N-1`; the fallback branch uses
   * `FALLBACK_BRANCH_INDEX` (`-1`).
   */
  branchIndex: number;
  /** True when this branch is the router's fallback / "otherwise" arm. */
  isFallback: boolean;
  /** Head of the chain inside this branch, or null when empty. */
  head: StepTreeNode | null;
}

export interface StepTreeRouter extends StepTreeBase {
  kind: "router";
  step: RouterStep;
  branches: StepTreeBranch[];
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

function buildRouterBranches(
  ctx: BuildContext,
  router: RouterStep,
  parentName: string,
): StepTreeBranch[] {
  const branchMap = ctx.byParent.get(parentName);
  const out: StepTreeBranch[] = router.branches.map((b, i) => ({
    label: b.name || `Branch ${i + 1}`,
    branchIndex: i,
    isFallback: false,
    head: buildChain(ctx, branchMap?.get(i) ?? []),
  }));
  if (router.fallback) {
    out.push({
      label: router.fallback.name || "Otherwise",
      branchIndex: FALLBACK_BRANCH_INDEX,
      isFallback: true,
      head: buildChain(ctx, branchMap?.get(FALLBACK_BRANCH_INDEX) ?? []),
    });
  }
  return out;
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
    return {
      ...base,
      kind: "router",
      step,
      branches: buildRouterBranches(ctx, step, nodeName),
    };
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
 *
 * Returns the new array and the inserted index for callers that need it.
 */
export function insertStep(
  steps: WorkflowStep[],
  newStep: WorkflowStep,
  loc: InsertionLocation,
): { steps: WorkflowStep[]; insertedAt: number } {
  const decorated: WorkflowStep = {
    ...newStep,
    parentStepName: loc.parentStepName,
    branchIndex:
      loc.parentStepName !== undefined ? (loc.branchIndex ?? 0) : undefined,
  };
  if (loc.afterFlatIndex === null) {
    const matchIdx = steps.findIndex(
      (s) =>
        s.parentStepName === loc.parentStepName &&
        (s.branchIndex ?? 0) === (loc.branchIndex ?? 0),
    );
    const next = [...steps];
    const insertedAt = matchIdx === -1 ? next.length : matchIdx;
    next.splice(insertedAt, 0, decorated);
    return { steps: next, insertedAt };
  }
  const next = [...steps];
  const insertedAt = loc.afterFlatIndex + 1;
  next.splice(insertedAt, 0, decorated);
  return { steps: next, insertedAt };
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

  // Build name → index map once.
  const nameToIndex = new Map<string, number>();
  steps.forEach((s, i) => nameToIndex.set(stepNodeName(s, i), i));

  // Build parent → children index by walking once.
  const childrenOf = new Map<number, number[]>();
  steps.forEach((s, i) => {
    if (!s.parentStepName) return;
    const parentIdx = nameToIndex.get(s.parentStepName);
    if (parentIdx === undefined) return;
    const list = childrenOf.get(parentIdx);
    if (list) list.push(i);
    else childrenOf.set(parentIdx, [i]);
  });

  // BFS from the target, marking every descendant.
  const tombstones = new Set<number>([flatIndex]);
  const queue: number[] = [flatIndex];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const child of childrenOf.get(cur) ?? []) {
      if (!tombstones.has(child)) {
        tombstones.add(child);
        queue.push(child);
      }
    }
  }
  return steps.filter((_, i) => !tombstones.has(i));
}

/**
 * Rename a step's id and propagate the rename to every descendant's
 * `parentStepName`. Returns the updated flat array. Use this whenever a
 * router or loop step's id changes from the inspector — direct in-place
 * mutation will silently orphan the children.
 */
export function renameStepId(
  steps: WorkflowStep[],
  flatIndex: number,
  newId: string | undefined,
): WorkflowStep[] {
  const target = steps[flatIndex];
  if (!target) return steps;
  const oldName = stepNodeName(target, flatIndex);
  const updated: WorkflowStep = { ...target, id: newId || undefined };
  const newName = stepNodeName(updated, flatIndex);
  if (oldName === newName) {
    const next = [...steps];
    next[flatIndex] = updated;
    return next;
  }
  return steps.map((s, i) => {
    if (i === flatIndex) return updated;
    if (s.parentStepName === oldName) {
      return { ...s, parentStepName: newName };
    }
    return s;
  });
}
