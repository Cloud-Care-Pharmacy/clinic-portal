"use client";

import { useMemo, useState } from "react";
import {
  DataGrid,
  type GridColDef,
  type GridRowParams,
} from "@mui/x-data-grid";
import { useRouter } from "next/navigation";
import { Plus, Workflow as WorkflowIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { dataGridSx } from "@/lib/datagrid-theme";
import {
  useCreateWorkflow,
  useWorkflows,
  WorkflowApiError,
} from "@/lib/hooks/use-workflows";
import type { Workflow, WorkflowsListResponse } from "@/types";

interface WorkflowsClientProps {
  entityId: string;
  initialWorkflows?: WorkflowsListResponse;
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

function triggerSummary(w: Workflow): string {
  if (!w.triggers || w.triggers.length === 0) return "—";
  return w.triggers
    .map((t) => {
      switch (t.kind) {
        case "event":
          return `event:${t.eventType}`;
        case "schedule":
          return `cron:${t.cron}`;
        case "webhook":
          return "webhook";
        case "manual":
          return "manual";
        case "workflow":
          return "sub-flow";
      }
    })
    .join(" · ");
}

export function WorkflowsClient({
  entityId,
  initialWorkflows,
}: WorkflowsClientProps) {
  const router = useRouter();
  const { data, isLoading } = useWorkflows({ limit: 100 }, initialWorkflows);
  const create = useCreateWorkflow();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");

  const workflows = useMemo(() => data?.data ?? [], [data]);
  const filtered = useMemo(() => {
    if (!search.trim()) return workflows;
    const q = search.toLowerCase();
    return workflows.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        (w.description ?? "").toLowerCase().includes(q)
    );
  }, [workflows, search]);

  const columns: GridColDef<Workflow>[] = useMemo(
    () => [
      {
        field: "name",
        headerName: "Name",
        flex: 2,
        minWidth: 220,
        renderCell: (params) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{params.row.name}</span>
            {params.row.description && (
              <span className="text-xs text-muted-foreground line-clamp-1">
                {params.row.description}
              </span>
            )}
          </div>
        ),
      },
      {
        field: "status",
        headerName: "Status",
        width: 110,
        renderCell: (params) => (
          <StatusBadge status={params.value as string} dot className="capitalize" />
        ),
      },
      {
        field: "triggers",
        headerName: "Triggers",
        flex: 2,
        minWidth: 240,
        sortable: false,
        valueGetter: (_value, row) => triggerSummary(row),
      },
      {
        field: "version",
        headerName: "Ver",
        width: 70,
        align: "right",
        headerAlign: "right",
        valueGetter: (_value, row) => `v${row.version}`,
      },
      {
        field: "updatedAt",
        headerName: "Updated",
        width: 140,
        valueGetter: (_value, row) => relativeTime(row.updatedAt),
      },
    ],
    []
  );

  function handleRowClick(params: GridRowParams<Workflow>) {
    router.push(`/workflows/${params.row.id}`);
  }

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Name is required");
      return;
    }
    try {
      const res = await create.mutateAsync({
        entityId,
        name: trimmed,
        triggerEventType: "manual.run",
        triggers: [{ kind: "manual" }],
        status: "draft",
        definition: {
          version: 1,
          steps: [{ kind: "wait", seconds: 1 }],
        },
      });
      setCreateOpen(false);
      setName("");
      toast.success("Workflow created");
      router.push(`/workflows/${res.data.id}`);
    } catch (err) {
      const message =
        err instanceof WorkflowApiError ? err.message : "Failed to create workflow";
      toast.error(message);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflows"
        description="Author and monitor automated flows for this clinic."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New workflow
          </Button>
        }
      />

      <div className="flex items-center gap-2">
        <Input
          placeholder="Search workflows…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {!isLoading && filtered.length === 0 ? (
        <EmptyState
          icon={WorkflowIcon}
          title="No workflows yet"
          description="Create your first workflow to start automating intake, reminders, or follow-up flows."
          actionLabel="New workflow"
          onAction={() => setCreateOpen(true)}
          dashed
        />
      ) : (
        <div className="rounded-xl border border-border bg-popover">
          <DataGrid
            rows={filtered}
            columns={columns}
            loading={isLoading}
            onRowClick={handleRowClick}
            disableColumnMenu
            disableRowSelectionOnClick
            pageSizeOptions={[25, 50, 100]}
            initialState={{
              pagination: { paginationModel: { pageSize: 25, page: 0 } },
            }}
            sx={dataGridSx}
            getRowHeight={() => 64}
          />
        </div>
      )}

      <AlertDialog open={createOpen} onOpenChange={setCreateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>New workflow</AlertDialogTitle>
            <AlertDialogDescription>
              Give your workflow a name. You&apos;ll add triggers and steps next.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            autoFocus
            placeholder="e.g. Appointment reminder (24h)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleCreate();
              }
            }}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={create.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleCreate();
              }}
              disabled={create.isPending}
            >
              {create.isPending ? "Creating…" : "Create"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
