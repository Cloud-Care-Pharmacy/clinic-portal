"use client";

import { useMemo, useState } from "react";
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
} from "@mui/x-data-grid";
import { Phone, ShoppingCart, Store, Globe, PackageCheck } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { FilterBar, type FilterDefinition } from "@/components/shared/FilterBar";
import { dataGridSx } from "@/lib/datagrid-theme";
import { matchesSearchQuery } from "@/lib/table-search";
import { cn } from "@/lib/utils";
import {
  ORDER_CHANNELS,
  ORDER_CHANNEL_LABELS,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  hasPrescriptionItems,
  isOpenOrder,
  orderTotals,
  type Order,
  type OrderChannel,
  type OrderStatus,
} from "./mock-orders";

const PRICE_FMT = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
});

const SHORT_DATE_FMT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
};

export type OrderQuickFilter = "open" | "rx" | "fulfilled";

const QUICK_FILTERS: { id: OrderQuickFilter; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "rx", label: "Prescription" },
  { id: "fulfilled", label: "Fulfilled" },
];

const CHANNEL_ICON: Record<OrderChannel, typeof Store> = {
  in_store: Store,
  phone: Phone,
  online: Globe,
  click_collect: PackageCheck,
};

interface OrderTableProps {
  orders: Order[];
  onAdd: () => void;
  onRowClick: (order: Order) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilters: OrderStatus[];
  onStatusFiltersChange: (value: OrderStatus[]) => void;
  channelFilters: OrderChannel[];
  onChannelFiltersChange: (value: OrderChannel[]) => void;
  quickFilters: OrderQuickFilter[];
  onQuickFiltersChange: (value: OrderQuickFilter[]) => void;
}

export function statusVariant(status: OrderStatus) {
  switch (status) {
    case "fulfilled":
      return "success" as const;
    case "paid":
      return "info" as const;
    case "pending":
      return "warning" as const;
    case "draft":
      return "neutral" as const;
    case "cancelled":
      return "danger" as const;
  }
}

export function OrderTable({
  orders,
  onAdd,
  onRowClick,
  searchQuery,
  onSearchChange,
  statusFilters,
  onStatusFiltersChange,
  channelFilters,
  onChannelFiltersChange,
  quickFilters,
  onQuickFiltersChange,
}: OrderTableProps) {
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  });

  const visibleOrders = useMemo(
    () =>
      orders.filter((order) => {
        if (statusFilters.length > 0 && !statusFilters.includes(order.status))
          return false;
        if (channelFilters.length > 0 && !channelFilters.includes(order.channel))
          return false;
        if (quickFilters.includes("open") && !isOpenOrder(order)) return false;
        if (quickFilters.includes("rx") && !hasPrescriptionItems(order))
          return false;
        if (quickFilters.includes("fulfilled") && order.status !== "fulfilled")
          return false;
        return matchesSearchQuery(searchQuery, [
          order.reference,
          order.customerName,
          order.customerEmail ?? "",
          order.customerPhone ?? "",
          ORDER_STATUS_LABELS[order.status],
          ORDER_CHANNEL_LABELS[order.channel],
          ...order.lineItems.flatMap((l) => [l.name, l.sku]),
          order.notes ?? "",
        ]);
      }),
    [orders, searchQuery, statusFilters, channelFilters, quickFilters]
  );

  const filters: FilterDefinition[] = useMemo(
    () => [
      {
        key: "status",
        label: "Status",
        options: ORDER_STATUSES as string[],
        value: statusFilters as string[],
        onChange: (v: string[]) => onStatusFiltersChange(v as OrderStatus[]),
        formatOption: (value: string) =>
          ORDER_STATUS_LABELS[value as OrderStatus] ?? value,
      },
      {
        key: "channel",
        label: "Channel",
        options: ORDER_CHANNELS as string[],
        value: channelFilters as string[],
        onChange: (v: string[]) => onChannelFiltersChange(v as OrderChannel[]),
        formatOption: (value: string) =>
          ORDER_CHANNEL_LABELS[value as OrderChannel] ?? value,
      },
    ],
    [
      statusFilters,
      channelFilters,
      onStatusFiltersChange,
      onChannelFiltersChange,
    ]
  );

  const clearFilters = () => {
    onSearchChange("");
    onStatusFiltersChange([]);
    onChannelFiltersChange([]);
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
              "inline-flex h-9 items-center rounded-sm border px-3 text-sm font-medium transition-colors",
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

  const columns: GridColDef<Order>[] = [
    {
      field: "reference",
      headerName: "Order",
      width: 150,
      renderCell: (params) => (
        <span className="font-mono text-sm font-medium text-foreground">
          {params.value as string}
        </span>
      ),
    },
    {
      field: "customerName",
      headerName: "Customer",
      flex: 1,
      minWidth: 220,
      renderCell: (params) => {
        const order = params.row;
        const subtitle = order.customerEmail || order.customerPhone || "—";
        return (
          <div className="flex min-w-0 flex-col leading-tight py-1">
            <span className="truncate font-medium text-foreground">
              {order.customerName}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {subtitle}
            </span>
          </div>
        );
      },
    },
    {
      field: "channel",
      headerName: "Channel",
      width: 150,
      renderCell: (params) => {
        const channel = params.value as OrderChannel;
        const Icon = CHANNEL_ICON[channel];
        return (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Icon className="size-3.5" aria-hidden="true" />
            {ORDER_CHANNEL_LABELS[channel]}
          </span>
        );
      },
    },
    {
      field: "lineItems",
      headerName: "Items",
      width: 90,
      align: "right",
      headerAlign: "right",
      sortable: false,
      renderCell: (params) => {
        const { unitCount } = orderTotals(params.row);
        return <span className="tabular-nums">{unitCount}</span>;
      },
    },
    {
      field: "total",
      headerName: "Total",
      width: 120,
      align: "right",
      headerAlign: "right",
      sortable: false,
      renderCell: (params) => (
        <span className="tabular-nums font-medium">
          {PRICE_FMT.format(orderTotals(params.row).total)}
        </span>
      ),
    },
    {
      field: "placedAt",
      headerName: "Placed",
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
      width: 130,
      renderCell: (params) => (
        <StatusBadge variant={statusVariant(params.value as OrderStatus)} dot>
          {ORDER_STATUS_LABELS[params.value as OrderStatus]}
        </StatusBadge>
      ),
    },
  ];

  const toolbar = (
    <FilterBar
      leading={quickFilterChips}
      searchPlaceholder="Search by order #, customer, product…"
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      filters={filters}
      resultCount={visibleOrders.length}
      resultLabel="orders"
    />
  );

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="No orders yet"
        description="Create your first customer order to get started."
        actionLabel="Add order"
        onAction={onAdd}
      />
    );
  }

  if (visibleOrders.length === 0) {
    return (
      <div style={{ width: "100%" }}>
        {toolbar}
        <EmptyState
          icon={ShoppingCart}
          title="No orders match your filters"
          description="Adjust or clear the search and filters to see more orders."
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
      <div className="rounded-sm border border-border bg-card overflow-hidden">
        <DataGrid
          rows={visibleOrders}
          columns={columns}
          autoHeight
          disableRowSelectionOnClick
          onRowClick={(params) => onRowClick(params.row as Order)}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 25, 50]}
          rowHeight={60}
          initialState={{
            sorting: { sortModel: [{ field: "placedAt", sort: "desc" }] },
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
