"use client";

import { useEffect, useMemo, useState } from "react";
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
import { RunView } from "@/components/workflows/run/RunView";
import { ViewJsonDialog } from "@/components/workflows/ViewJsonDialog";
import { WorkflowActionBar } from "@/components/workflows/WorkflowActionBar";
import { workflowSchema } from "@/components/workflows/canvas/lib/workflow-schema";
import { useTestRunWorkflow } from "@/lib/hooks/use-workflows";
import type {
  Workflow,
  WorkflowResponse,
  WorkflowRunsListResponse,
  WorkflowStep,
  WorkflowTrigger,
} from "@/types";

interface WorkflowDetailClientProps {
  workflowId: string;
  entityId: string;
  initialWorkflow?: WorkflowResponse;
  initialRuns?: WorkflowRunsListResponse;
}

type Tab = "canvas" | "run";

const WEBHOOK_BASE_URL =
  process.env.NEXT_PUBLIC_WEBHOOK_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "";

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
  initialRuns,
}: WorkflowDetailClientProps) {
  const router = useRouter();
  const { data, isLoading } = useWorkflow(workflowId, initialWorkflow);
  const update = useUpdateWorkflow(workflowId);
  const create = useCreateWorkflow();
  const remove = useDeleteWorkflow();
  const testRun = useTestRunWorkflow(workflowId);
  const { data: allWorkflows } = useWorkflows({ status: "active", limit: 100 });

  const workflow = data?.data;

  const [tab, setTab] = useState<Tab>("canvas");
  const [draftTriggers, setDraftTriggers] = useState<WorkflowTrigger[]>([]);
  const [draftSteps, setDraftSteps] = useState<WorkflowStep[]>([]);
  const [draftDirty, setDraftDirty] = useState(false);
  const [serverError, setServerError] = useState<{
    path?: string;
    message: string;
  } | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [addSignal, setAddSignal] = useState(0);
  const [panningMode, setPanningMode] = useState<"grab" | "select">("grab");

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
  }) {
    setDraftTriggers(next.triggers);
    setDraftSteps(next.steps);
    setDraftDirty(true);
    setServerError(null);
  }

  async function handleSave(opts?: { activate?: boolean }) {
    if (!workflow) return;
    const parsed = workflowSchema.safeParse({
      name: workflow.name,
      description: workflow.description,
      triggers: draftTriggers,
      definition: { version: 1, steps: draftSteps },
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
        definition: { version: 1, steps: draftSteps },
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
      setActiveRunId(run.id);
      setTab("run");
      const description =
        run.status === "waiting"
          ? run.awaitingEventType
            ? `Waiting for event: ${run.awaitingEventType}`
            : "Paused on a wait step."
          : run.status === "failed"
            ? (run.lastError ?? "Run failed.")
            : run.status === "completed"
              ? "Run completed."
              : "Run started.";
      const toastFn =
        run.status === "failed"
          ? toast.error
          : run.status === "waiting"
            ? toast.warning
            : toast.success;
      toastFn(`Test run ${run.status}`, { description });
    } catch (err) {
      const message =
        err instanceof WorkflowApiError ? err.message : "Test run failed";
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
          steps: workflow.definition.steps,
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

  function handleDownloadJson() {
    if (!workflow) return;
    const blob = new Blob([JSON.stringify(workflow, null, 2)], {
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
      {/* Body — full bleed canvas, no top header strip or tabs bar */}
      <ReactFlowProvider>
        <div className="relative min-h-0 flex-1 bg-background">
          {tab === "canvas" ? (
            <WorkflowEditor
              triggers={draftTriggers}
              steps={draftSteps}
              onChange={handleDraftChange}
              webhookBaseUrl={WEBHOOK_BASE_URL}
              otherWorkflows={subWorkflows}
              serverError={serverError}
              openPaletteSignal={addSignal}
              panningMode={panningMode}
            />
          ) : (
            <RunView
              key={activeRunId ?? "latest"}
              workflowId={workflowId}
              initialRuns={initialRuns}
              initialRunId={activeRunId ?? undefined}
            />
          )}

          <WorkflowActionBar
            tab={tab}
            onTabChange={setTab}
            isActive={isActive}
            onToggleActive={toggleActive}
            onAdd={() => setAddSignal((n) => n + 1)}
            onSave={() => handleSave()}
            onTestRun={() => void handleTestRun()}
            testRunPending={testRun.isPending}
            onViewJson={() => setShowJson(true)}
            onDownloadJson={handleDownloadJson}
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

      <ViewJsonDialog open={showJson} onOpenChange={setShowJson} data={workflow} />
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
