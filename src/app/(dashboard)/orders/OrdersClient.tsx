"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import {
  OrderTable,
  type OrderQuickFilter,
} from "@/components/orders/OrderTable";
import {
  isOpenOrder,
  orderStore,
  orderTotals,
  type OrderChannel,
  type OrderStatus,
} from "@/components/orders/mock-orders";

const PRICE_FMT = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 0,
});

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "warning" | "info";
}) {
  const toneClass =
    tone === "info"
      ? "text-status-info-fg"
      : tone === "warning"
        ? "text-status-warning-fg"
        : "text-foreground";
  return (
    <div className="rounded-sm border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}

export function OrdersClient() {
  const { push } = useRouter();
  const orders = useSyncExternalStore(
    orderStore.subscribe,
    orderStore.getSnapshot,
    orderStore.getServerSnapshot
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState<OrderStatus[]>([]);
  const [channelFilters, setChannelFilters] = useState<OrderChannel[]>([]);
  const [quickFilters, setQuickFilters] = useState<OrderQuickFilter[]>([]);

  const stats = useMemo(() => {
    const open = orders.filter(isOpenOrder);
    const fulfilled = orders.filter((o) => o.status === "fulfilled");
    const pending = orders.filter((o) => o.status === "pending");
    const openValue = open.reduce((sum, o) => sum + orderTotals(o).total, 0);
    return {
      total: orders.length,
      open: open.length,
      pending: pending.length,
      fulfilled: fulfilled.length,
      openValue,
    };
  }, [orders]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Create and track customer orders across in-store, phone and online channels. Mocked locally until the backend ships."
        actions={
          <Link
            href="/orders/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add order
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Total orders" value={stats.total} />
        <Stat
          label="Open"
          value={stats.open}
          tone={stats.open > 0 ? "info" : "default"}
        />
        <Stat
          label="Pending"
          value={stats.pending}
          tone={stats.pending > 0 ? "warning" : "default"}
        />
        <Stat label="Fulfilled" value={stats.fulfilled} />
        <Stat label="Open value" value={PRICE_FMT.format(stats.openValue)} />
      </div>

      <ErrorBoundary>
        <OrderTable
          orders={orders}
          onAdd={() => push("/orders/new")}
          onRowClick={(order) => push(`/orders/${order.id}`)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilters={statusFilters}
          onStatusFiltersChange={setStatusFilters}
          channelFilters={channelFilters}
          onChannelFiltersChange={setChannelFilters}
          quickFilters={quickFilters}
          onQuickFiltersChange={setQuickFilters}
        />
      </ErrorBoundary>
    </div>
  );
}
