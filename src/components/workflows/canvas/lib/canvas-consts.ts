/**
 * Layout constants for the workflow canvas. Adapted from activepieces'
 * `flow-canvas/utils/consts.ts` and tuned to our smaller node footprint.
 *
 * The graph builder positions every node in absolute coordinates; nothing
 * here is responsive — `<ReactFlow>` handles viewport zoom/pan separately.
 */

import type { WorkflowNoteColor } from "@/types";

export const NODE_W = 240;
export const NODE_H = 70;

// ActivePieces sizing for the inline "+" buttons and arc geometry — keeping
// these aligned exactly so the loop edge visuals are pixel-identical.
export const ADD_BUTTON_SIZE = 20;
// Placeholder `+` rendered in empty router branches / loop bodies. Sized to
// match the inline edge `+` button so the visual weight is consistent.
export const BIG_ADD_BUTTON_SIZE = ADD_BUTTON_SIZE;

export const VERTICAL_SPACE_BETWEEN_STEPS = 70;
export const HORIZONTAL_SPACE_BETWEEN_NODES = 80;

export const ARC_LENGTH = 15;
export const VERTICAL_SPACE_BETWEEN_STEP_AND_LINE = 7;

// AP formula: VSPACE * 1.5 + 2 * ARC. Keeps loop-body breathing room
// proportional to the inter-step spacing.
export const VERTICAL_OFFSET_BETWEEN_LOOP_AND_CHILD =
  VERTICAL_SPACE_BETWEEN_STEPS * 1.5 + 2 * ARC_LENGTH;
export const VERTICAL_OFFSET_BETWEEN_ROUTER_AND_CHILD =
  VERTICAL_OFFSET_BETWEEN_LOOP_AND_CHILD + 30;

export const LABEL_HEIGHT = 22;
export const LABEL_VERTICAL_PADDING = 6;
export const LINE_WIDTH = 1.5;

// SVG arc fragments matching ActivePieces (`flow-canvas/utils/consts.ts`).
// All four are quarter-circles of radius ARC_LENGTH.
export const ARC_LEFT = `a${ARC_LENGTH},${ARC_LENGTH} 0 0,0 -${ARC_LENGTH},${ARC_LENGTH}`;
export const ARC_RIGHT = `a${ARC_LENGTH},${ARC_LENGTH} 0 0,1 ${ARC_LENGTH},${ARC_LENGTH}`;
export const ARC_LEFT_DOWN = `a${ARC_LENGTH},${ARC_LENGTH} 0 0,1 -${ARC_LENGTH},${ARC_LENGTH}`;
export const ARC_RIGHT_DOWN = `a${ARC_LENGTH},${ARC_LENGTH} 0 0,0 ${ARC_LENGTH},${ARC_LENGTH}`;
export const ARC_RIGHT_UP = `a${ARC_LENGTH},${ARC_LENGTH} 0 0,1 -${ARC_LENGTH},-${ARC_LENGTH}`;

// Inline chevrons drawn at the end of an SVG path (relative `m`/`l` cmds).
// AP uses these instead of marker-end so the chevron color/width tracks the
// stroke automatically. Verbatim from AP.
export const ARROW_DOWN_CHEVRON = "m6 -6 l-6 6 m-6 -6 l6 6";
export const ARROW_RIGHT_CHEVRON = " m-5 -6 l6 6  m-6 0 m6 0 l-6 6 m3 -6";

// Legacy marker-end arrow (kept for non-loop edges that still rely on it).
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

// ─── Notes ────────────────────────────────────────────────────────────
//
// Sticky-note annotations are non-executable canvas objects. They sit
// alongside steps/triggers in the same React Flow viewport but use their
// own dedicated node type with per-node `draggable` enabled.

export const NOTE_DEFAULT_WIDTH = 240;
export const NOTE_DEFAULT_HEIGHT = 160;
export const NOTE_MIN_WIDTH = 140;
export const NOTE_MIN_HEIGHT = 100;

/**
 * Color palette for sticky notes. Maps each note-color key to a pair of
 * CSS variables from the design system's `--status-*` family (defined in
 * `globals.css`), so notes inherit theme-aware tints without introducing
 * new tokens or banned Tailwind palette classes. Applied via inline
 * `style={{ background, borderColor }}` on `NoteNode`.
 *
 * The mapping is purely visual — note colors carry no semantic meaning
 * (a "red" note is not a danger marker), but reusing the status tokens
 * keeps the palette consistent with the rest of the app.
 */
export const NOTE_COLORS: Record<
  WorkflowNoteColor,
  { bg: string; border: string; label: string }
> = {
  yellow: {
    bg: "var(--status-warning-bg)",
    border: "var(--status-warning-border)",
    label: "Yellow",
  },
  blue: {
    bg: "var(--status-info-bg)",
    border: "var(--status-info-border)",
    label: "Blue",
  },
  green: {
    bg: "var(--status-success-bg)",
    border: "var(--status-success-border)",
    label: "Green",
  },
  pink: {
    bg: "var(--status-danger-bg)",
    border: "var(--status-danger-border)",
    label: "Pink",
  },
  purple: {
    bg: "var(--status-accent-bg)",
    border: "var(--status-accent-border)",
    label: "Purple",
  },
  gray: {
    bg: "var(--muted)",
    border: "var(--border)",
    label: "Gray",
  },
};

export const NOTE_COLOR_KEYS: WorkflowNoteColor[] = [
  "yellow",
  "blue",
  "green",
  "pink",
  "purple",
  "gray",
];

export const NOTE_DEFAULT_COLOR: WorkflowNoteColor = "yellow";
