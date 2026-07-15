"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
} from "@mui/x-data-grid";
import { Plus, ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { FilterBar, type FilterDefinition } from "@/components/shared/FilterBar";
import { dataGridSx } from "@/lib/datagrid-theme";
import { matchesSearchQuery } from "@/lib/table-search";
import { cn } from "@/lib/utils";
import { formatAudCents, formatAudCentsWhole, formatShortDate } from "@/lib/format";
import { useOrders, useOrdersSummary } from "@/lib/hooks/use-orders";
import {
  orderStatusVariant,
  paymentStatusVariant,
  STATUS_LABELS,
  CHANNEL_LABELS,
  PAYMENT_LABELS,
} from "@/components/orders/order-format";
import type { OrderSummary, OrderStatus, PaymentStatus } from "@/types/catalog";

type QuickFilter = "received" | "picking" | "fulfilled" | "shipped" | "unpaid" | "prescription";
const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: "received", label: "Received" },
  { id: "picking", label: "Picking" },
  { id: "fulfilled", label: "Fulfilled" },
  { id: "shipped", label: "Shipped" },
  { id: "unpaid", label: "Unpaid" },
  { id: "prescription", label: "Prescription" },
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
    tone === "danger" ? "text-status-danger-fg" : tone === "warning" ? "text-status-warning-fg" : "text-foreground";
  return (
    <div className="rounded-sm border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}

export function OrdersClient() {
  const { push } = useRouter();
  const { data, isLoading, error } = useOrders();
  const { data: summaryData } = useOrdersSummary();
  const orders = useMemo(() => data?.data.orders ?? [], [data]);
  const summary = summaryData?.data.summary;

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [channelFilters, setChannelFilters] = useState<string[]>([]);
  const [paymentFilters, setPaymentFilters] = useState<string[]>([]);
  const [quickFilters, setQuickFilters] = useState<QuickFilter[]>([]);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });

  const visible = useMemo(
    () =>
      orders.filter((o) => {
        if (statusFilters.length && !statusFilters.includes(o.status)) return false;
        if (channelFilters.length && !channelFilters.includes(o.channel)) return false;
        if (paymentFilters.length && !paymentFilters.includes(o.paymentStatus)) return false;
        for (const qf of quickFilters) {
          if (qf === "unpaid" && o.paymentStatus !== "unpaid") return false;
          if (qf === "prescription" && !o.hasRx) return false;
          if (["received", "picking", "fulfilled", "shipped"].includes(qf) && o.status !== qf) return false;
        }
        return matchesSearchQuery(searchQuery, [o.displayId, o.customerName, o.firstProduct ?? ""]);
      }),
    [orders, searchQuery, statusFilters, channelFilters, paymentFilters, quickFilters],
  );

  const filters: FilterDefinition[] = [
    {
      key: "status",
      label: "Status",
      options: ["received", "picking", "fulfilled", "shipped", "cancelled"] satisfies OrderStatus[],
      value: statusFilters,
      onChange: setStatusFilters,
      formatOption: (v) => STATUS_LABELS[v as OrderStatus] ?? v,
    },
    {
      key: "channel",
      label: "Channel",
      options: ["in_store", "online", "phone"],
      value: channelFilters,
      onChange: setChannelFilters,
      formatOption: (v) => CHANNEL_LABELS[v] ?? v,
    },
    {
      key: "payment",
      label: "Payment",
      options: ["unpaid", "paid", "partially_refunded", "refunded"] satisfies PaymentStatus[],
      value: paymentFilters,
      onChange: setPaymentFilters,
      formatOption: (v) => PAYMENT_LABELS[v as PaymentStatus] ?? v,
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

  const columns: GridColDef<OrderSummary>[] = [
    {
      field: "displayId",
      headerName: "Order",
      width: 200,
      renderCell: (params) => (
        <div className="flex min-w-0 flex-col py-1 leading-tight">
          <span className="font-mono text-[13px] font-medium text-foreground">{params.row.displayId}</span>
          <span className="truncate text-xs text-muted-foreground">
            {params.row.firstProduct}
            {params.row.itemCount > 1 ? ` + ${params.row.itemCount - 1} more` : ""}
          </span>
        </div>
      ),
    },
    {
      field: "customerName",
      headerName: "Customer",
      flex: 1,
      minWidth: 180,
      renderCell: (params) => (
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-foreground">{params.row.customerName}</span>
          <span className="truncate text-xs text-muted-foreground">{params.row.suburb ?? ""}</span>
        </div>
      ),
    },
    {
      field: "itemCount",
      headerName: "Items",
      width: 120,
      renderCell: (params) => (
        <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
          {params.row.itemCount} items
          {params.row.hasRx && (
            <span className="rounded-sm bg-status-info-bg px-1.5 text-xs font-medium text-status-info-fg">Rx</span>
          )}
        </span>
      ),
    },
    {
      field: "channel",
      headerName: "Channel",
      width: 110,
      renderCell: (params) => (
        <span className="text-sm text-muted-foreground">{CHANNEL_LABELS[params.row.channel]}</span>
      ),
    },
    {
      field: "placedAt",
      headerName: "Placed",
      width: 130,
      renderCell: (params) => (
        <span className="text-sm text-muted-foreground">{formatShortDate(params.row.placedAt)}</span>
      ),
    },
    {
      field: "totalCents",
      headerName: "Total",
      width: 110,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => <span className="tabular-nums">{formatAudCents(params.row.totalCents)}</span>,
    },
    {
      field: "paymentStatus",
      headerName: "Payment",
      width: 130,
      renderCell: (params) => (
        <StatusBadge variant={paymentStatusVariant(params.row.paymentStatus)}>
          {PAYMENT_LABELS[params.row.paymentStatus]}
        </StatusBadge>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      renderCell: (params) => (
        <StatusBadge variant={orderStatusVariant(params.row.status)} dot>
          {STATUS_LABELS[params.row.status]}
        </StatusBadge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Track customer orders from received through picking, fulfilment and dispatch."
        actions={
          <button
            type="button"
            onClick={() => push("/orders/new")}
            className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="size-4" aria-hidden="true" />
            New order
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Total orders" value={summary?.total ?? orders.length} />
        <Stat
          label="Awaiting fulfilment"
          value={summary?.awaitingFulfilment ?? 0}
          tone={summary?.awaitingFulfilment ? "warning" : "default"}
        />
        <Stat label="Ready to ship" value={summary?.readyToShip ?? 0} />
        <Stat label="Shipped" value={summary?.shipped ?? 0} />
        <Stat label="Revenue (paid)" value={formatAudCentsWhole(summary?.revenuePaidCents ?? 0)} />
        <Stat label="Cancelled" value={summary?.cancelled ?? 0} tone={summary?.cancelled ? "danger" : "default"} />
      </div>

      <FilterBar
        leading={quickChips}
        searchPlaceholder="Search by order #, customer, product…"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        resultCount={visible.length}
        resultLabel="orders"
      />

      {error ? (
        <EmptyState
          icon={ShoppingCart}
          title="Couldn't load orders"
          description={error instanceof Error ? error.message : "Please try again."}
          dashed
        />
      ) : !isLoading && orders.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="No orders yet" description="Customer orders will appear here." dashed />
      ) : (
        <div className="rounded-sm border border-border bg-card">
          <DataGrid
            rows={visible}
            columns={columns}
            getRowId={(row) => row.id}
            loading={isLoading}
            rowHeight={62}
            columnHeaderHeight={44}
            disableRowSelectionOnClick
            onRowClick={(params) => push(`/orders/${params.row.id}`)}
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
