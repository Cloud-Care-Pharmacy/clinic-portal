/**
 * Layout constants for the workflow canvas. Adapted from activepieces'
 * `flow-canvas/utils/consts.ts` and tuned to our smaller node footprint.
 *
 * The graph builder positions every node in absolute coordinates; nothing
 * here is responsive — `<ReactFlow>` handles viewport zoom/pan separately.
 */

export const NODE_W = 240;
export const NODE_H = 70;

export const ADD_BUTTON_SIZE = 18;
export const BIG_ADD_BUTTON_SIZE = 50;

export const VERTICAL_SPACE_BETWEEN_STEPS = 70;
export const HORIZONTAL_SPACE_BETWEEN_NODES = 80;

export const VERTICAL_OFFSET_BETWEEN_LOOP_AND_CHILD = 90;
export const VERTICAL_OFFSET_BETWEEN_ROUTER_AND_CHILD = 110;
export const VERTICAL_SPACE_BETWEEN_STEP_AND_LINE = 6;

export const ARC_LENGTH = 14;
export const LABEL_HEIGHT = 22;
export const LABEL_VERTICAL_PADDING = 6;
export const LINE_WIDTH = 1.4;

export const ARC_LEFT = `a${ARC_LENGTH},${ARC_LENGTH} 0 0,0 -${ARC_LENGTH},${ARC_LENGTH}`;
export const ARC_RIGHT = `a${ARC_LENGTH},${ARC_LENGTH} 0 0,1 ${ARC_LENGTH},${ARC_LENGTH}`;
export const ARC_LEFT_DOWN = `a${ARC_LENGTH},${ARC_LENGTH} 0 0,1 -${ARC_LENGTH},${ARC_LENGTH}`;
export const ARC_RIGHT_DOWN = `a${ARC_LENGTH},${ARC_LENGTH} 0 0,0 ${ARC_LENGTH},${ARC_LENGTH}`;
export const ARC_RIGHT_UP = `a${ARC_LENGTH},${ARC_LENGTH} 0 0,1 -${ARC_LENGTH},-${ARC_LENGTH}`;
export const ARC_LEFT_UP = `a-${ARC_LENGTH},-${ARC_LENGTH} 0 0,0 ${ARC_LENGTH},-${ARC_LENGTH}`;

export const ARROW_DOWN_PATH = "M-5,-4 L0,1 L5,-4";

export const HANDLE_STYLING = {
  opacity: 0,
  cursor: "default" as const,
  width: 1,
  height: 1,
  background: "transparent",
  border: "none",
};

export const STROKE = "var(--input)";
export const STROKE_HIGHLIGHTED = "var(--primary)";
