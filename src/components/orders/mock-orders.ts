/**
 * Temporary client-side mock store for the orders feature.
 *
 * There is no backend yet — this module keeps a per-tab in-memory list of
 * customer/sales orders and exposes a tiny pub/sub so the table, forms and
 * detail view stay in sync. Swap this file for TanStack Query hooks
 * (`use-orders`) backed by the gateway once `/v1/orders` ships. The shape here
 * intentionally mirrors what a pharmacy point-of-sale needs (customer,
 * fulfilment channel, line items snapshotted from the product catalog,
 * pricing and lifecycle status) so it can map cleanly to the future API.
 *
 * Line items snapshot product data (name, sku, unit price, flags) at the time
 * they are added so an order stays historically accurate even if the catalog
 * later changes. `productId` is retained so fulfilment can draw the right stock
 * down from the products store.
 */

// -----------------------------------------------------------------------------
// Domain types
// -----------------------------------------------------------------------------

/**
 * Fulfilment lifecycle for a customer order.
 * - draft: still being assembled, nothing committed
 * - pending: submitted, awaiting payment / picking
 * - paid: payment captured, awaiting hand-over
 * - fulfilled: dispensed / handed to the customer (stock drawn down)
 * - cancelled: voided before fulfilment
 */
export type OrderStatus = "draft" | "pending" | "paid" | "fulfilled" | "cancelled";

/** How the customer placed / will receive the order. */
export type OrderChannel = "in_store" | "phone" | "online" | "click_collect";

export interface OrderLineItem {
  id: string;
  productId: string;
  // Snapshot of the product at the time the line was added.
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number; // AUD, GST-inclusive where applicable
  gstApplicable: boolean;
  requiresPrescription: boolean;
}

export interface Order {
  id: string;
  reference: string; // human-facing order number, e.g. "ORD-1042"
  // Customer
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  // Fulfilment
  channel: OrderChannel;
  status: OrderStatus;
  // Money
  lineItems: OrderLineItem[];
  discount: number; // flat AUD discount applied to the subtotal
  // Dates
  placedAt: string; // ISO date (YYYY-MM-DD)
  fulfilledAt?: string; // ISO date (YYYY-MM-DD)
  // Misc
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// Enumerations & labels
// -----------------------------------------------------------------------------

export const ORDER_STATUSES: OrderStatus[] = [
  "draft",
  "pending",
  "paid",
  "fulfilled",
  "cancelled",
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "Draft",
  pending: "Pending",
  paid: "Paid",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
};

export const ORDER_CHANNELS: OrderChannel[] = [
  "in_store",
  "phone",
  "online",
  "click_collect",
];

export const ORDER_CHANNEL_LABELS: Record<OrderChannel, string> = {
  in_store: "In store",
  phone: "Phone",
  online: "Online",
  click_collect: "Click & collect",
};

/** GST rate in Australia (10%). Prices are stored GST-inclusive. */
const GST_DIVISOR = 11; // GST component of a tax-inclusive price is price / 11

// -----------------------------------------------------------------------------
// Derived values
// -----------------------------------------------------------------------------

export interface OrderTotals {
  /** Number of distinct line items. */
  itemCount: number;
  /** Total units across all lines. */
  unitCount: number;
  /** Sum of line totals before discount. */
  subtotal: number;
  /** GST component contained within the taxable lines. */
  gstIncluded: number;
  /** Flat discount applied. */
  discount: number;
  /** Payable total (subtotal − discount, floored at 0). */
  total: number;
}

export function lineTotal(line: Pick<OrderLineItem, "quantity" | "unitPrice">): number {
  return line.quantity * line.unitPrice;
}

export function orderTotals(order: Pick<Order, "lineItems" | "discount">): OrderTotals {
  const subtotal = order.lineItems.reduce((sum, l) => sum + lineTotal(l), 0);
  const gstIncluded = order.lineItems.reduce(
    (sum, l) => (l.gstApplicable ? sum + lineTotal(l) / GST_DIVISOR : sum),
    0
  );
  const discount = Math.min(order.discount, subtotal);
  return {
    itemCount: order.lineItems.length,
    unitCount: order.lineItems.reduce((sum, l) => sum + l.quantity, 0),
    subtotal,
    gstIncluded,
    discount,
    total: Math.max(0, subtotal - discount),
  };
}

/** True when the order contains at least one prescription-only line. */
export function hasPrescriptionItems(order: Pick<Order, "lineItems">): boolean {
  return order.lineItems.some((l) => l.requiresPrescription);
}

/** Statuses in which an order has not yet been fulfilled or cancelled. */
export function isOpenOrder(order: Pick<Order, "status">): boolean {
  return (
    order.status === "draft" ||
    order.status === "pending" ||
    order.status === "paid"
  );
}

// -----------------------------------------------------------------------------
// Seed data
// -----------------------------------------------------------------------------

const INITIAL_ORDERS: Order[] = [
  {
    id: "ord_1001",
    reference: "ORD-1042",
    customerName: "Margaret Hollis",
    customerEmail: "m.hollis@example.com",
    customerPhone: "0412 884 220",
    channel: "in_store",
    status: "fulfilled",
    lineItems: [
      {
        id: "oli_1",
        productId: "prd_003",
        name: "Paracetamol 500mg Tablets",
        sku: "OTC-PCM-500",
        quantity: 2,
        unitPrice: 6.95,
        gstApplicable: false,
        requiresPrescription: false,
      },
      {
        id: "oli_2",
        productId: "prd_010",
        name: "Hydrocortisone 1% Cream",
        sku: "OTC-HYD-1",
        quantity: 1,
        unitPrice: 9.95,
        gstApplicable: false,
        requiresPrescription: false,
      },
    ],
    discount: 0,
    placedAt: "2026-05-12",
    fulfilledAt: "2026-05-12",
    notes: "Regular customer — happy to collect from front counter.",
    createdAt: "2026-05-12T02:15:00.000Z",
    updatedAt: "2026-05-12T02:40:00.000Z",
  },
  {
    id: "ord_1002",
    reference: "ORD-1043",
    customerName: "Daniel Okafor",
    customerEmail: "daniel.okafor@example.com",
    channel: "click_collect",
    status: "paid",
    lineItems: [
      {
        id: "oli_3",
        productId: "prd_001",
        name: "Amoxicillin 500mg Capsules",
        sku: "RX-AMX-500",
        quantity: 1,
        unitPrice: 18.5,
        gstApplicable: false,
        requiresPrescription: true,
      },
    ],
    discount: 0,
    placedAt: "2026-05-14",
    notes: "Awaiting prescription verification before hand-over.",
    createdAt: "2026-05-14T05:02:00.000Z",
    updatedAt: "2026-05-14T05:20:00.000Z",
  },
  {
    id: "ord_1003",
    reference: "ORD-1044",
    customerName: "Priya Nair",
    customerPhone: "0421 337 118",
    channel: "phone",
    status: "pending",
    lineItems: [
      {
        id: "oli_4",
        productId: "prd_004",
        name: "Vitamin D3 1000 IU Softgels",
        sku: "SUP-VTD-1000",
        quantity: 2,
        unitPrice: 19.95,
        gstApplicable: true,
        requiresPrescription: false,
      },
      {
        id: "oli_5",
        productId: "prd_006",
        name: "Salbutamol 100mcg Inhaler",
        sku: "OTC-SAL-100",
        quantity: 1,
        unitPrice: 14.95,
        gstApplicable: false,
        requiresPrescription: false,
      },
    ],
    discount: 5,
    placedAt: "2026-05-15",
    notes: "Loyalty discount applied.",
    createdAt: "2026-05-15T22:11:00.000Z",
    updatedAt: "2026-05-15T22:11:00.000Z",
  },
  {
    id: "ord_1004",
    reference: "ORD-1045",
    customerName: "Walk-in customer",
    channel: "in_store",
    status: "draft",
    lineItems: [
      {
        id: "oli_6",
        productId: "prd_005",
        name: "Digital Blood-pressure Monitor",
        sku: "DEV-BPM-01",
        quantity: 1,
        unitPrice: 129.0,
        gstApplicable: true,
        requiresPrescription: false,
      },
    ],
    discount: 0,
    placedAt: "2026-05-16",
    createdAt: "2026-05-16T00:30:00.000Z",
    updatedAt: "2026-05-16T00:30:00.000Z",
  },
  {
    id: "ord_1005",
    reference: "ORD-1041",
    customerName: "Grace Sullivan",
    customerEmail: "grace.sullivan@example.com",
    channel: "online",
    status: "cancelled",
    lineItems: [
      {
        id: "oli_7",
        productId: "prd_009",
        name: "Pill Organiser — Weekly",
        sku: "ACC-PORG-7",
        quantity: 1,
        unitPrice: 9.5,
        gstApplicable: true,
        requiresPrescription: false,
      },
    ],
    discount: 0,
    placedAt: "2026-05-09",
    notes: "Cancelled — item out of stock at time of order.",
    createdAt: "2026-05-09T08:45:00.000Z",
    updatedAt: "2026-05-10T01:00:00.000Z",
  },
];

// -----------------------------------------------------------------------------
// Store
// -----------------------------------------------------------------------------

let orders: Order[] = [...INITIAL_ORDERS];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export type OrderInput = Omit<
  Order,
  "id" | "reference" | "createdAt" | "updatedAt"
>;

/** Highest numeric suffix seen across existing ORD-#### references. */
function nextReference(): string {
  const max = orders.reduce((acc, o) => {
    const match = /ORD-(\d+)/.exec(o.reference);
    if (!match) return acc;
    return Math.max(acc, Number(match[1]));
  }, 1040);
  return `ORD-${max + 1}`;
}

export const orderStore = {
  getSnapshot(): Order[] {
    return orders;
  },
  getServerSnapshot(): Order[] {
    return INITIAL_ORDERS;
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  add(input: OrderInput): Order {
    const now = new Date().toISOString();
    const created: Order = {
      ...input,
      id: `ord_${Math.random().toString(36).slice(2, 10)}`,
      reference: nextReference(),
      createdAt: now,
      updatedAt: now,
    };
    orders = [created, ...orders];
    emit();
    return created;
  },
  update(id: string, patch: Partial<OrderInput>): Order | undefined {
    let updated: Order | undefined;
    orders = orders.map((order) => {
      if (order.id !== id) return order;
      updated = {
        ...order,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      return updated;
    });
    if (updated) emit();
    return updated;
  },
  setStatus(id: string, status: OrderStatus): Order | undefined {
    const patch: Partial<OrderInput> = { status };
    if (status === "fulfilled") {
      const y = new Date();
      patch.fulfilledAt = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
    }
    return orderStore.update(id, patch);
  },
};
