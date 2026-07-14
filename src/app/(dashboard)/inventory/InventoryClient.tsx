"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
} from "@mui/x-data-grid";
import { AlertTriangle, Boxes, CalendarClock, PackageX, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { FilterBar, type FilterDefinition } from "@/components/shared/FilterBar";
import { dataGridSx } from "@/lib/datagrid-theme";
import { matchesSearchQuery } from "@/lib/table-search";
import { cn } from "@/lib/utils";
import { formatAudCents, formatAudCentsWhole, formatShortDate } from "@/lib/format";
import { useInventory, useInventorySummary } from "@/lib/hooks/use-inventory";
import type { InventoryItem, InventoryStatusKey } from "@/types/catalog";

const STORAGE_LABELS: Record<string, string> = {
  room: "Room temp",
  refrigerated: "Refrigerated",
  frozen: "Frozen",
  controlled: "Controlled",
};

type QuickFilter = "low-stock" | "out-of-stock" | "expiring" | "to-reorder" | "cold-chain";
const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: "low-stock", label: "Low stock" },
  { id: "out-of-stock", label: "Out of stock" },
  { id: "expiring", label: "Expiring soon" },
  { id: "to-reorder", label: "To reorder" },
  { id: "cold-chain", label: "Cold chain" },
];

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "warning" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "text-status-danger-fg"
      : tone === "warning"
        ? "text-status-warning-fg"
        : "text-foreground";
  return (
    <div className="rounded-sm border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}

export function InventoryClient() {
  const { push } = useRouter();
  const { data, isLoading, error } = useInventory();
  const { data: summaryData } = useInventorySummary();
  const items = useMemo(() => data?.data.items ?? [], [data]);
  const summary = summaryData?.data.summary;

  const [searchQuery, setSearchQuery] = useState("");
  const [supplierFilters, setSupplierFilters] = useState<string[]>([]);
  const [storageFilters, setStorageFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [quickFilters, setQuickFilters] = useState<QuickFilter[]>([]);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });

  const suppliers = useMemo(
    () => [...new Set(items.map((i) => i.supplierName).filter((s): s is string => !!s))].sort(),
    [items],
  );
  const storages = useMemo(() => [...new Set(items.map((i) => i.storage))], [items]);

  const visible = useMemo(
    () =>
      items.filter((item) => {
        if (supplierFilters.length && !supplierFilters.includes(item.supplierName ?? "")) return false;
        if (storageFilters.length && !storageFilters.includes(item.storage)) return false;
        if (statusFilters.length && !statusFilters.includes(item.status.key)) return false;
        if (quickFilters.includes("low-stock") && item.status.key !== "low_stock") return false;
        if (quickFilters.includes("out-of-stock") && item.onHand !== 0) return false;
        if (quickFilters.includes("expiring") && item.status.key !== "expiring_soon") return false;
        if (quickFilters.includes("to-reorder") && item.onHand > item.reorderLevel) return false;
        if (quickFilters.includes("cold-chain") && !item.isColdChain) return false;
        return matchesSearchQuery(searchQuery, [item.name, item.sku, item.supplierName ?? "", item.bin ?? ""]);
      }),
    [items, searchQuery, supplierFilters, storageFilters, statusFilters, quickFilters],
  );

  const filters: FilterDefinition[] = [
    { key: "supplier", label: "Supplier", options: suppliers, value: supplierFilters, onChange: setSupplierFilters },
    {
      key: "storage",
      label: "Storage",
      options: storages,
      value: storageFilters,
      onChange: setStorageFilters,
      formatOption: (v) => STORAGE_LABELS[v] ?? v,
    },
    {
      key: "status",
      label: "Status",
      options: ["in_stock", "low_stock", "expiring_soon", "out_of_stock", "expired"] satisfies InventoryStatusKey[],
      value: statusFilters,
      onChange: setStatusFilters,
      formatOption: (v) => v.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()),
    },
  ];

  const quickChips = (
    <div className="flex flex-wrap items-center gap-1.5">
      {QUICK_FILTERS.map((qf) => {
        const active = quickFilters.includes(qf.id);
        return (
          <button
            key={qf.id}
            type="button"
            onClick={() =>
              setQuickFilters(active ? quickFilters.filter((q) => q !== qf.id) : [...quickFilters, qf.id])
            }
            className={cn(
              "inline-flex h-9 items-center rounded-sm border px-3 text-sm font-medium transition-colors",
              active ? "border-primary/50 bg-primary/10 text-foreground" : "border-border hover:bg-accent",
            )}
            aria-pressed={active}
          >
            {qf.label}
          </button>
        );
      })}
    </div>
  );

  const columns: GridColDef<InventoryItem>[] = [
    {
      field: "name",
      headerName: "Product",
      flex: 1,
      minWidth: 260,
      renderCell: (params) => (
        <div className="flex min-w-0 items-center gap-3 py-1">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-muted text-muted-foreground">
            <Boxes className="size-4" aria-hidden="true" />
          </div>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-medium text-foreground">{params.row.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {[params.row.sku, params.row.supplierName].filter(Boolean).join(" · ")}
            </span>
          </div>
        </div>
      ),
    },
    {
      field: "bin",
      headerName: "Location",
      width: 110,
      renderCell: (params) => (
        <span className="font-mono text-xs text-muted-foreground">{params.row.bin ?? "—"}</span>
      ),
    },
    {
      field: "onHand",
      headerName: "On hand",
      width: 130,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => {
        const { onHand, reorderLevel } = params.row;
        const out = onHand === 0;
        const low = onHand > 0 && onHand <= reorderLevel;
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1 tabular-nums",
              out ? "text-status-danger-fg" : low ? "text-status-warning-fg" : "text-foreground",
            )}
          >
            {out && <PackageX className="size-4" aria-hidden="true" />}
            {low && <AlertTriangle className="size-4" aria-hidden="true" />}
            {onHand} / {reorderLevel}
          </span>
        );
      },
    },
    {
      field: "stockValueCents",
      headerName: "Stock value",
      width: 130,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => <span className="tabular-nums">{formatAudCents(params.row.stockValueCents)}</span>,
    },
    {
      field: "earliestExpiry",
      headerName: "Earliest expiry",
      width: 150,
      renderCell: (params) => {
        const { status, earliestExpiry } = params.row;
        const warn = status.key === "expiring_soon" || status.key === "expired";
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1",
              status.key === "expired"
                ? "text-status-danger-fg"
                : status.key === "expiring_soon"
                  ? "text-status-warning-fg"
                  : "text-muted-foreground",
            )}
          >
            {warn && <CalendarClock className="size-4" aria-hidden="true" />}
            {formatShortDate(earliestExpiry)}
          </span>
        );
      },
    },
    {
      field: "storage",
      headerName: "Storage",
      width: 130,
      renderCell: (params) => (
        <span className="text-sm text-muted-foreground">{STORAGE_LABELS[params.row.storage] ?? params.row.storage}</span>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 140,
      renderCell: (params) => (
        <StatusBadge variant={params.row.status.variant} dot>
          {params.row.status.label}
        </StatusBadge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Track stock on hand, reorder points and expiry across the catalog. Record counts and raise supplier reorders."
        actions={
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="size-4" aria-hidden="true" />
            New stocktake
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Total SKUs" value={summary?.totalSkus ?? items.length} />
        <Stat label="Stock value" value={formatAudCentsWhole(summary?.stockValueCents ?? 0)} />
        <Stat label="Low stock" value={summary?.lowStock ?? 0} tone={summary?.lowStock ? "warning" : "default"} />
        <Stat label="Out of stock" value={summary?.outOfStock ?? 0} tone={summary?.outOfStock ? "danger" : "default"} />
        <Stat
          label="Expiring < 90 days"
          value={summary?.expiringSoon ?? 0}
          tone={summary?.expiringSoon ? "warning" : "default"}
        />
        <Stat label="To reorder" value={summary?.toReorder ?? 0} tone={summary?.toReorder ? "warning" : "default"} />
      </div>

      <FilterBar
        leading={quickChips}
        searchPlaceholder="Search by product, SKU, supplier, bin…"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        resultCount={visible.length}
        resultLabel="items"
      />

      {error ? (
        <EmptyState
          icon={Boxes}
          title="Couldn't load inventory"
          description={error instanceof Error ? error.message : "Please try again."}
          dashed
        />
      ) : !isLoading && items.length === 0 ? (
        <EmptyState icon={Boxes} title="Nothing to count yet" description="Products with stock will appear here." dashed />
      ) : (
        <div className="rounded-sm border border-border bg-card">
          <DataGrid
            rows={visible}
            columns={columns}
            getRowId={(row) => row.productId}
            loading={isLoading}
            rowHeight={62}
            columnHeaderHeight={44}
            disableRowSelectionOnClick
            onRowClick={(params) => push(`/inventory/${params.row.productId}`)}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[25, 50, 100]}
            sx={dataGridSx}
          />
        </div>
      )}
    </div>
  );
}
