"use client";

import { useEffect, useId, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  CreditCard,
  Edit3,
  MoreHorizontal,
  PackageCheck,
  Pill,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
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
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  OrderForm,
  orderToFormData,
  useOrderForm,
} from "@/components/orders/OrderForm";
import {
  ORDER_CHANNEL_LABELS,
  ORDER_STATUS_LABELS,
  hasPrescriptionItems,
  isOpenOrder,
  lineTotal,
  orderStore,
  orderTotals,
  type OrderStatus,
} from "@/components/orders/mock-orders";
import { productStore } from "@/components/products/mock-products";
import { statusVariant } from "@/components/orders/OrderTable";

const PRICE_FMT = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
});

const DATE_FMT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
};

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm text-foreground">{children}</span>
    </div>
  );
}

interface OrderDetailClientProps {
  orderId: string;
}

export function OrderDetailClient({ orderId }: OrderDetailClientProps) {
  const { push } = useRouter();
  const orders = useSyncExternalStore(
    orderStore.subscribe,
    orderStore.getSnapshot,
    orderStore.getServerSnapshot
  );
  const products = useSyncExternalStore(
    productStore.subscribe,
    productStore.getSnapshot,
    productStore.getServerSnapshot
  );

  const order = useMemo(
    () => orders.find((o) => o.id === orderId) ?? null,
    [orders, orderId]
  );

  const formId = useId();
  const [isEditing, setIsEditing] = useState(false);
  const [confirm, setConfirm] = useState<null | {
    title: string;
    description: string;
    confirmLabel: string;
    destructive?: boolean;
    onConfirm: () => void;
  }>(null);

  const form = useOrderForm(order ? orderToFormData(order) : undefined);

  useEffect(() => {
    if (order && !isEditing) form.reset(orderToFormData(order));
  }, [order, isEditing, form]);

  // Lines whose ordered quantity exceeds the product's current stock.
  const stockShortfalls = useMemo(() => {
    if (!order) return [];
    return order.lineItems.flatMap((l) => {
      const product = products.find((p) => p.id === l.productId);
      if (!product) return [];
      return product.stock < l.quantity
        ? [{ name: l.name, ordered: l.quantity, available: product.stock }]
        : [];
    });
  }, [order, products]);

  if (!order) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to orders
          </Link>
        </div>
        <EmptyState
          icon={ShoppingCart}
          title="Order not found"
          description={`No order with id ${orderId}. It may have been removed.`}
          actionLabel="Back to orders"
          onAction={() => push("/orders")}
        />
      </div>
    );
  }

  const totals = orderTotals(order);
  const hasRx = hasPrescriptionItems(order);

  function changeStatus(status: OrderStatus, message: string) {
    if (!order) return;
    orderStore.setStatus(order.id, status);
    toast.success(message);
  }

  function fulfill() {
    if (!order) return;
    for (const line of order.lineItems) {
      productStore.adjustStock(line.productId, -line.quantity);
    }
    orderStore.setStatus(order.id, "fulfilled");
    toast.success(`${order.reference} fulfilled — stock updated`);
  }

  const headerActions = isEditing ? (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          form.reset(orderToFormData(order));
          setIsEditing(false);
        }}
      >
        Cancel
      </Button>
      <Button type="submit" form={formId}>
        Save changes
      </Button>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="More actions"
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
          Actions
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {(order.status === "draft" || order.status === "pending") && (
            <DropdownMenuItem
              onClick={() => changeStatus("paid", "Marked as paid")}
            >
              <CreditCard className="size-4" />
              Mark as paid
            </DropdownMenuItem>
          )}
          {order.status === "draft" && (
            <DropdownMenuItem
              onClick={() => changeStatus("pending", "Order submitted")}
            >
              <CheckCircle2 className="size-4" />
              Mark as pending
            </DropdownMenuItem>
          )}
          {isOpenOrder(order) && (
            <DropdownMenuItem
              onClick={() =>
                setConfirm({
                  title: "Fulfil order?",
                  description:
                    stockShortfalls.length > 0
                      ? `This will draw stock down for ${order.lineItems.length} line(s). Warning: ${stockShortfalls.length} item(s) do not have enough stock on hand.`
                      : "This will mark the order as fulfilled and draw the ordered quantities down from product stock.",
                  confirmLabel: "Fulfil order",
                  onConfirm: fulfill,
                })
              }
            >
              <PackageCheck className="size-4" />
              Fulfil &amp; draw down stock
            </DropdownMenuItem>
          )}
          {isOpenOrder(order) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  setConfirm({
                    title: "Cancel order?",
                    description:
                      "The order will be marked as cancelled. This does not affect stock.",
                    confirmLabel: "Cancel order",
                    destructive: true,
                    onConfirm: () => changeStatus("cancelled", "Order cancelled"),
                  })
                }
              >
                <Ban className="size-4 text-status-danger-fg" />
                Cancel order
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {order.status !== "fulfilled" && order.status !== "cancelled" && (
        <Button onClick={() => setIsEditing(true)}>
          <Edit3 className="size-4" aria-hidden="true" />
          Edit
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      <div>
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to orders
        </Link>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-2xl font-semibold tracking-tight">
              {order.reference}
            </h1>
            <StatusBadge variant={statusVariant(order.status)} dot>
              {ORDER_STATUS_LABELS[order.status]}
            </StatusBadge>
            {hasRx && (
              <Badge
                variant="outline"
                className="border-status-info-border bg-status-info-bg text-status-info-fg"
              >
                <Pill className="size-3" aria-hidden="true" />
                Prescription
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.customerName} · {ORDER_CHANNEL_LABELS[order.channel]}
          </p>
        </div>
        {headerActions}
      </div>

      {isEditing ? (
        <div className="rounded-sm border border-border bg-card p-6">
          <OrderForm
            id={formId}
            form={form}
            onValidSubmit={(input) => {
              orderStore.update(order.id, input);
              toast.success("Order updated");
              setIsEditing(false);
            }}
          />
        </div>
      ) : (
        <>
          {stockShortfalls.length > 0 && isOpenOrder(order) && (
            <div className="flex items-start gap-2 rounded-sm border border-status-warning-border bg-status-warning-bg px-3 py-2 text-sm text-status-warning-fg">
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <span>
                {stockShortfalls.length} item
                {stockShortfalls.length === 1 ? "" : "s"} on this order exceed
                available stock:{" "}
                {stockShortfalls
                  .map((s) => `${s.name} (${s.ordered} ordered, ${s.available} on hand)`)
                  .join("; ")}
                .
              </span>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Items + totals */}
            <section className="space-y-4 lg:col-span-2">
              <div className="overflow-hidden rounded-sm border border-border bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-2.5 font-medium">Product</th>
                      <th className="px-4 py-2.5 text-right font-medium">Qty</th>
                      <th className="px-4 py-2.5 text-right font-medium">
                        Unit price
                      </th>
                      <th className="px-4 py-2.5 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.lineItems.map((line) => (
                      <tr
                        key={line.id}
                        className="border-b border-border last:border-b-0"
                      >
                        <td className="px-4 py-3">
                          <div className="flex flex-col leading-tight">
                            <span className="font-medium text-foreground">
                              {line.name}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">
                              {line.sku}
                              {line.requiresPrescription ? " · Rx" : ""}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {line.quantity}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {PRICE_FMT.format(line.unitPrice)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">
                          {PRICE_FMT.format(lineTotal(line))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-end border-t border-border bg-muted/20 px-4 py-3">
                  <div className="grid w-full max-w-xs grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-right tabular-nums">
                      {PRICE_FMT.format(totals.subtotal)}
                    </span>
                    {totals.discount > 0 && (
                      <>
                        <span className="text-muted-foreground">Discount</span>
                        <span className="text-right tabular-nums text-status-success-fg">
                          −{PRICE_FMT.format(totals.discount)}
                        </span>
                      </>
                    )}
                    <span className="text-muted-foreground">Incl. GST</span>
                    <span className="text-right tabular-nums text-muted-foreground">
                      {PRICE_FMT.format(totals.gstIncluded)}
                    </span>
                    <span className="border-t border-border pt-1 font-semibold text-foreground">
                      Total
                    </span>
                    <span className="border-t border-border pt-1 text-right text-base font-semibold tabular-nums text-foreground">
                      {PRICE_FMT.format(totals.total)}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Customer + meta */}
            <section className="space-y-6">
              <div className="space-y-4 rounded-sm border border-border bg-card p-5">
                <h2 className="text-sm font-semibold text-foreground">
                  Customer
                </h2>
                <div className="grid gap-4">
                  <DetailRow label="Name">{order.customerName}</DetailRow>
                  <DetailRow label="Email">
                    {order.customerEmail ?? "—"}
                  </DetailRow>
                  <DetailRow label="Phone">
                    {order.customerPhone ?? "—"}
                  </DetailRow>
                </div>
              </div>

              <div className="space-y-4 rounded-sm border border-border bg-card p-5">
                <h2 className="text-sm font-semibold text-foreground">
                  Fulfilment
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <DetailRow label="Channel">
                    {ORDER_CHANNEL_LABELS[order.channel]}
                  </DetailRow>
                  <DetailRow label="Status">
                    {ORDER_STATUS_LABELS[order.status]}
                  </DetailRow>
                  <DetailRow label="Order date">
                    {new Date(order.placedAt).toLocaleDateString("en-AU", DATE_FMT)}
                  </DetailRow>
                  <DetailRow label="Fulfilled">
                    {order.fulfilledAt
                      ? new Date(order.fulfilledAt).toLocaleDateString(
                          "en-AU",
                          DATE_FMT
                        )
                      : "—"}
                  </DetailRow>
                </div>
              </div>

              {order.notes && (
                <div className="space-y-2 rounded-sm border border-border bg-card p-5">
                  <h2 className="text-sm font-semibold text-foreground">Notes</h2>
                  <p className="whitespace-pre-line text-sm text-muted-foreground">
                    {order.notes}
                  </p>
                </div>
              )}
            </section>
          </div>
        </>
      )}

      <AlertDialog
        open={confirm != null}
        onOpenChange={(v) => {
          if (!v) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={
                confirm?.destructive
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : undefined
              }
              onClick={() => {
                confirm?.onConfirm();
                setConfirm(null);
              }}
            >
              {confirm?.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
