"use client";

import { useCallback, useMemo, useState } from "react";
import {
  DataGrid,
  type GridColDef,
  type GridRowParams,
  type GridSortModel,
} from "@mui/x-data-grid";
import { useRouter } from "next/navigation";
import {
  Copy,
  Eye,
  MoreHorizontal,
  Plus,
  SlidersHorizontal,
  Trash2,
  Workflow as WorkflowIcon,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { FilterBar, type FilterDefinition } from "@/components/shared/FilterBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { matchesSearchQuery } from "@/lib/table-search";
import { OutdatedRunsBadge } from "@/components/workflows/OutdatedRunsBadge";
import {
  useCreateWorkflow,
  useDeleteWorkflow,
  useWorkflows,
  WorkflowApiError,
} from "@/lib/hooks/use-workflows";
import type { Workflow, WorkflowsListResponse, WorkflowStatus } from "@/types";

interface WorkflowsClientProps {
  entityId: string;
  initialWorkflows?: WorkflowsListResponse;
}

const STATUS_OPTIONS: WorkflowStatus[] = ["draft", "active", "disabled"];

interface ColumnVisibility {
  name: boolean;
  status: boolean;
  triggers: boolean;
  version: boolean;
  updatedAt: boolean;
}

const DEFAULT_COLUMN_VISIBILITY: ColumnVisibility = {
  name: true,
  status: true,
  triggers: true,
  version: true,
  updatedAt: true,
};

const COLUMN_LABELS: Record<keyof ColumnVisibility, string> = {
  name: "Name",
  status: "Status",
  triggers: "Triggers",
  version: "Version",
  updatedAt: "Updated",
};

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

function ActionsCell({
  onView,
  onCopyId,
  onDelete,
}: {
  onView: () => void;
  onCopyId: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center justify-center rounded-sm size-8 hover:bg-accent transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <MoreHorizontal className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4} className="w-55">
        <DropdownMenuItem onClick={onView}>
          <Eye />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onCopyId}>
          <Copy />
          Copy ID
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function WorkflowsClient({ entityId, initialWorkflows }: WorkflowsClientProps) {
  const { push, prefetch } = useRouter();
  const { data, isLoading } = useWorkflows({ limit: 100 }, initialWorkflows);
  const create = useCreateWorkflow();
  const deleteMutation = useDeleteWorkflow();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState<WorkflowStatus[]>([]);
  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: "updatedAt", sort: "desc" },
  ]);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(
    DEFAULT_COLUMN_VISIBILITY
  );
  const [deleteTarget, setDeleteTarget] = useState<Workflow | null>(null);

  const workflows = useMemo(() => data?.data ?? [], [data]);

  const hasActiveFilters = Boolean(searchQuery.trim()) || statusFilters.length > 0;

  const visibleWorkflows = useMemo(
    () =>
      workflows.filter((w) => {
        if (statusFilters.length > 0 && !statusFilters.includes(w.status)) {
          return false;
        }
        return matchesSearchQuery(searchQuery, [
          w.name,
          w.description,
          w.status,
          triggerSummary(w),
          w.triggerEventType,
        ]);
      }),
    [workflows, searchQuery, statusFilters]
  );

  const filterDefs: FilterDefinition[] = useMemo(
    () => [
      {
        key: "status",
        label: "Status",
        options: STATUS_OPTIONS as string[],
        value: statusFilters as string[],
        onChange: (v) => setStatusFilters(v as WorkflowStatus[]),
        formatOption: (opt) => opt.charAt(0).toUpperCase() + opt.slice(1),
      },
    ],
    [statusFilters]
  );

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilters([]);
  }, []);

  const handleCopyId = useCallback((id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("Workflow ID copied");
  }, []);

  const allColumns: GridColDef<Workflow>[] = useMemo(
    () => [
      {
        field: "name",
        headerName: "Name",
        flex: 2,
        minWidth: 240,
        renderCell: (params) => (
          <div className="flex h-full w-full min-w-0 flex-col justify-center overflow-hidden">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate font-medium text-foreground">
                {params.row.name}
              </span>
              <OutdatedRunsBadge
                workflowId={params.row.id}
                definitionVersion={params.row.version}
              />
            </div>
            {params.row.description ? (
              <span className="block truncate text-xs text-muted-foreground">
                {params.row.description}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        field: "status",
        headerName: "Status",
        width: 120,
        type: "singleSelect",
        valueOptions: STATUS_OPTIONS as string[],
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
        headerName: "Version",
        width: 90,
        align: "right",
        headerAlign: "right",
        valueGetter: (_value, row) => row.version,
        renderCell: (params) => (
          <span className="tabular-nums text-muted-foreground">
            v{params.value as number}
          </span>
        ),
      },
      {
        field: "updatedAt",
        headerName: "Updated",
        width: 140,
        valueGetter: (_value, row) => new Date(row.updatedAt).getTime(),
        renderCell: (params) => (
          <span className="text-muted-foreground">
            {relativeTime(params.row.updatedAt)}
          </span>
        ),
      },
      {
        field: "actions",
        headerName: "",
        width: 60,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <ActionsCell
            onView={() => push(`/workflows/${params.row.id}`)}
            onCopyId={() => handleCopyId(params.row.id)}
            onDelete={() => setDeleteTarget(params.row)}
          />
        ),
      },
    ],
    [handleCopyId, push]
  );

  const visibleColumns = allColumns.filter((col) => {
    const field = col.field;
    if (field === "actions") return true;
    if (field in columnVisibility) {
      return columnVisibility[field as keyof ColumnVisibility];
    }
    return true;
  });

  function handleRowClick(params: GridRowParams<Workflow>) {
    push(`/workflows/${params.row.id}`);
  }

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Name is required");
      return;
    }
    try {
      // Create a blank draft. The backend allows empty triggers/steps for
      // `status: "draft"`; the ≥1 trigger and ≥1 step rules are only
      // enforced on activation (see WorkflowActivationIssue / activate
      // endpoint).
      const res = await create.mutateAsync({
        entityId,
        name: trimmed,
        status: "draft",
        definition: { version: 1, steps: [] },
      });
      setCreateOpen(false);
      setName("");
      toast.success("Workflow created");
      push(`/workflows/${res.data.id}`);
    } catch (err) {
      const message =
        err instanceof WorkflowApiError ? err.message : "Failed to create workflow";
      toast.error(message);
    }
  }

  const toolbar = (
    <FilterBar
      searchPlaceholder="Filter workflows…"
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      filters={filterDefs}
      resultCount={hasActiveFilters ? visibleWorkflows.length : workflows.length}
      resultCountLoading={isLoading}
      resultLabel="workflows"
      trailing={
        <>
          <DropdownMenu open={viewMenuOpen} onOpenChange={setViewMenuOpen}>
            <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-sm border border-border px-3 h-9 text-sm font-medium transition-colors hover:bg-accent">
              <SlidersHorizontal className="size-4 text-muted-foreground" />
              View
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={4} className="w-60">
              {(Object.keys(COLUMN_LABELS) as (keyof ColumnVisibility)[]).map((key) => (
                <DropdownMenuCheckboxItem
                  key={key}
                  checked={columnVisibility[key]}
                  onClick={() =>
                    setColumnVisibility((prev) => ({
                      ...prev,
                      [key]: !prev[key],
                    }))
                  }
                >
                  {COLUMN_LABELS[key]}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" className="h-9" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-4" />
            New workflow
          </Button>
        </>
      }
    />
  );

  const showEmptyZeroState = !isLoading && workflows.length === 0 && !hasActiveFilters;
  const showEmptyFilterState =
    !isLoading && workflows.length > 0 && visibleWorkflows.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflows"
        description="Author and monitor automated flows for this clinic."
      />

      {showEmptyZeroState ? (
        <EmptyState
          icon={WorkflowIcon}
          title="No workflows yet"
          description="Create your first workflow to start automating intake, reminders, or follow-up flows."
          actionLabel="New workflow"
          onAction={() => setCreateOpen(true)}
          dashed
        />
      ) : (
        <div style={{ width: "100%" }}>
          {toolbar}
          {showEmptyFilterState ? (
            <EmptyState
              icon={WorkflowIcon}
              title="No workflows match your filters"
              description="Adjust or clear the search and filters to see more records."
              actionLabel="Clear filters"
              onAction={clearFilters}
              dashed
            />
          ) : (
            <div className="overflow-hidden rounded-sm border border-border bg-card">
              <DataGrid
                rows={visibleWorkflows}
                columns={visibleColumns}
                loading={isLoading}
                autoHeight
                pagination
                disableRowSelectionOnClick
                disableColumnMenu
                columnHeaderHeight={44}
                rowHeight={64}
                sortModel={sortModel}
                onSortModelChange={setSortModel}
                pageSizeOptions={[10, 25, 50]}
                initialState={{
                  pagination: { paginationModel: { pageSize: 10, page: 0 } },
                }}
                onRowClick={handleRowClick}
                slotProps={{
                  loadingOverlay: {
                    variant: "skeleton",
                    noRowsVariant: "skeleton",
                  },
                  row: {
                    onMouseEnter: (event) => {
                      const id = (event.currentTarget as HTMLElement).getAttribute(
                        "data-id"
                      );
                      if (id) prefetch(`/workflows/${id}`);
                    },
                  },
                }}
                sx={dataGridSx}
              />
            </div>
          )}
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
            ref={(node) => {
              node?.focus();
            }}
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

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `This will permanently delete "${deleteTarget.name}" and all its run history. This action cannot be undone.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (!deleteTarget) return;
                const target = deleteTarget;
                deleteMutation.mutate(target.id, {
                  onSuccess: () => {
                    toast.success("Workflow deleted");
                    setDeleteTarget(null);
                  },
                  onError: (err) => {
                    toast.error(
                      err instanceof Error ? err.message : "Failed to delete workflow"
                    );
                  },
                });
              }}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
