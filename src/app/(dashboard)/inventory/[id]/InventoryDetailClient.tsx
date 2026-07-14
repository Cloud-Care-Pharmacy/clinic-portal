"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Package, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";
import { formatAudCents, formatShortDate, formatDateTime } from "@/lib/format";
import {
  useAdjustStock,
  useInventoryItem,
  useStockMovements,
} from "@/lib/hooks/use-inventory";
import type { StockMovementType } from "@/types/catalog";

const REASONS: { value: StockMovementType; label: string }[] = [
  { value: "received", label: "Received delivery" },
  { value: "stocktake", label: "Stocktake correction" },
  { value: "damaged", label: "Damaged" },
  { value: "expired", label: "Expired" },
  { value: "return_supplier", label: "Returned to supplier" },
  { value: "dispensed", label: "Dispensed" },
];

const MOVEMENT_LABELS: Record<string, string> = {
  received: "Received",
  dispensed: "Dispensed",
  sale: "Sale",
  adjustment: "Adjustment",
  stocktake: "Stocktake",
  return_customer: "Customer return",
  return_supplier: "Supplier return",
  damaged: "Damaged",
  expired: "Expired",
  transfer_in: "Transfer in",
  transfer_out: "Transfer out",
};

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-sm border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

export function InventoryDetailClient({ productId }: { productId: string }) {
  const { data, isLoading, error } = useInventoryItem(productId);
  const { data: movementsData } = useStockMovements(productId);
  const adjust = useAdjustStock();

  const [reason, setReason] = useState<StockMovementType>("received");
  const [qty, setQty] = useState<number>(1);

  const item = data?.data.item;
  const movements = movementsData?.data.movements ?? [];

  if (error) {
    return (
      <EmptyState
        icon={Package}
        title="Couldn't load item"
        description={error instanceof Error ? error.message : "Please try again."}
        dashed
      />
    );
  }
  if (isLoading || !item) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  const needsReorder = item.status.key === "low_stock" || item.status.key === "out_of_stock";
  const estOrderCents = item.suggestedReorderQty * (item.costPriceCents ?? 0);

  const submitAdjust = (sign: 1 | -1) => {
    if (!qty || qty <= 0) return;
    adjust.mutate({ productId, quantity: sign * qty, type: reason });
  };

  return (
    <div className="space-y-6">
      <Link
        href="/inventory"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to inventory
      </Link>

      <PageHeader
        title={item.name}
        description={[item.sku, item.supplierName].filter(Boolean).join(" · ")}
        actions={
          <Link
            href={`/products/${item.productId}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-border px-3 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Package className="size-4" aria-hidden="true" />
            View product
          </Link>
        }
      />
      <StatusBadge variant={item.status.variant} dot>
        {item.status.label}
      </StatusBadge>

      {/* Warning banners */}
      <div className="space-y-2">
        {item.status.key === "expired" && (
          <Banner tone="danger">This product&apos;s earliest batch has expired ({formatShortDate(item.earliestExpiry)}).</Banner>
        )}
        {item.status.key === "expiring_soon" && (
          <Banner tone="warning">Stock expires soon ({formatShortDate(item.earliestExpiry)}).</Banner>
        )}
        {item.onHand === 0 && (
          <Banner tone="danger">Out of stock — raise a reorder with {item.supplierName ?? "your supplier"}.</Banner>
        )}
        {needsReorder && item.onHand > 0 && (
          <Banner tone="warning">At or below reorder level. Suggested reorder: {item.suggestedReorderQty} units.</Banner>
        )}
        {item.schedule === "S8" && (
          <Banner tone="danger">S8 controlled drug — must be stored in the controlled safe and recorded in the CD register.</Banner>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="On hand" value={item.onHand} />
        <SummaryCard label="Reorder level" value={item.reorderLevel} />
        <SummaryCard label="Stock value" value={formatAudCents(item.stockValueCents)} />
        <SummaryCard label="Earliest expiry" value={formatShortDate(item.earliestExpiry)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Stock movements */}
        <section className="rounded-sm border border-border bg-card p-4">
          <h2 className="text-base font-semibold text-foreground">Stock movements</h2>
          {movements.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No movements recorded yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {movements.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-2 text-sm">
                  <StatusBadge
                    variant={m.quantity > 0 ? "success" : "info"}
                    className="w-28 justify-center"
                  >
                    {MOVEMENT_LABELS[m.type] ?? m.type}
                  </StatusBadge>
                  <span
                    className={cn(
                      "w-14 text-right font-medium tabular-nums",
                      m.quantity > 0 ? "text-status-success-fg" : "text-status-danger-fg",
                    )}
                  >
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{m.reason ?? ""}</span>
                  <span className="shrink-0 text-right text-muted-foreground">{formatShortDate(m.movedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Record a count + purchasing */}
        <div className="space-y-4">
          <section className="rounded-sm border border-border bg-card p-4">
            <h2 className="text-base font-semibold text-foreground">Record a count</h2>
            <div className="mt-3 space-y-3">
              <label className="block text-sm">
                <span className="text-muted-foreground">Reason</span>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as StockMovementType)}
                  className="mt-1 h-9 w-full rounded-sm border border-input bg-popover px-3 text-sm"
                >
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">Quantity</span>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  className="mt-1 h-9 w-full rounded-sm border border-input bg-popover px-3 text-sm tabular-nums"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={adjust.isPending}
                  onClick={() => submitAdjust(1)}
                  className="inline-flex h-9 flex-1 items-center justify-center rounded-sm bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  type="button"
                  disabled={adjust.isPending}
                  onClick={() => submitAdjust(-1)}
                  className="inline-flex h-9 flex-1 items-center justify-center rounded-sm border border-border px-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
              {adjust.isError && (
                <p className="text-xs text-status-danger-fg">
                  {adjust.error instanceof Error ? adjust.error.message : "Adjustment failed"}
                </p>
              )}
            </div>
          </section>

          <section className="rounded-sm border border-border bg-card p-4">
            <h2 className="text-base font-semibold text-foreground">Purchasing</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Supplier" value={item.supplierName ?? "—"} />
              <Row label="Suggested reorder" value={`${item.suggestedReorderQty} units`} />
              <Row label="Unit cost" value={formatAudCents(item.costPriceCents)} />
              <Row label="Est. order cost" value={formatAudCents(estOrderCents)} />
            </dl>
            {needsReorder ? (
              <button
                type="button"
                className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-sm bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Create purchase order
              </button>
            ) : (
              <p className="mt-3 text-sm text-status-success-fg">Stock healthy — no reorder needed.</p>
            )}
          </section>
        </div>
      </div>

      <section className="rounded-sm border border-border bg-card p-4">
        <h2 className="text-base font-semibold text-foreground">Storage &amp; compliance</h2>
        <dl className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-5">
          <Row label="Storage" value={item.storage} />
          <Row label="Cold chain" value={item.isColdChain ? "Yes" : "No"} />
          <Row label="Earliest expiry" value={formatShortDate(item.earliestExpiry)} />
          <Row label="Last counted" value={item.lastCountedAt ? formatDateTime(item.lastCountedAt) : "—"} />
          <Row label="Location" value={item.bin ?? "—"} mono />
        </dl>
        {item.schedule === "S8" && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldAlert className="size-4" aria-hidden="true" />
            Every movement must be recorded in the CD register.
          </p>
        )}
      </section>
    </div>
  );
}

function Banner({ tone, children }: { tone: "danger" | "warning"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-sm border px-3 py-2 text-sm",
        tone === "danger"
          ? "border-status-danger-border bg-status-danger-bg text-status-danger-fg"
          : "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
      )}
    >
      {children}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={cn("text-foreground", mono && "font-mono")}>{value}</dd>
    </div>
  );
}
