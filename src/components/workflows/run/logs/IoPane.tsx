"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  CircleDashed,
  Clock,
  Hourglass,
  Info,
  RotateCcw,
  TimerOff,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { JsonTreeViewer } from "@/components/shared/JsonTreeViewer";
import { cn } from "@/lib/utils";
import { fetchCapturePayload } from "@/lib/hooks/use-workflow-runs";
import { STEP_KIND_CONFIG } from "../../canvas/lib/node-kind-config";
import type {
  WorkflowRunStep,
  WorkflowRunStepCaptureTruncated,
  WorkflowRunTimelineRow,
  WorkflowStepCaptureMode,
  WorkflowStepKind,
  WorkflowStep,
} from "@/types";

export interface IoPaneProps {
  runId: string;
  row: WorkflowRunTimelineRow | null;
  /**
   * Per-step projection entry for the same `stepIndex` as `row`. When
   * present, its `input` / `output` / `captureTruncated` fields are the
   * primary source for the IO panes (the gateway already redacts and caps
   * these server-side).
   */
  runStep?: WorkflowRunStep | null;
  /** Definition step at `row.stepIndex`. Used to detect `capture: 'none'` /
   * `sensitive: true` so we can deep-link the user back to the editor. */
  definitionStep?: WorkflowStep;
  /** Edit URL for the workflow definition (deep-link on disabled-capture). */
  editHref?: string;
}

/**
 * The gateway clips inline `input` / `output` payloads at 2 KB and replaces
 * the value with a `{ truncated, originalBytes, preview }` envelope. The
 * preview is already stringified — render it verbatim, not as JSON.
 */
function isTruncatedEnvelope(
  v: unknown
): v is WorkflowRunStepCaptureTruncated {
  return (
    typeof v === "object" &&
    v !== null &&
    (v as { truncated?: unknown }).truncated === true &&
    typeof (v as { preview?: unknown }).preview === "string"
  );
}

const STATUS_META: Record<
  WorkflowRunTimelineRow["status"],
  { label: string; tone: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  pending: { label: "Pending", tone: "text-muted-foreground", Icon: CircleDashed },
  running: { label: "Running", tone: "text-status-warning-fg", Icon: CircleDashed },
  success: { label: "Success", tone: "text-status-success-fg", Icon: Check },
  error: { label: "Failed", tone: "text-status-danger-fg", Icon: AlertTriangle },
  waiting: { label: "Waiting", tone: "text-status-warning-fg", Icon: Hourglass },
  retrying: { label: "Retrying", tone: "text-status-warning-fg", Icon: RotateCcw },
  timed_out: { label: "Timed out", tone: "text-status-danger-fg", Icon: TimerOff },
};

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return "";
  if (ms < 1000) return `${Math.max(0, Math.round(ms))}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function IoPane({
  runId,
  row,
  runStep,
  definitionStep,
  editHref,
}: IoPaneProps) {
  if (!row) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        Select a step to view its input and output.
      </div>
    );
  }

  const config = STEP_KIND_CONFIG[row.stepKind as WorkflowStepKind];
  const Icon = config?.icon ?? Clock;
  const label = config?.label ?? row.stepKind;
  const status = STATUS_META[row.status];
  const dur = formatDuration(row.durationMs);
  // Capture is disabled by definition (`capture: 'none'` or `sensitive: true`)
  // *and* the server returned no inline payload + no legacy capture row.
  // The inline projection is the new authoritative source — when it carries
  // a value we render it even if a legacy capture row is missing.
  const hasInlineInput = runStep?.input !== undefined && runStep?.input !== null;
  const hasInlineOutput =
    runStep?.output !== undefined && runStep?.output !== null;
  const captureDisabled =
    row.capture === null &&
    !hasInlineInput &&
    !hasInlineOutput &&
    (definitionStep?.sensitive === true || definitionStep?.capture === "none");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-border/60 px-4 py-3">
        <div
          className="flex size-7 items-center justify-center rounded-md border"
          style={{
            background: config?.bg,
            color: config?.fg,
            borderColor: config?.border,
          }}
        >
          <Icon className="size-3.5" />
        </div>
        <h3 className="text-sm font-semibold">{label}</h3>
        <div className={cn("flex items-center gap-1.5 text-xs", status.tone)}>
          <status.Icon
            className={cn("size-3", row.status === "running" && "animate-spin")}
          />
          <span>
            {status.label}
            {dur ? ` in ${dur}` : ""}
          </span>
        </div>
        <span
          className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground"
          title="Sensitive headers and identifiers are automatically redacted (***)."
        >
          <Info className="size-3" />
          Redacted
        </span>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 lg:grid-cols-2">
        <IoSide
          runId={runId}
          row={row}
          side="input"
          inlineValue={runStep ? runStep.input : undefined}
          inlineTruncated={runStep?.captureTruncated ?? false}
          captureDisabled={captureDisabled}
          editHref={editHref}
        />
        <IoSide
          runId={runId}
          row={row}
          side="output"
          inlineValue={runStep ? runStep.output : undefined}
          inlineTruncated={runStep?.captureTruncated ?? false}
          captureDisabled={captureDisabled}
          editHref={editHref}
          errorMessage={row.errorMessage}
        />
      </div>
    </div>
  );
}

interface IoSideProps {
  runId: string;
  row: WorkflowRunTimelineRow;
  side: "input" | "output";
  /**
   * Inline value from the per-step projection. `undefined` means "no
   * projection available — fall back to the legacy capture row". `null`
   * means "projection present but no payload was captured".
   */
  inlineValue?: unknown;
  /** `WorkflowRunStep.captureTruncated` for the matching step. */
  inlineTruncated?: boolean;
  captureDisabled: boolean;
  editHref?: string;
  errorMessage?: string | null;
}

function IoSide({
  runId,
  row,
  side,
  inlineValue,
  inlineTruncated = false,
  captureDisabled,
  editHref,
  errorMessage,
}: IoSideProps) {
  const [fullPayload, setFullPayload] = useState<unknown>(undefined);
  const [loadingFull, setLoadingFull] = useState(false);

  const heading = side === "input" ? "Input" : "Output";
  const summary =
    side === "input" ? row.capture?.inputSummary : row.capture?.outputSummary;
  const bytes = side === "input" ? row.capture?.inputBytes : row.capture?.outputBytes;
  const isError = side === "output" && row.status === "error";
  const captureMode: WorkflowStepCaptureMode | undefined = row.capture?.captureMode;
  const legacyTruncated = row.capture?.truncated ?? false;

  // Prefer the inline projection field when the projection is available
  // (the gateway already redacted + capped it). Falls back to the legacy
  // `/captures` row for runs that predate the projection fields.
  const useInline = inlineValue !== undefined;
  const inlineEnvelope = useInline && isTruncatedEnvelope(inlineValue)
    ? (inlineValue as WorkflowRunStepCaptureTruncated)
    : null;
  const truncated = useInline ? inlineTruncated : legacyTruncated;

  async function onShowFull() {
    setLoadingFull(true);
    try {
      const data = await fetchCapturePayload(runId, row.sequence, side);
      setFullPayload(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load full payload");
    } finally {
      setLoadingFull(false);
    }
  }

  return (
    <section className="flex min-w-0 flex-col gap-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {heading}
      </h4>

      {isError && errorMessage ? (
        <div
          className="rounded-md border px-3 py-2 text-sm"
          style={{
            background: "var(--status-danger-bg)",
            color: "var(--status-danger-fg)",
            borderColor: "var(--status-danger-border)",
          }}
        >
          <div className="flex items-center gap-1.5 font-medium">
            <AlertTriangle className="size-3.5" />
            Error
          </div>
          <p className="mt-1 whitespace-pre-wrap text-xs">{errorMessage}</p>
        </div>
      ) : null}

      {captureDisabled ? (
        <div className="rounded-md border border-dashed border-border/60 bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
          <p>Capture disabled for this step.</p>
          {editHref ? (
            <a
              href={editHref}
              className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
            >
              Edit step settings
            </a>
          ) : null}
        </div>
      ) : useInline ? (
        // New path: render directly off `WorkflowRunStep.input` / `.output`
        // returned by the gateway. Server already redacted + capped at 2 KB.
        inlineValue === null ? (
          <div className="rounded-md border border-dashed border-border/60 bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
            {row.status === "running" || row.status === "waiting"
              ? "Awaiting capture…"
              : side === "output" && row.status === "success"
                ? "Step produced no output."
                : "Not captured."}
          </div>
        ) : (
          <>
            {truncated ? (
              <div
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs"
                style={{
                  background: "var(--status-warning-bg)",
                  color: "var(--status-warning-fg)",
                  borderColor: "var(--status-warning-border)",
                }}
              >
                <span className="inline-flex items-center rounded-full bg-background/60 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide">
                  Truncated
                </span>
                <span>
                  {heading} exceeded 2 KB
                  {inlineEnvelope
                    ? ` (${formatBytes(inlineEnvelope.originalBytes)} original)`
                    : ""}
                  .
                </span>
              </div>
            ) : null}
            {inlineEnvelope ? (
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-border/60 bg-muted/30 p-3 font-mono text-xs leading-relaxed text-foreground">
                {inlineEnvelope.preview}
              </pre>
            ) : (
              <JsonTreeViewer
                value={inlineValue}
                label={heading}
                emptyMessage="No data."
              />
            )}
          </>
        )
      ) : !row.capture ? (
        <div className="rounded-md border border-dashed border-border/60 bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
          {row.status === "running" || row.status === "waiting"
            ? "Awaiting capture…"
            : "No capture recorded for this step."}
        </div>
      ) : (
        <>
          {legacyTruncated && captureMode === "summary" ? (
            <div
              className="rounded-md border px-3 py-2 text-xs"
              style={{
                background: "var(--status-warning-bg)",
                color: "var(--status-warning-fg)",
                borderColor: "var(--status-warning-border)",
              }}
            >
              {heading} exceeded 2 KB and was truncated. Switch this step to
              <span className="mx-1 rounded bg-background/60 px-1 font-mono">Full</span>
              capture to retain the entire payload.
            </div>
          ) : null}

          <JsonTreeViewer
            value={fullPayload !== undefined ? fullPayload : summary}
            label={
              fullPayload !== undefined ? `${heading} (full)` : `${heading} (summary)`
            }
            emptyMessage={
              side === "output" && row.capture.outcome === "ok"
                ? "Step produced no output."
                : "No data."
            }
          />

          {captureMode === "full" && fullPayload === undefined ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="self-start"
              onClick={onShowFull}
              disabled={loadingFull}
            >
              {loadingFull
                ? "Loading…"
                : `View full payload (${formatBytes(bytes ?? null)})`}
            </Button>
          ) : null}
        </>
      )}
    </section>
  );
}
