import type { CSSProperties } from "react";
import { LINE_WIDTH, STROKE, STROKE_HIGHLIGHTED } from "./canvas-consts";
import type { NodeRunStatus } from "./graph-builder";

/**
 * Map a target step's run status to an edge stroke colour. Returns `null`
 * when no run-aware paint should apply (e.g. `pending` or no status), so
 * callers can fall back to the legacy `runActive` highlight used by the
 * editor canvas.
 */
function strokeForStatus(status: NodeRunStatus | undefined): string | null {
  switch (status) {
    case "done":
      return "var(--status-success-fg)";
    case "failed":
      return "var(--status-danger-fg)";
    case "running":
      return "var(--primary)";
    case "waiting":
      return "var(--status-warning-fg)";
    case "pending":
    default:
      return null;
  }
}

export interface EdgePaint {
  stroke: string;
  strokeWidth: number;
  /** SVG `stroke-dasharray` string, or `undefined` for solid. */
  strokeDasharray?: string;
  /** Inline `style` to apply to the path (carries the flow animation). */
  style?: CSSProperties;
}

/**
 * Resolve the visual paint for an edge based on the run status of its
 * target step.
 *
 *  - `running` target → primary stroke + flowing dashes (the n8n-style
 *    "data flowing" effect).
 *  - `done` / `failed` / `waiting` target → status-tinted solid stroke,
 *    slightly thicker than the default so the path reads as "settled".
 *  - No status → falls back to the editor's `runActive` highlight or the
 *    default border colour.
 */
export function edgePaintForStatus(
  runStatus: NodeRunStatus | undefined,
  runActive: boolean | undefined,
): EdgePaint {
  const statusStroke = strokeForStatus(runStatus);
  const stroke = statusStroke ?? (runActive ? STROKE_HIGHLIGHTED : STROKE);
  const isFlowing = runStatus === "running";
  return {
    stroke,
    strokeWidth: statusStroke ? LINE_WIDTH + 0.6 : LINE_WIDTH,
    strokeDasharray: isFlowing ? "6 4" : undefined,
    style: isFlowing
      ? { animation: "wf-edge-flow 0.7s linear infinite" }
      : undefined,
  };
}
