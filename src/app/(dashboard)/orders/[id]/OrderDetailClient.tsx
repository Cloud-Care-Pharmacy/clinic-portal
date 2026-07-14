"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Printer } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";
import { formatAudCents, formatDateTime } from "@/lib/format";
import { useAdvanceOrder, useCancelOrder, useOrder } from "@/lib/hooks/use-orders";
import {
  orderStatusVariant,
  paymentStatusVariant,
  STATUS_LABELS,
  CHANNEL_LABELS,
  PAYMENT_LABELS,
  FULFILMENT_STEPS,
} from "@/components/orders/order-format";
import { ShoppingCart } from "lucide-react";

export function OrderDetailClient({ orderId }: { orderId: string }) {
  const { data, isLoading, error } = useOrder(orderId);
  const advance = useAdvanceOrder();
  const cancel = useCancelOrder();

  const order = data?.data.order;

  if (error) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="Couldn't load order"
        description={error instanceof Error ? error.message : "Please try again."}
        dashed
      />
    );
  }
  if (isLoading || !order) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  const currentStepIndex = order.status === "cancelled" ? -1 : FULFILMENT_STEPS.indexOf(order.status);

  return (
    <div className="space-y-6">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to orders
      </Link>

      <PageHeader
        title={order.displayId}
        description={`${order.customerName} · ${CHANNEL_LABELS[order.channel]} · ${formatDateTime(order.placedAt)}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-border px-3 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Printer className="size-4" aria-hidden="true" />
              Print
            </button>
            {order.nextStatus && (
              <button
                type="button"
                disabled={advance.isPending}
                onClick={() => advance.mutate(order.id)}
                className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                Mark as {STATUS_LABELS[order.nextStatus]}
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            )}
            {order.status === "shipped" && (
              <span className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-status-success-bg px-3 text-sm font-medium text-status-success-fg">
                <Check className="size-4" aria-hidden="true" />
                Shipped
              </span>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge variant={orderStatusVariant(order.status)} dot>
          {STATUS_LABELS[order.status]}
        </StatusBadge>
        {order.hasRx && (
          <span className="rounded-sm bg-status-info-bg px-2 py-0.5 text-xs font-medium text-status-info-fg">Rx</span>
        )}
        {order.hasControlled && (
          <span className="rounded-sm bg-status-danger-bg px-2 py-0.5 text-xs font-medium text-status-danger-fg">
            S8 controlled
          </span>
        )}
      </div>

      {order.status === "cancelled" && (
        <div className="rounded-sm border border-status-danger-border bg-status-danger-bg px-3 py-2 text-sm text-status-danger-fg">
          This order was cancelled{order.cancelReason ? ` — ${order.cancelReason}` : ""}.
        </div>
      )}

      {/* Fulfilment stepper */}
      {order.status !== "cancelled" && (
        <section className="rounded-sm border border-border bg-card p-4">
          <ol className="flex items-center justify-between">
            {FULFILMENT_STEPS.map((step, i) => {
              const done = i < currentStepIndex;
              const current = i === currentStepIndex;
              return (
                <li key={step} className="flex flex-1 items-center gap-2 last:flex-none">
                  <div
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                      done && "border-primary bg-primary text-primary-foreground",
                      current && "border-2 border-primary bg-card text-primary",
                      !done && !current && "border-border bg-card text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="size-4" aria-hidden="true" /> : i + 1}
                  </div>
                  <span className={cn("text-sm", done || current ? "font-semibold text-foreground" : "text-muted-foreground")}>
                    {STATUS_LABELS[step]}
                  </span>
                  {i < FULFILMENT_STEPS.length - 1 && (
                    <span className={cn("mx-2 h-px flex-1", i < currentStepIndex ? "bg-primary" : "bg-border")} />
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
        {/* Items + totals */}
        <section className="rounded-sm border border-border bg-card p-4">
          <h2 className="text-base font-semibold text-foreground">Items</h2>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 font-medium">Item</th>
                <th className="pb-2 text-right font-medium">Qty</th>
                <th className="pb-2 text-right font-medium">Unit</th>
                <th className="pb-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line) => (
                <tr key={line.id} className="border-b border-border/60">
                  <td className="py-2">
                    <span className="text-foreground">{line.name}</span>
                    {line.requiresPrescription && (
                      <span className="ml-1.5 rounded-sm bg-status-info-bg px-1.5 text-xs font-medium text-status-info-fg">
                        Rx
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right tabular-nums">{line.qty}</td>
                  <td className="py-2 text-right tabular-nums">{formatAudCents(line.unitPriceCents)}</td>
                  <td className="py-2 text-right tabular-nums">{formatAudCents(line.lineTotalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 ml-auto w-full max-w-xs space-y-1.5 text-sm">
            <Total label="Subtotal" value={formatAudCents(order.subtotalCents)} />
            <Total label="GST (incl.)" value={formatAudCents(order.gstCents)} />
            <Total label="Shipping" value={order.shippingCents === 0 ? "Free" : formatAudCents(order.shippingCents)} />
            {order.discountCents > 0 && <Total label="Discount" value={`−${formatAudCents(order.discountCents)}`} />}
            <div className="flex items-center justify-between border-t border-border pt-2 text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatAudCents(order.totalCents)}</span>
            </div>
          </div>
        </section>

        {/* Customer + payment */}
        <div className="space-y-4">
          <section className="rounded-sm border border-border bg-card p-4">
            <h2 className="text-base font-semibold text-foreground">Customer</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Name" value={order.customerName} />
              <Row label="Ship to" value={order.suburb ?? "—"} />
              <Row label="Channel" value={CHANNEL_LABELS[order.channel]} />
              <Row label="Placed" value={formatDateTime(order.placedAt)} />
            </dl>
          </section>

          <section className="rounded-sm border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Payment</h2>
              <StatusBadge variant={paymentStatusVariant(order.paymentStatus)}>
                {PAYMENT_LABELS[order.paymentStatus]}
              </StatusBadge>
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Paid" value={formatAudCents(order.amountPaidCents)} />
              <Row label="Order total" value={formatAudCents(order.totalCents)} />
            </dl>
          </section>

          {order.status !== "cancelled" && order.status !== "shipped" && (
            <button
              type="button"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate({ orderId: order.id })}
              className="inline-flex h-9 w-full items-center justify-center rounded-sm border border-status-danger-border px-3 text-sm font-medium text-status-danger-fg transition-colors hover:bg-status-danger-bg disabled:opacity-50"
            >
              Cancel order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate text-right text-foreground">{value}</dd>
    </div>
  );
}
