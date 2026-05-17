"use client";

import { useMemo, useState } from "react";
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
} from "@mui/x-data-grid";
import {
  AlertTriangle,
  CalendarClock,
  Package,
  PackageX,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { FilterBar, type FilterDefinition } from "@/components/shared/FilterBar";
import { dataGridSx } from "@/lib/datagrid-theme";
import { matchesSearchQuery } from "@/lib/table-search";
import { cn } from "@/lib/utils";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_FORM_LABELS,
  PRODUCT_SCHEDULES,
  PRODUCT_SCHEDULE_LABELS,
  PRODUCT_SCHEDULE_SHORT,
  PRODUCT_STATUSES,
  PRODUCT_STATUS_LABELS,
  PRODUCT_STORAGE_LABELS,
  isExpired,
  isExpiringSoon,
  isLowStock,
  type Product,
  type ProductCategory,
  type ProductSchedule,
  type ProductStatus,
} from "./mock-products";

const PRICE_FMT = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
});

const SHORT_DATE_FMT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
};

export type QuickFilter = "low-stock" | "expiring" | "rx-only" | "controlled";

const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: "low-stock", label: "Low stock" },
  { id: "expiring", label: "Expiring soon" },
  { id: "rx-only", label: "Rx only" },
  { id: "controlled", label: "S8 controlled" },
];

interface ProductTableProps {
  products: Product[];
  onAdd: () => void;
  onRowClick: (product: Product) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  categoryFilters: ProductCategory[];
  onCategoryFiltersChange: (value: ProductCategory[]) => void;
  scheduleFilters: ProductSchedule[];
  onScheduleFiltersChange: (value: ProductSchedule[]) => void;
  statusFilters: ProductStatus[];
  onStatusFiltersChange: (value: ProductStatus[]) => void;
  quickFilters: QuickFilter[];
  onQuickFiltersChange: (value: QuickFilter[]) => void;
}

function scheduleBadgeClass(schedule: ProductSchedule) {
  switch (schedule) {
    case "S8":
      return "border-status-danger-border bg-status-danger-bg text-status-danger-fg";
    case "S4":
      return "border-status-warning-border bg-status-warning-bg text-status-warning-fg";
    case "S3":
    case "S2":
      return "border-status-info-border bg-status-info-bg text-status-info-fg";
    default:
      return "";
  }
}

function statusVariant(status: ProductStatus) {
  switch (status) {
    case "active":
      return "success" as const;
    case "inactive":
      return "neutral" as const;
    case "discontinued":
      return "warning" as const;
    case "recalled":
      return "danger" as const;
  }
}

export function ProductTable({
  products,
  onAdd,
  onRowClick,
  searchQuery,
  onSearchChange,
  categoryFilters,
  onCategoryFiltersChange,
  scheduleFilters,
  onScheduleFiltersChange,
  statusFilters,
  onStatusFiltersChange,
  quickFilters,
  onQuickFiltersChange,
}: ProductTableProps) {
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  });

  const visibleProducts = useMemo(
    () =>
      products.filter((product) => {
        if (
          categoryFilters.length > 0 &&
          !categoryFilters.includes(product.category)
        )
          return false;
        if (
          scheduleFilters.length > 0 &&
          !scheduleFilters.includes(product.schedule)
        )
          return false;
        if (statusFilters.length > 0 && !statusFilters.includes(product.status))
          return false;
        if (quickFilters.includes("low-stock") && !isLowStock(product))
          return false;
        if (quickFilters.includes("expiring") && !isExpiringSoon(product))
          return false;
        if (quickFilters.includes("rx-only") && !product.requiresPrescription)
          return false;
        if (quickFilters.includes("controlled") && product.schedule !== "S8")
          return false;
        return matchesSearchQuery(searchQuery, [
          product.name,
          product.brand ?? "",
          product.genericName ?? "",
          product.activeIngredient ?? "",
          product.sku,
          product.barcode ?? "",
          product.category,
          PRODUCT_CATEGORY_LABELS[product.category],
          product.schedule,
          product.status,
          product.supplier ?? "",
          product.description ?? "",
        ]);
      }),
    [
      products,
      searchQuery,
      categoryFilters,
      scheduleFilters,
      statusFilters,
      quickFilters,
    ]
  );

  const filters: FilterDefinition[] = useMemo(
    () => [
      {
        key: "category",
        label: "Category",
        options: PRODUCT_CATEGORIES as string[],
        value: categoryFilters as string[],
        onChange: (v: string[]) =>
          onCategoryFiltersChange(v as ProductCategory[]),
        formatOption: (value: string) =>
          PRODUCT_CATEGORY_LABELS[value as ProductCategory] ?? value,
      },
      {
        key: "schedule",
        label: "Schedule",
        options: PRODUCT_SCHEDULES as string[],
        value: scheduleFilters as string[],
        onChange: (v: string[]) =>
          onScheduleFiltersChange(v as ProductSchedule[]),
        formatOption: (value: string) =>
          PRODUCT_SCHEDULE_LABELS[value as ProductSchedule] ?? value,
      },
      {
        key: "status",
        label: "Status",
        options: PRODUCT_STATUSES as string[],
        value: statusFilters as string[],
        onChange: (v: string[]) => onStatusFiltersChange(v as ProductStatus[]),
        formatOption: (value: string) =>
          PRODUCT_STATUS_LABELS[value as ProductStatus] ?? value,
      },
    ],
    [
      categoryFilters,
      scheduleFilters,
      statusFilters,
      onCategoryFiltersChange,
      onScheduleFiltersChange,
      onStatusFiltersChange,
    ]
  );

  const clearFilters = () => {
    onSearchChange("");
    onCategoryFiltersChange([]);
    onScheduleFiltersChange([]);
    onStatusFiltersChange([]);
    onQuickFiltersChange([]);
  };

  const quickFilterChips = (
    <div className="flex flex-wrap items-center gap-1.5">
      {QUICK_FILTERS.map((qf) => {
        const active = quickFilters.includes(qf.id);
        return (
          <button
            key={qf.id}
            type="button"
            onClick={() =>
              onQuickFiltersChange(
                active
                  ? quickFilters.filter((q) => q !== qf.id)
                  : [...quickFilters, qf.id]
              )
            }
            className={cn(
              "inline-flex h-9 items-center rounded-full border px-3 text-sm font-medium transition-colors",
              active
                ? "border-primary/50 bg-primary/10 text-foreground"
                : "border-border hover:bg-accent"
            )}
            aria-pressed={active}
          >
            {qf.label}
          </button>
        );
      })}
    </div>
  );

  const columns: GridColDef<Product>[] = [
    {
      field: "name",
      headerName: "Product",
      flex: 1,
      minWidth: 280,
      renderCell: (params) => {
        const product = params.row;
        const subtitle = [
          product.brand,
          product.strength,
          product.packSize,
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <div className="flex min-w-0 items-center gap-3 py-1">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Package className="size-4" aria-hidden="true" />
            </div>
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate font-medium text-foreground">
                {product.name}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {subtitle || product.sku}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      field: "sku",
      headerName: "SKU",
      width: 140,
      renderCell: (params) => (
        <span className="font-mono text-xs text-muted-foreground">
          {params.value as string}
        </span>
      ),
    },
    {
      field: "category",
      headerName: "Category",
      width: 150,
      renderCell: (params) => (
        <Badge variant="outline" className="text-xs font-medium">
          {PRODUCT_CATEGORY_LABELS[params.value as ProductCategory]}
        </Badge>
      ),
    },
    {
      field: "form",
      headerName: "Form",
      width: 110,
      renderCell: (params) => (
        <span className="text-sm capitalize text-muted-foreground">
          {PRODUCT_FORM_LABELS[params.row.form]}
        </span>
      ),
    },
    {
      field: "schedule",
      headerName: "Schedule",
      width: 110,
      renderCell: (params) => {
        const schedule = params.value as ProductSchedule;
        if (schedule === "unscheduled") {
          return <span className="text-xs text-muted-foreground">—</span>;
        }
        return (
          <Badge
            variant="outline"
            className={cn("text-xs font-semibold", scheduleBadgeClass(schedule))}
          >
            {schedule === "S8" ? (
              <ShieldAlert className="size-3" aria-hidden="true" />
            ) : null}
            {PRODUCT_SCHEDULE_SHORT[schedule]}
          </Badge>
        );
      },
    },
    {
      field: "stock",
      headerName: "Stock",
      width: 130,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => {
        const product = params.row;
        const out = product.stock === 0;
        const low = isLowStock(product);
        const tone = out
          ? "text-status-danger-fg"
          : low
            ? "text-status-warning-fg"
            : "text-foreground";
        return (
          <span className={cn("inline-flex items-center gap-1.5 tabular-nums", tone)}>
            {out ? (
              <PackageX className="size-3.5" aria-hidden="true" />
            ) : low ? (
              <AlertTriangle className="size-3.5" aria-hidden="true" />
            ) : null}
            {product.stock}
            <span className="text-xs text-muted-foreground">
              / {product.reorderLevel}
            </span>
          </span>
        );
      },
    },
    {
      field: "earliestExpiry",
      headerName: "Expiry",
      width: 140,
      renderCell: (params) => {
        const product = params.row;
        if (!product.earliestExpiry) {
          return <span className="text-xs text-muted-foreground">—</span>;
        }
        const expired = isExpired(product);
        const expiring = isExpiringSoon(product);
        const tone = expired
          ? "text-status-danger-fg"
          : expiring
            ? "text-status-warning-fg"
            : "text-muted-foreground";
        return (
          <span className={cn("inline-flex items-center gap-1.5", tone)}>
            {(expired || expiring) && (
              <CalendarClock className="size-3.5" aria-hidden="true" />
            )}
            {new Date(product.earliestExpiry).toLocaleDateString(
              "en-AU",
              SHORT_DATE_FMT
            )}
          </span>
        );
      },
    },
    {
      field: "price",
      headerName: "Price",
      width: 110,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => (
        <span className="tabular-nums">
          {PRICE_FMT.format(params.value as number)}
        </span>
      ),
    },
    {
      field: "storage",
      headerName: "Storage",
      width: 180,
      renderCell: (params) => (
        <span className="text-sm text-muted-foreground">
          {PRODUCT_STORAGE_LABELS[params.row.storage]}
        </span>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      renderCell: (params) => (
        <StatusBadge
          variant={statusVariant(params.value as ProductStatus)}
          dot
          className="capitalize"
        >
          {PRODUCT_STATUS_LABELS[params.value as ProductStatus]}
        </StatusBadge>
      ),
    },
  ];

  const toolbar = (
    <FilterBar
      leading={quickFilterChips}
      searchPlaceholder="Search by name, brand, SKU, barcode…"
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      filters={filters}
      resultCount={visibleProducts.length}
      resultLabel="products"
    />
  );

  if (products.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No products yet"
        description="Add your first product to start building the catalog."
        actionLabel="Add product"
        onAction={onAdd}
      />
    );
  }

  if (visibleProducts.length === 0) {
    return (
      <div style={{ width: "100%" }}>
        {toolbar}
        <EmptyState
          icon={Package}
          title="No products match your filters"
          description="Adjust or clear the search and filters to see more products."
          actionLabel="Clear filters"
          onAction={clearFilters}
          dashed
        />
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      {toolbar}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <DataGrid
          rows={visibleProducts}
          columns={columns}
          autoHeight
          disableRowSelectionOnClick
          onRowClick={(params) => onRowClick(params.row as Product)}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 25, 50]}
          rowHeight={64}
          initialState={{
            sorting: { sortModel: [{ field: "updatedAt", sort: "desc" }] },
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
