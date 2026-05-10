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
import { useBreadcrumbOverrides } from "@/components/providers/BreadcrumbProvider";
import {
  useDeleteWorkflow,
  useUpdateWorkflow,
  useWorkflow,
  useWorkflows,
  WorkflowApiError,
} from "@/lib/hooks/use-workflows";
import { WorkflowEditor } from "@/components/workflows/canvas/WorkflowEditor";
import { RunView } from "@/components/workflows/run/RunView";
import { ViewJsonDialog } from "@/components/workflows/ViewJsonDialog";
import { TestRunDialog } from "@/components/workflows/TestRunDialog";
import { WorkflowActionBar } from "@/components/workflows/WorkflowActionBar";
import { workflowSchema } from "@/components/workflows/canvas/lib/workflow-schema";
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
  process.env.NEXT_PUBLIC_WEBHOOK_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "";

export function WorkflowDetailClient({
  workflowId,
  initialWorkflow,
  initialRuns,
}: WorkflowDetailClientProps) {
  const router = useRouter();
  const { data, isLoading } = useWorkflow(workflowId, initialWorkflow);
  const update = useUpdateWorkflow(workflowId);
  const remove = useDeleteWorkflow();
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
  const [showTestRun, setShowTestRun] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [addSignal, setAddSignal] = useState(0);
  const [panningMode, setPanningMode] = useState<"grab" | "select">("grab");
  const [showMinimap, setShowMinimap] = useState(false);

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
        err instanceof WorkflowApiError
          ? err.message
          : "Failed to update status";
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
              showMinimap={showMinimap}
            />
          ) : (
            <RunView workflowId={workflowId} initialRuns={initialRuns} />
          )}

          <WorkflowActionBar
            tab={tab}
            onTabChange={setTab}
            isActive={isActive}
            onToggleActive={toggleActive}
            onAdd={() => setAddSignal((n) => n + 1)}
            onSave={() => handleSave()}
            onTestRun={() => setShowTestRun(true)}
            onViewJson={() => setShowJson(true)}
            onDelete={() => setShowDelete(true)}
            saveDisabled={!draftDirty || update.isPending}
            saving={update.isPending}
            togglePending={update.isPending}
            dirty={draftDirty}
            panningMode={panningMode}
            onTogglePanningMode={() =>
              setPanningMode((m) => (m === "grab" ? "select" : "grab"))
            }
            showMinimap={showMinimap}
            onToggleMinimap={() => setShowMinimap((s) => !s)}
          />
        </div>
      </ReactFlowProvider>

      <ViewJsonDialog open={showJson} onOpenChange={setShowJson} data={workflow} />
      <TestRunDialog
        open={showTestRun}
        onOpenChange={setShowTestRun}
        workflow={workflow}
        onTriggered={() => setTab("run")}
      />
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              All runs and timeline events for{" "}
              <strong>{workflow.name}</strong> will also be deleted. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>
              Cancel
            </AlertDialogCancel>
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
