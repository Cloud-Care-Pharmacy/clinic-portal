/**
 * Shared label + badge-variant maps for orders (list, detail, stepper).
 * Kept in one place so the two order surfaces stay consistent.
 */

import type { OrderStatus, PaymentStatus } from "@/types/catalog";

export const STATUS_LABELS: Record<OrderStatus, string> = {
  received: "Received",
  picking: "Picking",
  fulfilled: "Fulfilled",
  shipped: "Shipped",
  cancelled: "Cancelled",
};

export const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  paid: "Paid",
  partially_refunded: "Part. refunded",
  refunded: "Refunded",
};

export const CHANNEL_LABELS: Record<string, string> = {
  in_store: "In-store",
  online: "Online",
  phone: "Phone",
};

type Variant = "success" | "warning" | "danger" | "info" | "accent" | "neutral";

export function orderStatusVariant(status: OrderStatus): Variant {
  switch (status) {
    case "received":
      return "info";
    case "picking":
      return "warning";
    case "fulfilled":
      return "accent";
    case "shipped":
      return "success";
    case "cancelled":
      return "neutral";
  }
}

export function paymentStatusVariant(status: PaymentStatus): Variant {
  switch (status) {
    case "paid":
      return "success";
    case "unpaid":
      return "warning";
    case "partially_refunded":
      return "warning";
    case "refunded":
      return "neutral";
  }
}

export const FULFILMENT_STEPS: OrderStatus[] = ["received", "picking", "fulfilled", "shipped"];
