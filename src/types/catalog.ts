/**
 * Catalog DTOs — hand-written to mirror the backend gateway commerce API
 * (`/api/products`, `/api/inventory`, `/api/orders`, `/api/invoices`).
 *
 * Responses use the shared `{ success, data }` envelope. The proxy camelCases
 * keys, and the gateway already returns camelCase, so these match the wire
 * shape. Money is always integer cents (`*Cents`).
 */

export type ProductCategory =
  | "prescription"
  | "otc"
  | "supplement"
  | "device"
  | "consumable"
  | "compounded"
  | "accessory";
export type ProductForm =
  | "tablet"
  | "capsule"
  | "liquid"
  | "cream"
  | "ointment"
  | "injection"
  | "inhaler"
  | "drops"
  | "patch"
  | "spray"
  | "device"
  | "other";
export type ProductSchedule = "unscheduled" | "S2" | "S3" | "S4" | "S8";
export type ProductStorage = "room" | "refrigerated" | "frozen" | "controlled";
export type ProductStatus = "active" | "inactive" | "discontinued" | "recalled";

export interface Product {
  id: string;
  entityId: string;
  name: string;
  brand: string | null;
  genericName: string | null;
  description: string | null;
  sku: string;
  barcode: string | null;
  category: ProductCategory;
  form: ProductForm;
  strength: string | null;
  packSize: string | null;
  activeIngredient: string | null;
  schedule: ProductSchedule;
  requiresPrescription: boolean;
  artgNumber: string | null;
  pbsCode: string | null;
  storage: ProductStorage;
  priceCents: number;
  costPriceCents: number | null;
  gstApplicable: boolean;
  earliestExpiry: string | null;
  defaultSupplierId: string | null;
  supplierName: string | null;
  status: ProductStatus;
  stock: number;
  allocated: number;
  available: number;
  reorderLevel: number;
  reorderQuantity: number | null;
  bin: string | null;
  lastCountedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductsListResponse {
  success: true;
  data: { products: Product[]; total: number; limit: number; offset: number };
}
export interface ProductsSummary {
  total: number;
  active: number;
  lowStock: number;
  expiringSoon: number;
  controlled: number;
}

// --- Inventory ---

export type InventoryStatusKey =
  | "in_stock"
  | "low_stock"
  | "expiring_soon"
  | "out_of_stock"
  | "expired";
export interface InventoryStatus {
  key: InventoryStatusKey;
  variant: "success" | "warning" | "danger";
  label: string;
}

export interface InventoryItem {
  productId: string;
  entityId: string;
  name: string;
  sku: string;
  brand: string | null;
  category: ProductCategory;
  form: ProductForm;
  schedule: ProductSchedule;
  requiresPrescription: boolean;
  storage: ProductStorage;
  isColdChain: boolean;
  supplierId: string | null;
  supplierName: string | null;
  bin: string | null;
  onHand: number;
  allocated: number;
  available: number;
  reorderLevel: number;
  reorderQuantity: number | null;
  costPriceCents: number | null;
  priceCents: number;
  stockValueCents: number;
  earliestExpiry: string | null;
  lastCountedAt: string | null;
  status: InventoryStatus;
  suggestedReorderQty: number;
}

export interface InventoryListResponse {
  success: true;
  data: { items: InventoryItem[]; total: number; limit: number; offset: number };
}
export interface InventorySummary {
  totalSkus: number;
  stockValueCents: number;
  lowStock: number;
  outOfStock: number;
  expiringSoon: number;
  toReorder: number;
}

export type StockMovementType =
  | "received"
  | "dispensed"
  | "sale"
  | "adjustment"
  | "stocktake"
  | "return_customer"
  | "return_supplier"
  | "damaged"
  | "expired"
  | "transfer_in"
  | "transfer_out";

export interface StockMovement {
  id: string;
  productId: string;
  locationId: string;
  batchId: string | null;
  type: StockMovementType;
  quantity: number;
  balanceAfter: number | null;
  reason: string | null;
  referenceType: string | null;
  referenceId: string | null;
  movedAt: string;
  createdBy: string | null;
}

// --- Orders ---

export type OrderStatus = "received" | "picking" | "fulfilled" | "shipped" | "cancelled";
export type PaymentStatus = "unpaid" | "paid" | "partially_refunded" | "refunded";
export type OrderChannel = "in_store" | "online" | "phone";

export interface OrderSummary {
  id: string;
  displayId: string;
  customerName: string;
  suburb: string | null;
  channel: OrderChannel;
  placedAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalCents: number;
  itemCount: number;
  firstProduct: string | null;
  hasRx: boolean;
  hasControlled: boolean;
}

export interface OrderLine {
  id: string;
  productId: string;
  name: string;
  sku: string | null;
  qty: number;
  unitPriceCents: number;
  lineTotalCents: number;
  gstApplicable: boolean;
  requiresPrescription: boolean;
  schedule: string | null;
  prescriptionId: string | null;
}

export interface OrderEvent {
  id: string;
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  createdAt: string;
}

export interface OrderPayment {
  id: string;
  kind: "payment" | "refund";
  amountCents: number;
  method: string;
  reference: string | null;
  paidAt: string;
  note: string | null;
}

export interface OrderDetail {
  id: string;
  entityId: string;
  displayId: string;
  patientId: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  suburb: string | null;
  channel: OrderChannel;
  source: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  nextStatus: OrderStatus | null;
  placedAt: string;
  currency: string;
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  gstCents: number;
  totalCents: number;
  amountPaidCents: number;
  fulfilledAt: string | null;
  shippedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  trackingCarrier: string | null;
  trackingNumber: string | null;
  note: string | null;
  hasRx: boolean;
  hasControlled: boolean;
  lines: OrderLine[];
  events: OrderEvent[];
  payments: OrderPayment[];
  createdAt: string;
  updatedAt: string;
}

export interface OrdersListResponse {
  success: true;
  data: { orders: OrderSummary[]; total: number; limit: number; offset: number };
}
export interface OrdersSummary {
  total: number;
  awaitingFulfilment: number;
  readyToShip: number;
  shipped: number;
  revenuePaidCents: number;
  cancelled: number;
}

/** Payload for POST /api/orders. The gateway snapshots price/GST/Rx per line. */
export interface CreateOrderLineInput {
  productId: string;
  qty: number;
}
export interface CreateOrderPayload {
  customerName: string;
  channel: OrderChannel;
  customerEmail?: string;
  customerPhone?: string;
  note?: string;
  lines: CreateOrderLineInput[];
}

// --- Stocktakes ---

export type StocktakeStatus = "in_progress" | "completed" | "cancelled";

export interface StocktakeLine {
  id: string;
  productId: string;
  name: string;
  sku: string | null;
  expectedQty: number;
  countedQty: number | null;
  variance: number | null;
  note: string | null;
}

export interface StocktakeSummary {
  id: string;
  displayId: string;
  status: StocktakeStatus;
  locationId: string;
  startedAt: string;
  completedAt: string | null;
  lineCount: number;
  countedCount: number;
  note: string | null;
  createdAt: string;
}

export interface StocktakeDetail {
  id: string;
  entityId: string;
  displayId: string;
  locationId: string;
  status: StocktakeStatus;
  startedAt: string;
  completedAt: string | null;
  note: string | null;
  lines: StocktakeLine[];
  createdAt: string;
  updatedAt: string;
}

export interface StocktakesListResponse {
  success: true;
  data: { stocktakes: StocktakeSummary[]; total: number };
}

/** Payload for POST /api/stocktakes — opens an in-progress count session. */
export interface CreateStocktakePayload {
  note?: string;
  productIds?: string[];
}

/** Payload for POST /api/stocktakes/{id}/complete — records counts + reconciles. */
export interface CompleteStocktakePayload {
  counts: { productId: string; countedQty: number }[];
  note?: string;
}
