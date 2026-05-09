"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Code2,
  MoreHorizontal,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
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
import { workflowSchema } from "@/components/workflows/canvas/lib/workflow-schema";
import { cn } from "@/lib/utils";
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
  const updatedRel = (() => {
    try {
      return formatDistanceToNow(new Date(workflow.updatedAt), {
        addSuffix: true,
      });
    } catch {
      return workflow.updatedAt;
    }
  })();

  return (
    <div className="flex h-[calc(100dvh-(--spacing(16)))] flex-col">
      {/* Workflow header strip */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border bg-popover px-5 py-3.5">
        <button
          type="button"
          onClick={() => router.push("/workflows")}
          className="grid size-9 place-items-center rounded-lg bg-status-warning-bg text-status-warning-fg transition-opacity hover:opacity-80"
          aria-label="Back to workflows"
        >
          <Zap className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[19px] font-bold leading-tight tracking-[-0.01em]">
            {workflow.name}
          </h1>
          <div className="mt-0.5 flex items-center gap-2 text-[12px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  isActive
                    ? "bg-status-success-fg animate-pulse motion-reduce:animate-none"
                    : "bg-muted-foreground"
                )}
                aria-hidden
              />
              {workflow.status}
            </span>
            <span aria-hidden>·</span>
            <span>v{workflow.version}</span>
            <span aria-hidden>·</span>
            <span>edited {updatedRel}</span>
            {draftDirty && (
              <>
                <span aria-hidden>·</span>
                <span className="text-status-warning-fg">unsaved changes</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="More actions"
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowJson(true)}>
                <Code2 className="mr-2 size-3.5" />
                View JSON
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setShowDelete(true)}
              >
                <Trash2 className="mr-2 size-3.5" />
                Delete workflow
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="mx-1 h-5 w-px bg-border" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowJson(true)}
          >
            <Code2 className="size-3.5" />
            View JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave()}
            disabled={!draftDirty || update.isPending}
          >
            {update.isPending ? "Saving…" : "Save draft"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTestRun(true)}
          >
            Test run
          </Button>
          <div className="ml-2 flex items-center gap-2 rounded-md border border-border px-2.5 py-1">
            <span className="text-xs font-medium">Active</span>
            <Switch
              checked={isActive}
              onCheckedChange={toggleActive}
              disabled={update.isPending}
              aria-label="Toggle workflow active"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="shrink-0 border-b border-border bg-popover px-5">
        <div className="flex gap-1">
          {(
            [
              { id: "canvas", label: "Canvas", sub: "build" },
              { id: "run", label: "Live run", sub: "execute" },
            ] as { id: Tab; label: string; sub: string }[]
          ).map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex flex-col gap-0 px-3 py-2 -mb-px border-b-2 text-left transition-colors",
                  active
                    ? "border-primary"
                    : "border-transparent hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "text-sm",
                    active ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
                  )}
                >
                  {t.label}
                </span>
                <span className="text-[10px] lowercase text-muted-foreground">
                  {t.sub}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 bg-background">
        {tab === "canvas" ? (
          <WorkflowEditor
            triggers={draftTriggers}
            steps={draftSteps}
            onChange={handleDraftChange}
            webhookBaseUrl={WEBHOOK_BASE_URL}
            otherWorkflows={subWorkflows}
            serverError={serverError}
          />
        ) : (
          <RunView workflowId={workflowId} initialRuns={initialRuns} />
        )}
      </div>

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
