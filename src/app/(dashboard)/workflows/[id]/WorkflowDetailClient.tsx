"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ReactFlowProvider } from "@xyflow/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useBreadcrumbOverrides } from "@/components/providers/BreadcrumbProvider";
import {
  useCreateWorkflow,
  useDeleteWorkflow,
  useUpdateWorkflow,
  useWorkflow,
  useWorkflows,
  WorkflowApiError,
} from "@/lib/hooks/use-workflows";
import { WorkflowEditor } from "@/components/workflows/canvas/WorkflowEditor";
import { ViewJsonDialog } from "@/components/workflows/ViewJsonDialog";
import { WorkflowActionBar } from "@/components/workflows/WorkflowActionBar";
import { OutdatedRunsBanner } from "@/components/workflows/OutdatedRunsBanner";
import { SaveNewVersionDialog } from "@/components/workflows/SaveNewVersionDialog";
import { workflowSchema } from "@/components/workflows/canvas/lib/workflow-schema";
import { useTestRunWorkflow } from "@/lib/hooks/use-workflows";
import { useWorkflowRuns } from "@/lib/hooks/use-workflow-runs";
import { countOutdatedRuns } from "@/lib/workflow-versions";
import type {
  Workflow,
  WorkflowNote,
  WorkflowResponse,
  WorkflowStep,
  WorkflowTrigger,
} from "@/types";

interface WorkflowDetailClientProps {
  workflowId: string;
  entityId: string;
  initialWorkflow?: WorkflowResponse;
}

const WEBHOOK_BASE_URL =
  process.env.NEXT_PUBLIC_WEBHOOK_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * Strip default capture/sensitive/retry fields from each step before
 * serializing to the backend. The default `capture: 'summary'` and
 * `sensitive: false` are inferred when missing, and `retry` is omitted when
 * unset, so we drop them to keep the stored definition (and JSON diffs)
 * clean.
 */
function serializeStepsForSave(steps: WorkflowStep[]): WorkflowStep[] {
  return steps.map((step) => {
    const { capture, sensitive, retry, ...rest } = step as WorkflowStep & {
      capture?: WorkflowStep["capture"];
      sensitive?: WorkflowStep["sensitive"];
      retry?: WorkflowStep["retry"];
    };
    const next = { ...rest } as WorkflowStep;
    if (capture && capture !== "summary") next.capture = capture;
    if (sensitive === true) next.sensitive = true;
    if (retry !== undefined) next.retry = retry;
    return next;
  });
}

/**
 * Deep-copy notes for a duplicate / import operation. Generates fresh ids
 * so the new workflow has its own canvas-level identity for each note,
 * while preserving position, sizing, color, and content.
 */
function cloneNotesForDuplicate(notes: WorkflowNote[] | undefined): WorkflowNote[] {
  if (!notes || notes.length === 0) return [];
  return notes.map((n) => ({
    ...n,
    id:
      globalThis.crypto && "randomUUID" in globalThis.crypto
        ? globalThis.crypto.randomUUID()
        : Math.random().toString(36).slice(2, 10),
  }));
}

function cloneTriggersForDuplicate(triggers: WorkflowTrigger[]): WorkflowTrigger[] {
  return triggers.map((trigger) => {
    switch (trigger.kind) {
      case "event":
        return { ...trigger };
      case "manual":
        return { ...trigger };
      case "schedule":
        return { ...trigger };
      case "webhook":
        return { kind: "webhook" };
      case "workflow":
        return { ...trigger };
    }
  });
}

function workflowDownloadFilename(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);

  return `${slug || "workflow"}.json`;
}

export function WorkflowDetailClient({
  workflowId,
  entityId,
  initialWorkflow,
}: WorkflowDetailClientProps) {
  const router = useRouter();
  const { data, isLoading } = useWorkflow(workflowId, initialWorkflow);
  const update = useUpdateWorkflow(workflowId);
  const create = useCreateWorkflow();
  const remove = useDeleteWorkflow();
  const testRun = useTestRunWorkflow(workflowId);
  const { data: allWorkflows } = useWorkflows({ status: "active", limit: 100 });

  const workflow = data?.data;

  const [draftTriggers, setDraftTriggers] = useState<WorkflowTrigger[]>([]);
  const [draftSteps, setDraftSteps] = useState<WorkflowStep[]>([]);
  const [draftNotes, setDraftNotes] = useState<WorkflowNote[]>([]);
  const [draftDirty, setDraftDirty] = useState(false);
  const [serverError, setServerError] = useState<{
    path?: string;
    message: string;
  } | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [addSignal, setAddSignal] = useState(0);
  const [addNoteSignal, setAddNoteSignal] = useState(0);
  const [panningMode, setPanningMode] = useState<"grab" | "select">("grab");
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Pull the runs list so we can warn the user before bumping `version` on
  // a workflow that still has in-flight runs pinned to the current version.
  // The same data drives the top banner — single subscription, two views.
  const { data: runsData } = useWorkflowRuns(workflowId, { limit: 50 });
  const inflightOutdatedCount = workflow
    ? countOutdatedRuns(runsData?.data ?? [], {
        // After save the server will increment to `version + 1`, so any run
        // currently on the *current* version becomes outdated. Compute that
        // by treating "next version" as the comparator.
        version: workflow.version + 1,
      })
    : 0;

  // Sync server state into draft when the workflow loads or refreshes,
  // unless the user has unsaved changes. Done during render via the
  // "store previous value" pattern (https://react.dev/reference/react/useState#storing-information-from-previous-renders)
  // to avoid effect-triggered cascading renders.
  const [lastSyncedSig, setLastSyncedSig] = useState<string | null>(null);
  if (workflow && !draftDirty) {
    const signature = `${workflow.id}:${workflow.version}:${workflow.updatedAt}`;
    if (lastSyncedSig !== signature) {
      setLastSyncedSig(signature);
      setDraftTriggers(workflow.triggers ?? []);
      setDraftSteps(workflow.definition?.steps ?? []);
      setDraftNotes(workflow.definition?.notes ?? []);
    }
  }

  const subWorkflows = useMemo<Workflow[]>(
    () => (allWorkflows?.data ?? []).filter((w) => w.id !== workflowId),
    [allWorkflows, workflowId]
  );

  // Replace the workflow id segment in the breadcrumb with its name.
  const { setOverride, clearOverride } = useBreadcrumbOverrides();
  const breadcrumbPath = `/workflows/${workflowId}`;
  const workflowName = workflow?.name;
  useEffect(() => {
    if (!workflowName) return;
    setOverride(breadcrumbPath, workflowName);
    return () => clearOverride(breadcrumbPath);
  }, [breadcrumbPath, workflowName, setOverride, clearOverride]);

  if (isLoading || !workflow) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  function handleDraftChange(next: {
    triggers: WorkflowTrigger[];
    steps: WorkflowStep[];
    notes: WorkflowNote[];
  }) {
    setDraftTriggers(next.triggers);
    setDraftSteps(next.steps);
    setDraftNotes(next.notes);
    setDraftDirty(true);
    setServerError(null);
  }

  async function handleSave(opts?: { activate?: boolean; force?: boolean }) {
    if (!workflow) return;
    // Gate on a confirmation modal when the save will bump `version` and
    // would orphan in-flight runs on the current version. The bump only
    // happens when the definition actually changes — which the editor
    // tracks via `draftDirty` — so non-definition edits (rename,
    // status-only) skip the modal automatically.
    if (
      !opts?.force &&
      !opts?.activate &&
      draftDirty &&
      inflightOutdatedCount > 0
    ) {
      setConfirmSaveOpen(true);
      return;
    }
    const stepsForSave = serializeStepsForSave(draftSteps);
    const definitionForSave = {
      version: 1 as const,
      steps: stepsForSave,
      ...(draftNotes.length > 0 ? { notes: draftNotes } : null),
    };
    const parsed = workflowSchema.safeParse({
      name: workflow.name,
      description: workflow.description,
      triggers: draftTriggers,
      definition: definitionForSave,
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path = issue.path.join(".");
      toast.error("Validation failed", {
        description: `${path}: ${issue.message}`,
      });
      return;
    }
    try {
      await update.mutateAsync({
        triggers: draftTriggers,
        definition: definitionForSave,
        ...(opts?.activate ? { status: "active" } : {}),
      });
      setDraftDirty(false);
      setServerError(null);
      toast.success(opts?.activate ? "Workflow activated" : "Draft saved");
    } catch (err) {
      if (err instanceof WorkflowApiError) {
        setServerError({ path: err.path, message: err.fieldMessage ?? err.message });
        toast.error("Save failed", { description: err.message });
      } else {
        toast.error("Save failed");
      }
    }
  }

  async function toggleActive(checked: boolean) {
    try {
      await update.mutateAsync({ status: checked ? "active" : "disabled" });
      toast.success(checked ? "Workflow active" : "Workflow disabled");
    } catch (err) {
      const message =
        err instanceof WorkflowApiError ? err.message : "Failed to update status";
      toast.error(message);
    }
  }

  async function handleTestRun() {
    try {
      const result = await testRun.mutateAsync(undefined);
      const run = result.data.run;
      // The backend returns 202 with a `running` run; navigate to the
      // dedicated runs page so the live timeline and SSE stream take over.
      router.push(`/workflows/${workflowId}/runs?runId=${run.id}`);
      toast.success("Test run started", {
        description: "Live progress will stream into the run timeline.",
      });
    } catch (err) {
      const message = err instanceof WorkflowApiError ? err.message : "Test run failed";
      toast.error(message);
    }
  }

  async function handleDelete() {
    try {
      await remove.mutateAsync(workflowId);
      toast.success("Workflow deleted");
      router.push("/workflows");
    } catch (err) {
      const message =
        err instanceof WorkflowApiError ? err.message : "Failed to delete";
      toast.error(message);
    }
  }

  async function handleDuplicate() {
    if (!workflow) return;
    try {
      const created = await create.mutateAsync({
        entityId,
        name: `${workflow.name} copy`,
        description: workflow.description,
        triggerEventType: workflow.triggerEventType ?? undefined,
        triggers: cloneTriggersForDuplicate(workflow.triggers),
        status: "draft",
        definition: {
          version: workflow.definition.version ?? 1,
          steps: serializeStepsForSave(workflow.definition.steps),
          ...(workflow.definition.notes && workflow.definition.notes.length > 0
            ? { notes: cloneNotesForDuplicate(workflow.definition.notes) }
            : null),
        },
      });
      toast.success("Workflow duplicated");
      router.push(`/workflows/${created.data.id}`);
    } catch (err) {
      const message =
        err instanceof WorkflowApiError ? err.message : "Failed to duplicate";
      toast.error(message);
    }
  }

  async function handleCopyWorkflowId() {
    try {
      await navigator.clipboard.writeText(workflowId);
      toast.success("Workflow ID copied");
    } catch {
      toast.error("Copy failed");
    }
  }

  async function handleRename() {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      toast.error("Name is required");
      return;
    }
    if (workflow && trimmed === workflow.name) {
      setRenameOpen(false);
      return;
    }
    try {
      await update.mutateAsync({ name: trimmed });
      toast.success("Workflow renamed");
      setRenameOpen(false);
    } catch (err) {
      const message =
        err instanceof WorkflowApiError ? err.message : "Failed to rename";
      toast.error(message);
    }
  }

  async function handleImportFile(file: File) {
    let parsed: unknown;
    try {
      const text = await file.text();
      parsed = JSON.parse(text);
    } catch {
      toast.error("Invalid JSON file");
      return;
    }

    if (!parsed || typeof parsed !== "object") {
      toast.error("File is not a JSON object");
      return;
    }

    // Accept the slim export shape `{ triggers, steps }`, the legacy
    // full-workflow shape `{ ..., definition: { steps } }`, and the API
    // envelope `{ data: Workflow }`.
    const root = parsed as Record<string, unknown>;
    const candidate =
      root.data && typeof root.data === "object"
        ? (root.data as Record<string, unknown>)
        : root;

    let nextSteps: WorkflowStep[] | undefined;
    let nextNotes: WorkflowNote[] | undefined;
    if (Array.isArray(candidate.steps)) {
      nextSteps = candidate.steps as WorkflowStep[];
    } else if (
      candidate.definition &&
      typeof candidate.definition === "object" &&
      Array.isArray((candidate.definition as { steps?: unknown }).steps)
    ) {
      nextSteps = (candidate.definition as { steps: WorkflowStep[] }).steps;
    }
    // Notes can live either at the root (slim export shape) or under
    // `definition.notes` (full workflow shape) — accept both.
    if (Array.isArray(candidate.notes)) {
      nextNotes = candidate.notes as WorkflowNote[];
    } else if (
      candidate.definition &&
      typeof candidate.definition === "object" &&
      Array.isArray((candidate.definition as { notes?: unknown }).notes)
    ) {
      nextNotes = (candidate.definition as { notes: WorkflowNote[] }).notes;
    }

    if (!nextSteps) {
      toast.error("Missing or invalid `steps` in JSON");
      return;
    }

    const nextTriggers = Array.isArray(candidate.triggers)
      ? (candidate.triggers as WorkflowTrigger[])
      : draftTriggers;

    setDraftTriggers(nextTriggers);
    setDraftSteps(nextSteps);
    setDraftNotes(nextNotes ?? []);
    setDraftDirty(true);
    setServerError(null);
    toast.success(
      `Imported ${nextSteps.length} step${nextSteps.length === 1 ? "" : "s"}`,
      { description: "Review the canvas and click Save draft to persist." }
    );
  }

  function handleDownloadJson() {
    if (!workflow) return;
    // Slim portable shape: just the parts a user can edit/import. The id,
    // version, timestamps, and entityId are intentionally excluded so the
    // file can be re-imported into any workflow without colliding with the
    // backend's `(entityId, name, version)` unique constraint.
    const exportPayload = {
      triggers: workflow.triggers,
      steps: serializeStepsForSave(workflow.definition.steps),
      ...(workflow.definition.notes && workflow.definition.notes.length > 0
        ? { notes: workflow.definition.notes }
        : null),
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = workflowDownloadFilename(workflow.name);
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success("Workflow JSON downloaded");
  }

  const isActive = workflow.status === "active";

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <OutdatedRunsBanner
        workflowId={workflowId}
        definitionVersion={workflow.version}
      />
      {/* Body — full bleed canvas, no top header strip or tabs bar */}
      <ReactFlowProvider>
        <div className="relative min-h-0 flex-1 bg-background">
          <WorkflowEditor
            triggers={draftTriggers}
            steps={draftSteps}
            notes={draftNotes}
            onChange={handleDraftChange}
            webhookBaseUrl={WEBHOOK_BASE_URL}
            otherWorkflows={subWorkflows}
            serverError={serverError}
            openPaletteSignal={addSignal}
            addNoteSignal={addNoteSignal}
            panningMode={panningMode}
          />

          <WorkflowActionBar
            workflowId={workflowId}
            isActive={isActive}
            onToggleActive={toggleActive}
            onAdd={() => setAddSignal((n) => n + 1)}
            onAddNote={() => setAddNoteSignal((n) => n + 1)}
            onSave={() => handleSave()}
            onTestRun={() => void handleTestRun()}
            testRunPending={testRun.isPending}
            onViewJson={() => setShowJson(true)}
            onDownloadJson={handleDownloadJson}
            onImportJson={() => importInputRef.current?.click()}
            onCopyId={handleCopyWorkflowId}
            onRename={() => {
              setRenameValue(workflow.name);
              setRenameOpen(true);
            }}
            onDuplicate={handleDuplicate}
            onDelete={() => setShowDelete(true)}
            saveDisabled={!draftDirty || update.isPending}
            saving={update.isPending}
            duplicating={create.isPending}
            togglePending={update.isPending}
            dirty={draftDirty}
            panningMode={panningMode}
            onTogglePanningMode={() =>
              setPanningMode((m) => (m === "grab" ? "select" : "grab"))
            }
          />
        </div>
      </ReactFlowProvider>

      <ViewJsonDialog
        open={showJson}
        onOpenChange={setShowJson}
        data={{
          triggers: workflow.triggers,
          steps: serializeStepsForSave(workflow.definition.steps),
          ...(workflow.definition.notes && workflow.definition.notes.length > 0
            ? { notes: workflow.definition.notes }
            : null),
        }}
      />
      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Reset so re-selecting the same file fires onChange again.
          e.target.value = "";
          if (file) void handleImportFile(file);
        }}
      />
      <AlertDialog open={renameOpen} onOpenChange={setRenameOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename workflow</AlertDialogTitle>
            <AlertDialogDescription>
              Update the name shown across the dashboard and breadcrumbs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleRename();
              }
            }}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={update.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleRename();
              }}
              disabled={update.isPending || !renameValue.trim()}
            >
              {update.isPending ? "Saving…" : "Save"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <SaveNewVersionDialog
        open={confirmSaveOpen}
        onOpenChange={setConfirmSaveOpen}
        inflightCount={inflightOutdatedCount}
        currentVersion={workflow.version}
        onConfirm={() => {
          setConfirmSaveOpen(false);
          void handleSave({ force: true });
        }}
        pending={update.isPending}
      />
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              All runs and timeline events for <strong>{workflow.name}</strong> will
              also be deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              disabled={remove.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
