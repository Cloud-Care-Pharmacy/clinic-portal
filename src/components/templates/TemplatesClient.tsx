"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DataGrid,
  type GridColDef,
  type GridRowParams,
  type GridSortModel,
} from "@mui/x-data-grid";
import { Mail, MessageSquare, Bell, Plus, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dataGridSx } from "@/lib/datagrid-theme";
import { TemplateSheet } from "./TemplateSheet";
import { TemplateDetailSheet } from "./TemplateDetailSheet";
import { useTemplates } from "@/lib/hooks/use-templates";
import type { Template, TemplateType } from "@/types";

const TYPE_META: Record<
  TemplateType,
  {
    label: string;
    icon: LucideIcon;
    description: string;
  }
> = {
  email: {
    label: "Email",
    icon: Mail,
    description: "Transactional and marketing emails.",
  },
  sms: {
    label: "SMS",
    icon: MessageSquare,
    description: "Short text messages with sender IDs and segment limits.",
  },
  notification: {
    label: "Notification",
    icon: Bell,
    description: "In-app notifications and toasts.",
  },
};

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

export function TemplatesClient() {
  const { push } = useRouter();
  const [tab, setTab] = useState<TemplateType>("email");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<Template | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Templates"
        description="Author reusable email, SMS, and notification templates with shared variables."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New template
          </Button>
        }
      />

      <Tabs
        value={tab}
        onValueChange={(v) => v && setTab(v as TemplateType)}
        className="space-y-4"
      >
        <TabsList>
          {(Object.keys(TYPE_META) as TemplateType[]).map((t) => {
            const Icon = TYPE_META[t].icon;
            return (
              <TabsTrigger key={t} value={t}>
                <Icon className="size-4" />
                {TYPE_META[t].label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {(Object.keys(TYPE_META) as TemplateType[]).map((t) => (
          <TabsContent key={t} value={t} className="space-y-4">
            <TemplateTypePanel
              type={t}
              onNew={() => setCreateOpen(true)}
              onRowClick={(row) => setDetailTarget(row)}
            />
          </TabsContent>
        ))}
      </Tabs>

      <TemplateSheet open={createOpen} onOpenChange={setCreateOpen} defaultType={tab} />
      <TemplateDetailSheet
        open={!!detailTarget}
        onOpenChange={(open) => {
          if (!open) setDetailTarget(null);
        }}
        template={detailTarget}
        onEdit={(t) => {
          setDetailTarget(null);
          push(`/templates/${t.id}`);
        }}
      />
    </div>
  );
}

// --------------------------------------------------------------------------

function TemplateTypePanel({
  type,
  onNew,
  onRowClick,
}: {
  type: TemplateType;
  onNew: () => void;
  onRowClick: (row: Template) => void;
}) {
  const { data, isLoading } = useTemplates(type);
  const Icon = TYPE_META[type].icon;

  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: "updatedAt", sort: "desc" },
  ]);

  const columns: GridColDef<Template>[] = useMemo(
    () => [
      {
        field: "name",
        headerName: "Name",
        flex: 2,
        minWidth: 220,
        renderCell: (params) => (
          <div className="flex h-full w-full min-w-0 flex-col justify-center overflow-hidden">
            <span className="truncate font-medium text-foreground">
              {params.row.name}
            </span>
            {params.row.description ? (
              <span className="block truncate text-xs text-muted-foreground">
                {params.row.description}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        field: "category",
        headerName: "Category",
        flex: 1,
        minWidth: 140,
        valueGetter: (_v, row) => row.category ?? "",
        renderCell: (params) =>
          params.row.category ? (
            <span className="text-muted-foreground">{params.row.category}</span>
          ) : (
            <span className="text-muted-foreground/60">–</span>
          ),
      },
      {
        field: "active",
        headerName: "Status",
        width: 120,
        valueGetter: (_v, row) => (row.active ? "active" : "inactive"),
        renderCell: (params) => (
          <StatusBadge
            status={params.row.active ? "active" : "inactive"}
            dot
            className="capitalize"
          />
        ),
      },
      {
        field: "updatedBy",
        headerName: "Updated by",
        width: 160,
        renderCell: (params) => (
          <span className="text-muted-foreground">{params.row.updatedBy}</span>
        ),
      },
      {
        field: "updatedAt",
        headerName: "Updated",
        width: 130,
        valueGetter: (_v, row) => new Date(row.updatedAt).getTime(),
        renderCell: (params) => (
          <span className="text-muted-foreground">
            {relativeTime(params.row.updatedAt)}
          </span>
        ),
      },
    ],
    []
  );

  function handleRowClick(params: GridRowParams<Template>) {
    onRowClick(params.row);
  }

  if (!isLoading && data.length === 0) {
    return (
      <EmptyState
        icon={Icon}
        title={`No ${TYPE_META[type].label.toLowerCase()} templates yet`}
        description={TYPE_META[type].description}
        actionLabel="New template"
        onAction={onNew}
        dashed
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <DataGrid
        rows={data}
        columns={columns}
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
        }}
        sx={dataGridSx}
      />
    </div>
  );
}
