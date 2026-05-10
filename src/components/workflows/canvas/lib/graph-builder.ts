import type { Edge, Node } from "@xyflow/react";
import type { WorkflowStep, WorkflowTrigger } from "@/types";
import {
  ARC_LENGTH,
  HORIZONTAL_SPACE_BETWEEN_NODES,
  NODE_H,
  NODE_W,
  VERTICAL_OFFSET_BETWEEN_LOOP_AND_CHILD,
  VERTICAL_OFFSET_BETWEEN_ROUTER_AND_CHILD,
  VERTICAL_SPACE_BETWEEN_STEPS,
} from "./canvas-consts";
import {
  buildStepTree,
  type StepTreeNode,
  type StepTreeRouter,
  type StepTreeLoop,
} from "./step-tree";

export type WfNodeType =
  | "step"
  | "trigger"
  | "addButton"
  | "bigAddButton"
  | "graphEnd"
  | "loopReturn";

export type WfEdgeType =
  | "straight"
  | "loopStart"
  | "loopReturn"
  | "routerStart"
  | "routerEnd";

export type NodeRunStatus =
  | "pending"
  | "running"
  | "done"
  | "failed"
  | "waiting";

export type WorkflowNodeData =
  | {
      kind: "trigger";
      triggerIndex: number;
      triggerKind: WorkflowTrigger["kind"];
      label: string;
      sub: string;
    }
  | {
      kind: "step";
      stepIndex: number;
      stepKind: WorkflowStep["kind"];
      stepName: string;
      label: string;
      sub: string;
      displayIndex: number;
      runStatus?: NodeRunStatus;
    }
  | {
      kind: "addButton";
      /** Where clicking this button should insert a step. */
      afterFlatIndex: number | null;
      parentStepName?: string;
      branchIndex?: number;
    }
  | {
      kind: "bigAddButton";
      afterFlatIndex: number | null;
      parentStepName?: string;
      branchIndex?: number;
    }
  | { kind: "graphEnd"; showWidget: boolean }
  | { kind: "loopReturn" };

export type WfNode = Node<WorkflowNodeData>;

export interface WfEdgeBaseData {
  runActive?: boolean;
  // Index signature so React Flow's edge data constraint
  // (`Record<string, unknown>`) is satisfied.
  [key: string]: unknown;
}

export interface WfStraightEdgeData extends WfEdgeBaseData {
  drawArrowHead: boolean;
  hideAddButton?: boolean;
  insertion?: {
    afterFlatIndex: number | null;
    parentStepName?: string;
    branchIndex?: number;
  };
}

export interface WfRouterStartEdgeData extends WfEdgeBaseData {
  branchLabel: string;
  isFallbackBranch: boolean;
  /** Horizontal offset (positive = right) between router and branch root. */
  drawHorizontalLineTo: number;
  /** Distance from router bottom-edge to first child top-edge. */
  verticalGap: number;
  isFirstBranch: boolean;
  isLastBranch: boolean;
  /** Where clicking the inline `+` should insert. */
  insertion?: {
    afterFlatIndex: number | null;
    parentStepName?: string;
    branchIndex?: number;
  };
}

export interface WfRouterEndEdgeData extends WfEdgeBaseData {
  /** Horizontal distance from this branch tail to the merge x. */
  drawHorizontalLineTo: number;
  /** Length of the vertical line to draw before joining. */
  verticalGap: number;
  isFirstBranch: boolean;
  isLastBranch: boolean;
  drawArrowAtEnd: boolean;
}

export interface WfLoopStartEdgeData extends WfEdgeBaseData {
  isLoopEmpty: boolean;
}

export interface WfLoopReturnEdgeData extends WfEdgeBaseData {
  /** Vertical span of the loop body. */
  verticalSpan: number;
  /** Horizontal half-width to fan out from the loop. */
  horizontalSpan: number;
  drawArrowAfterEnd: boolean;
}

export interface BoundingBox {
  width: number;
  height: number;
  /** Left padding required so that all nodes have x >= 0. */
  left: number;
  /** Right padding to the rightmost edge. */
  right: number;
}

interface SubGraph {
  nodes: WfNode[];
  edges: Edge[];
  /** First node in this subgraph's flow, used by parent edges. */
  entryId?: string;
  /** Last node in this subgraph's flow, used by parent edges. */
  exitId?: string;
}

const empty = (): SubGraph => ({ nodes: [], edges: [] });

function offsetGraph(g: SubGraph, dx: number, dy: number): SubGraph {
  return {
    nodes: g.nodes.map((n) => ({
      ...n,
      position: { x: n.position.x + dx, y: n.position.y + dy },
    })),
    edges: g.edges,
    entryId: g.entryId,
    exitId: g.exitId,
  };
}

function merge(...gs: SubGraph[]): SubGraph {
  const nonEmpty = gs.filter((g) => g.nodes.length > 0);
  return {
    nodes: gs.flatMap((g) => g.nodes),
    edges: gs.flatMap((g) => g.edges),
    entryId: nonEmpty.find((g) => g.entryId)?.entryId,
    exitId: nonEmpty.findLast((g) => g.exitId)?.exitId,
  };
}

/**
 * Compute the bounding box of a sub-graph relative to its origin (0,0 = top
 * of the first step). `left` and `right` are computed assuming each
 * "structural" node (step / bigAddButton / loopReturn) extends NODE_W/2 from
 * its position.x in either direction.
 */
function calculateBoundingBox(g: SubGraph): BoundingBox {
  if (g.nodes.length === 0) {
    return { width: 0, height: 0, left: 0, right: 0 };
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const n of g.nodes) {
    const data = n.data as WorkflowNodeData;
    const isStructural =
      data.kind === "step" ||
      data.kind === "trigger" ||
      data.kind === "bigAddButton" ||
      data.kind === "loopReturn";
    const halfW = isStructural ? NODE_W / 2 : 0;
    const halfH = isStructural ? NODE_H / 2 : 0;
    minX = Math.min(minX, n.position.x - halfW);
    maxX = Math.max(maxX, n.position.x + halfW);
    minY = Math.min(minY, n.position.y - halfH);
    maxY = Math.max(maxY, n.position.y + halfH);
  }
  return {
    width: maxX - minX,
    height: maxY - minY,
    left: -minX + NODE_W / 2,
    right: maxX - NODE_W / 2,
  };
}

interface BuildOpts {
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  triggerLabel: (t: WorkflowTrigger, i: number) => { label: string; sub: string };
  stepLabel: (
    s: WorkflowStep,
    flatIndex: number,
    displayIndex: number,
  ) => { label: string; sub: string };
  stepRunStatus?: Record<number, NodeRunStatus>;
}

function makeStepNode(
  treeNode: StepTreeNode,
  opts: BuildOpts,
): WfNode {
  const { label, sub } = opts.stepLabel(
    treeNode.step,
    treeNode.flatIndex,
    treeNode.displayIndex,
  );
  return {
    id: treeNode.nodeName,
    type: "step",
    position: { x: 0, y: 0 },
    data: {
      kind: "step",
      stepIndex: treeNode.flatIndex,
      stepKind: treeNode.step.kind,
      stepName: treeNode.nodeName,
      label,
      sub,
      displayIndex: treeNode.displayIndex,
      runStatus: opts.stepRunStatus?.[treeNode.flatIndex],
    },
  };
}

function makeStraightEdge(
  source: string,
  target: string,
  data: WfStraightEdgeData,
  idHint: string,
): Edge {
  return {
    id: `${idHint}__${source}->${target}`,
    source,
    target,
    type: "straight",
    data,
  } as Edge;
}

function makeBigAddButton(
  parentName: string,
  branchIndex: number | undefined,
  parentStepName: string,
): WfNode {
  return {
    id: `${parentName}__big-add__${branchIndex ?? 0}`,
    type: "bigAddButton",
    position: { x: 0, y: 0 },
    data: {
      kind: "bigAddButton",
      afterFlatIndex: null,
      parentStepName,
      branchIndex,
    },
    selectable: false,
  };
}

function makeGraphEnd(
  id: string,
  showWidget: boolean,
  y: number,
): WfNode {
  return {
    id,
    type: "graphEnd",
    position: { x: 0, y },
    data: { kind: "graphEnd", showWidget },
    selectable: false,
  };
}

function buildLoopChild(loop: StepTreeLoop, opts: BuildOpts): SubGraph {
  if (!loop.firstLoopAction) {
    // Empty loop body: render a BigAddButton centered under the loop.
    const big = makeBigAddButton(loop.nodeName, 0, loop.nodeName);
    big.position = { x: 0, y: 0 };
    return { nodes: [big], edges: [], entryId: big.id, exitId: big.id };
  }
  return buildChainGraph(loop.firstLoopAction, opts);
}

function buildLoopGraph(loop: StepTreeLoop, opts: BuildOpts): SubGraph {
  const child = buildLoopChild(loop, opts);
  const childBox = calculateBoundingBox(child);
  // Offset child below the loop step, with a vertical gap.
  const childOffsetX = NODE_W + HORIZONTAL_SPACE_BETWEEN_NODES;
  const childOffsetY =
    NODE_H + VERTICAL_OFFSET_BETWEEN_LOOP_AND_CHILD;
  const offsetChild = offsetGraph(child, childOffsetX, childOffsetY);

  const isLoopEmpty = !loop.firstLoopAction;
  const childHeadId =
    offsetChild.entryId ??
    offsetChild.nodes[0]?.id ??
    `${loop.nodeName}__big-add__0`;
  const childTailId = offsetChild.exitId ?? childHeadId;

  // Loop start edge (top → child head) and loop return edge (child tail → loop)
  const startEdge: Edge = {
    id: `${loop.nodeName}__loop-start`,
    source: loop.nodeName,
    target: childHeadId,
    type: "loopStart",
    data: { isLoopEmpty } as WfLoopStartEdgeData,
  };

  // The loop-return node anchors the right-side return arc.
  const loopReturnNode: WfNode = {
    id: `${loop.nodeName}__loop-return`,
    type: "loopReturn",
    position: {
      x: 0,
      y: childOffsetY + childBox.height + ARC_LENGTH,
    },
    data: { kind: "loopReturn" },
    selectable: false,
  };

  const returnEdge: Edge = {
    id: `${loop.nodeName}__loop-return-edge`,
    source: childTailId,
    target: loopReturnNode.id,
    type: "loopReturn",
    data: {
      verticalSpan: childBox.height + VERTICAL_SPACE_BETWEEN_STEPS,
      horizontalSpan: childBox.right + ARC_LENGTH,
      drawArrowAfterEnd: true,
    } as WfLoopReturnEdgeData,
  };

  // Graph-end anchor below everything. Parent-chain edges must continue from
  // this anchor, not from the loop card itself; otherwise the continuation
  // line cuts through the loop body.
  const subEnd = makeGraphEnd(
    `${loop.nodeName}__loop-end`,
    false,
    childOffsetY + childBox.height + ARC_LENGTH + VERTICAL_SPACE_BETWEEN_STEPS,
  );

  const exitEdge = makeStraightEdge(
    loopReturnNode.id,
    subEnd.id,
    { drawArrowHead: false, hideAddButton: true },
    "loop-exit",
  );

  return {
    nodes: [...offsetChild.nodes, loopReturnNode, subEnd],
    edges: [startEdge, returnEdge, exitEdge, ...offsetChild.edges],
    entryId: childHeadId,
    exitId: subEnd.id,
  };
}

function buildRouterChildren(
  router: StepTreeRouter,
  opts: BuildOpts,
): SubGraph {
  const branchGraphs: SubGraph[] = router.branches.map((branch) => {
    if (branch.head) return buildChainGraph(branch.head, opts);
    // Empty branch: BigAddButton placeholder. No graphEnd needed — the
    // router-end edge will source from the BigAddButton itself.
    const big = makeBigAddButton(
      router.nodeName,
      branch.branchIndex,
      router.nodeName,
    );
    big.position = { x: 0, y: 0 };
    return { nodes: [big], edges: [], entryId: big.id, exitId: big.id };
  });

  const branchBoxes = branchGraphs.map(calculateBoundingBox);

  // Offset each branch horizontally so its left margin abuts the previous
  // branch's right margin + spacing. Track the merge x-coordinate per branch.
  const offsetsX: number[] = [];
  let cursor = 0;
  branchBoxes.forEach((box, i) => {
    const leftPad = box.left;
    const rightPad = box.right;
    if (i === 0) {
      offsetsX.push(leftPad);
      cursor = leftPad + rightPad + HORIZONTAL_SPACE_BETWEEN_NODES;
    } else {
      offsetsX.push(cursor + leftPad);
      cursor += leftPad + rightPad + HORIZONTAL_SPACE_BETWEEN_NODES;
    }
  });
  // Center the cluster around x=0 (under the router).
  const totalWidth = cursor - HORIZONTAL_SPACE_BETWEEN_NODES;
  const centerShift = -totalWidth / 2;
  const centeredOffsets = offsetsX.map((x) => x + centerShift);

  const childOffsetY = NODE_H + VERTICAL_OFFSET_BETWEEN_ROUTER_AND_CHILD;
  const placedBranches: SubGraph[] = branchGraphs.map((g, i) =>
    offsetGraph(g, centeredOffsets[i], childOffsetY),
  );

  // Determine maximum branch height to position the merge end node.
  const maxHeight = Math.max(...branchBoxes.map((b) => b.height), 0);
  const mergeY = childOffsetY + maxHeight + VERTICAL_SPACE_BETWEEN_STEPS;

  // Branch closest to the merge column (smallest |centeredOffset|) draws the
  // arrow head into the merge node. This stays correct under reorder/delete.
  const arrowBranchIdx = centeredOffsets.reduce(
    (best, x, i, arr) => (Math.abs(x) < Math.abs(arr[best]) ? i : best),
    0,
  );

  // Router start edges: from router → first node of each branch.
  const startEdges: Edge[] = placedBranches.map((g, i) => {
    const branch = router.branches[i];
    const headId = g.entryId ?? g.nodes[0]?.id;
    return {
      id: `${router.nodeName}__rs-${i}`,
      source: router.nodeName,
      target: headId,
      type: "routerStart",
      data: {
        branchLabel: branch.label,
        isFallbackBranch: branch.isFallback,
        drawHorizontalLineTo: centeredOffsets[i],
        verticalGap: VERTICAL_OFFSET_BETWEEN_ROUTER_AND_CHILD,
        isFirstBranch: i === 0,
        isLastBranch: i === placedBranches.length - 1,
        insertion: {
          afterFlatIndex: null,
          parentStepName: router.nodeName,
          branchIndex: branch.branchIndex,
        },
      } as WfRouterStartEdgeData,
    } as Edge;
  });

  // Router end node — merges branches back together.
  const mergeEndNode = makeGraphEnd(
    `${router.nodeName}__router-merge`,
    false,
    mergeY,
  );

  // Router end edges: from each branch tail → mergeEndNode.
  const endEdges: Edge[] = placedBranches
    .map((g, i) => {
      const tailId = g.exitId;
      if (!tailId) return null;
      return {
        id: `${router.nodeName}__re-${i}`,
        source: tailId,
        target: mergeEndNode.id,
        type: "routerEnd",
        data: {
          drawHorizontalLineTo: -centeredOffsets[i],
          verticalGap: mergeY - (childOffsetY + branchBoxes[i].height),
          isFirstBranch: i === 0,
          isLastBranch: i === placedBranches.length - 1,
          drawArrowAtEnd: i === arrowBranchIdx,
        } as WfRouterEndEdgeData,
      } as Edge;
    })
    .filter(Boolean) as Edge[];

  return {
    nodes: [
      ...placedBranches.flatMap((g) => g.nodes),
      mergeEndNode,
    ],
    edges: [
      ...startEdges,
      ...endEdges,
      ...placedBranches.flatMap((g) => g.edges),
    ],
    exitId: mergeEndNode.id,
  };
}

/** Build the graph for a single chain (linked list of step-tree nodes). */
function buildChainGraph(head: StepTreeNode, opts: BuildOpts): SubGraph {
  let result: SubGraph = empty();
  let cursorY = 0;
  let prevNodeId: string | null = null;
  let prevFlatIndex: number | null = null;
  let prevParentInfo: {
    parentStepName?: string;
    branchIndex?: number;
  } = {};

  let cur: StepTreeNode | null = head;

  while (cur) {
    const stepNode = makeStepNode(cur, opts);
    stepNode.position = { x: 0, y: cursorY };

    let stepGraph: SubGraph = {
      nodes: [stepNode],
      edges: [],
      entryId: stepNode.id,
      exitId: stepNode.id,
    };

    // For routers / loops, build child graph and merge.
    if (cur.kind === "loop") {
      const loopGraph = buildLoopGraph(cur, opts);
      stepGraph = merge(stepGraph, offsetGraph(loopGraph, 0, cursorY));
    } else if (cur.kind === "router") {
      const routerGraph = buildRouterChildren(cur, opts);
      stepGraph = merge(stepGraph, offsetGraph(routerGraph, 0, cursorY));
    }

    // Connect to previous step (straight edge).
    if (prevNodeId) {
      result.edges.push(
        makeStraightEdge(
          prevNodeId,
          stepNode.id,
          {
            drawArrowHead: true,
            insertion: {
              afterFlatIndex: prevFlatIndex,
              parentStepName: prevParentInfo.parentStepName,
              branchIndex: prevParentInfo.branchIndex,
            },
          },
          "between",
        ),
      );
    }

    result = merge(result, stepGraph);

    // Advance cursor past the entire stepGraph height.
    const box = calculateBoundingBox(stepGraph);
    cursorY = stepNode.position.y + Math.max(box.height, NODE_H) + VERTICAL_SPACE_BETWEEN_STEPS;
    prevNodeId = stepGraph.exitId ?? stepNode.id;
    prevFlatIndex = cur.flatIndex;
    prevParentInfo = {
      parentStepName: cur.step.parentStepName,
      branchIndex: cur.step.branchIndex,
    };
    cur = cur.nextAction;
  }

  // Append a graphEnd node at the very end of the chain (with `+` button to
  // append at end). Caller decides if `showWidget` should be true.
  const endY = cursorY;
  const endNode = makeGraphEnd(
    `${head.nodeName}__chain-end`,
    false,
    endY,
  );
  result.nodes.push(endNode);
  if (prevNodeId) {
    result.edges.push(
      makeStraightEdge(
        prevNodeId,
        endNode.id,
        {
          drawArrowHead: false,
          insertion: {
            afterFlatIndex: prevFlatIndex,
            parentStepName: prevParentInfo.parentStepName,
            branchIndex: prevParentInfo.branchIndex,
          },
        },
        "tail",
      ),
    );
  }

  result.entryId ??= head.nodeName;
  result.exitId = endNode.id;

  return result;
}

/** Build a single trigger node. */
function makeTriggerNode(
  t: WorkflowTrigger,
  i: number,
  opts: BuildOpts,
): WfNode {
  const { label, sub } = opts.triggerLabel(t, i);
  return {
    id: `trigger-${i}`,
    type: "trigger",
    position: { x: 0, y: 0 },
    data: {
      kind: "trigger",
      triggerIndex: i,
      triggerKind: t.kind,
      label,
      sub,
    },
    selectable: true,
  };
}

/**
 * Top-level entry point. Returns nodes + edges with absolute coordinates.
 */
export function buildWorkflowGraph(opts: BuildOpts): {
  nodes: WfNode[];
  edges: Edge[];
} {
  const { triggers, steps } = opts;
  const tree = buildStepTree(steps);

  // Layout triggers stacked vertically at the top, last one connects to the
  // step chain (or to a graph-end if there are no steps).
  const triggerNodes: WfNode[] = triggers.map((t, i) => {
    const n = makeTriggerNode(t, i, opts);
    n.position = { x: 0, y: i * (NODE_H + VERTICAL_SPACE_BETWEEN_STEPS) };
    return n;
  });
  const lastTriggerY =
    triggers.length > 0
      ? (triggers.length - 1) * (NODE_H + VERTICAL_SPACE_BETWEEN_STEPS)
      : 0;
  const stepChainOffsetY =
    triggers.length > 0
      ? lastTriggerY + NODE_H + VERTICAL_SPACE_BETWEEN_STEPS
      : 0;

  // Build step chain graph.
  let chainGraph: SubGraph = empty();
  if (tree.head) {
    chainGraph = buildChainGraph(tree.head, opts);
    chainGraph = offsetGraph(chainGraph, 0, stepChainOffsetY);
  }

  // Trigger → step edge (from last trigger to first step, or to a graphEnd if no steps)
  const result: SubGraph = empty();
  result.nodes.push(...triggerNodes);
  // Inter-trigger straight edges.
  for (let i = 1; i < triggerNodes.length; i++) {
    result.edges.push(
      makeStraightEdge(
        triggerNodes[i - 1].id,
        triggerNodes[i].id,
        { drawArrowHead: true, hideAddButton: true },
        "trig",
      ),
    );
  }

  if (tree.head && chainGraph.entryId) {
    const lastTriggerId = triggerNodes[triggerNodes.length - 1]?.id;
    if (lastTriggerId) {
      result.edges.push(
        makeStraightEdge(
          lastTriggerId,
          chainGraph.entryId,
          {
            drawArrowHead: true,
            insertion: {
              afterFlatIndex: null,
              parentStepName: undefined,
              branchIndex: undefined,
            },
          },
          "trig-step",
        ),
      );
    }
    result.nodes.push(...chainGraph.nodes);
    result.edges.push(...chainGraph.edges);
  } else {
    // No steps: add a chain end with `+` insertion at index 0 of root chain.
    const endNode = makeGraphEnd("root-chain-end", true, stepChainOffsetY);
    result.nodes.push(endNode);
    const lastTriggerId = triggerNodes[triggerNodes.length - 1]?.id;
    if (lastTriggerId) {
      result.edges.push(
        makeStraightEdge(
          lastTriggerId,
          endNode.id,
          {
            drawArrowHead: false,
            insertion: { afterFlatIndex: null },
          },
          "trig-end",
        ),
      );
    }
  }

  // Mark the root-chain end as the "show End widget" anchor.
  const rootEnd = result.nodes.findLast(
    (n) =>
      (n.data as WorkflowNodeData).kind === "graphEnd" &&
      n.id.endsWith("__chain-end"),
  );
  if (rootEnd) {
    (rootEnd.data as { kind: "graphEnd"; showWidget: boolean }).showWidget = true;
  }

  return { nodes: result.nodes, edges: result.edges };
}

/**
 * Map workflow run events to per-flat-index status. Mirrors the prior
 * implementation but is exported here so the run view can keep using it.
 */
export function computeStepRunStatus(
  events: { eventType: string; stepIndex: number | null }[],
  runStatus: "running" | "waiting" | "completed" | "failed" | "cancelled",
): Record<number, NodeRunStatus> {
  const map: Record<number, NodeRunStatus> = {};
  for (const e of events) {
    if (e.stepIndex == null) continue;
    if (e.eventType === "step_started") map[e.stepIndex] = "running";
    else if (e.eventType === "step_completed") map[e.stepIndex] = "done";
    else if (e.eventType === "step_failed") map[e.stepIndex] = "failed";
    else if (e.eventType === "wait_scheduled") map[e.stepIndex] = "waiting";
  }
  if (runStatus === "completed") {
    Object.keys(map).forEach((k) => {
      if (map[+k] === "running") map[+k] = "done";
    });
  }
  return map;
}
