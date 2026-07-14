"use client";

import { useMemo, useState } from "react";
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
} from "@mui/x-data-grid";
import { ClipboardCheck } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { FilterBar, type FilterDefinition } from "@/components/shared/FilterBar";
import { dataGridSx } from "@/lib/datagrid-theme";
import { matchesSearchQuery } from "@/lib/table-search";
import { cn } from "@/lib/utils";
import {
  STOCKTAKE_STATUSES,
  STOCKTAKE_STATUS_LABELS,
  stocktakeSummary,
  type Stocktake,
  type StocktakeStatus,
} from "./mock-stocktakes";

const SHORT_DATE_FMT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
};

interface StocktakeTableProps {
  stocktakes: Stocktake[];
  onAdd: () => void;
  onRowClick: (stocktake: Stocktake) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilters: StocktakeStatus[];
  onStatusFiltersChange: (value: StocktakeStatus[]) => void;
}

export function statusVariant(status: StocktakeStatus) {
  switch (status) {
    case "completed":
      return "success" as const;
    case "in_progress":
      return "info" as const;
    case "cancelled":
      return "neutral" as const;
  }
}

export function StocktakeTable({
  stocktakes,
  onAdd,
  onRowClick,
  searchQuery,
  onSearchChange,
  statusFilters,
  onStatusFiltersChange,
}: StocktakeTableProps) {
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  });

  const visible = useMemo(
    () =>
      stocktakes.filter((s) => {
        if (statusFilters.length > 0 && !statusFilters.includes(s.status))
          return false;
        return matchesSearchQuery(searchQuery, [
          s.reference,
          s.name,
          s.scopeLabel,
          s.countedBy,
          STOCKTAKE_STATUS_LABELS[s.status],
          ...s.lines.flatMap((l) => [l.name, l.sku]),
          s.notes ?? "",
        ]);
      }),
    [stocktakes, searchQuery, statusFilters]
  );

  const filters: FilterDefinition[] = useMemo(
    () => [
      {
        key: "status",
        label: "Status",
        options: STOCKTAKE_STATUSES as string[],
        value: statusFilters as string[],
        onChange: (v: string[]) =>
          onStatusFiltersChange(v as StocktakeStatus[]),
        formatOption: (value: string) =>
          STOCKTAKE_STATUS_LABELS[value as StocktakeStatus] ?? value,
      },
    ],
    [statusFilters, onStatusFiltersChange]
  );

  const columns: GridColDef<Stocktake>[] = [
    {
      field: "reference",
      headerName: "Ref",
      width: 120,
      renderCell: (params) => (
        <span className="font-mono text-sm font-medium text-foreground">
          {params.value as string}
        </span>
      ),
    },
    {
      field: "name",
      headerName: "Stocktake",
      flex: 1,
      minWidth: 240,
      renderCell: (params) => (
        <div className="flex min-w-0 flex-col leading-tight py-1">
          <span className="truncate font-medium text-foreground">
            {params.row.name}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {params.row.scopeLabel}
          </span>
        </div>
      ),
    },
    {
      field: "countedBy",
      headerName: "Counted by",
      width: 160,
      renderCell: (params) => (
        <span className="text-sm text-muted-foreground">
          {params.value as string}
        </span>
      ),
    },
    {
      field: "progress",
      headerName: "Progress",
      width: 120,
      sortable: false,
      renderCell: (params) => {
        const { countedLines, totalLines } = stocktakeSummary(params.row);
        return (
          <span className="tabular-nums text-sm text-muted-foreground">
            {countedLines}/{totalLines}
          </span>
        );
      },
    },
    {
      field: "variance",
      headerName: "Variance",
      width: 120,
      align: "right",
      headerAlign: "right",
      sortable: false,
      renderCell: (params) => {
        const { netVariance, discrepancyLines } = stocktakeSummary(params.row);
        if (discrepancyLines === 0) {
          return <span className="text-sm text-muted-foreground">—</span>;
        }
        return (
          <span
            className={cn(
              "tabular-nums text-sm font-medium",
              netVariance > 0
                ? "text-status-success-fg"
                : "text-status-danger-fg"
            )}
          >
            {netVariance > 0 ? "+" : ""}
            {netVariance}
          </span>
        );
      },
    },
    {
      field: "startedAt",
      headerName: "Started",
      width: 140,
      renderCell: (params) => (
        <span className="text-sm text-muted-foreground">
          {new Date(params.value as string).toLocaleDateString(
            "en-AU",
            SHORT_DATE_FMT
          )}
        </span>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 140,
      renderCell: (params) => (
        <StatusBadge variant={statusVariant(params.value as StocktakeStatus)} dot>
          {STOCKTAKE_STATUS_LABELS[params.value as StocktakeStatus]}
        </StatusBadge>
      ),
    },
  ];

  const toolbar = (
    <FilterBar
      searchPlaceholder="Search by ref, name, product…"
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      filters={filters}
      resultCount={visible.length}
      resultLabel="stocktakes"
    />
  );

  if (stocktakes.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="No stocktakes yet"
        description="Start your first stocktake to reconcile physical stock against the catalog."
        actionLabel="New stocktake"
        onAction={onAdd}
      />
    );
  }

  if (visible.length === 0) {
    return (
      <div style={{ width: "100%" }}>
        {toolbar}
        <EmptyState
          icon={ClipboardCheck}
          title="No stocktakes match your filters"
          description="Adjust or clear the search and filters to see more."
          actionLabel="Clear filters"
          onAction={() => {
            onSearchChange("");
            onStatusFiltersChange([]);
          }}
          dashed
        />
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      {toolbar}
      <div className="rounded-sm border border-border bg-card overflow-hidden">
        <DataGrid
          rows={visible}
          columns={columns}
          autoHeight
          disableRowSelectionOnClick
          onRowClick={(params) => onRowClick(params.row as Stocktake)}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 25, 50]}
          rowHeight={60}
          initialState={{
            sorting: { sortModel: [{ field: "startedAt", sort: "desc" }] },
          }}
          sx={{
            ...dataGridSx,
            "& .MuiDataGrid-row": { cursor: "pointer" },
          }}
        />
      </div>
    </div>
  );
}
