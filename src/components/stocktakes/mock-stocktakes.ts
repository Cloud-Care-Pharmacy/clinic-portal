/**
 * Temporary client-side mock store for the stocktake feature.
 *
 * There is no backend yet — this module keeps a per-tab in-memory list of
 * stock counts and exposes a tiny pub/sub so the table, form and detail view
 * stay in sync. Swap this file for TanStack Query hooks (`use-stocktakes`)
 * backed by the gateway once `/v1/stocktakes` ships.
 *
 * A stocktake is a physical inventory count. Each line snapshots the product's
 * expected (system) quantity at the moment the count sheet was generated, and
 * records the counted quantity. Completing a stocktake reconciles the catalog
 * by writing the counted quantities back to the products store.
 */

import {
  isLowStock,
  productStore,
  type Product,
  type ProductCategory,
  type ProductSchedule,
} from "@/components/products/mock-products";

// -----------------------------------------------------------------------------
// Domain types
// -----------------------------------------------------------------------------

export type StocktakeStatus = "in_progress" | "completed" | "cancelled";

/** How the count sheet was scoped when the stocktake was created. */
export type StocktakeScopeType =
  | "all_active"
  | "low_stock"
  | "controlled"
  | "category"
  | "schedule";

export interface StocktakeLine {
  id: string;
  productId: string;
  // Snapshot of the product at count-sheet generation.
  name: string;
  sku: string;
  expectedQty: number;
  /** Counted quantity, or null until the line has been counted. */
  countedQty: number | null;
}

export interface Stocktake {
  id: string;
  reference: string; // human-facing, e.g. "ST-0007"
  name: string;
  scopeLabel: string; // description of what was counted
  status: StocktakeStatus;
  countedBy: string;
  lines: StocktakeLine[];
  notes?: string;
  startedAt: string; // ISO date (YYYY-MM-DD)
  completedAt?: string; // ISO date (YYYY-MM-DD)
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// Enumerations & labels
// -----------------------------------------------------------------------------

export const STOCKTAKE_STATUSES: StocktakeStatus[] = [
  "in_progress",
  "completed",
  "cancelled",
];

export const STOCKTAKE_STATUS_LABELS: Record<StocktakeStatus, string> = {
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const STOCKTAKE_SCOPE_TYPES: StocktakeScopeType[] = [
  "all_active",
  "low_stock",
  "controlled",
  "category",
  "schedule",
];

export const STOCKTAKE_SCOPE_TYPE_LABELS: Record<StocktakeScopeType, string> = {
  all_active: "All active products",
  low_stock: "Low-stock products only",
  controlled: "Controlled drugs (S8)",
  category: "By category",
  schedule: "By schedule",
};

// -----------------------------------------------------------------------------
// Derived values
// -----------------------------------------------------------------------------

/** Variance for a single line (counted − expected), or null if uncounted. */
export function lineVariance(line: StocktakeLine): number | null {
  return line.countedQty == null ? null : line.countedQty - line.expectedQty;
}

export interface StocktakeSummary {
  totalLines: number;
  countedLines: number;
  /** Counted lines whose variance is non-zero. */
  discrepancyLines: number;
  /** Sum of variances across counted lines. */
  netVariance: number;
  /** Sum of absolute variances across counted lines. */
  absVariance: number;
  /** True when every line has a counted quantity. */
  fullyCounted: boolean;
}

export function stocktakeSummary(
  stocktake: Pick<Stocktake, "lines">
): StocktakeSummary {
  let countedLines = 0;
  let discrepancyLines = 0;
  let netVariance = 0;
  let absVariance = 0;
  for (const line of stocktake.lines) {
    const variance = lineVariance(line);
    if (variance == null) continue;
    countedLines += 1;
    netVariance += variance;
    absVariance += Math.abs(variance);
    if (variance !== 0) discrepancyLines += 1;
  }
  return {
    totalLines: stocktake.lines.length,
    countedLines,
    discrepancyLines,
    netVariance,
    absVariance,
    fullyCounted:
      stocktake.lines.length > 0 && countedLines === stocktake.lines.length,
  };
}

// -----------------------------------------------------------------------------
// Scope resolution — build a count sheet from the products catalog
// -----------------------------------------------------------------------------

export interface ScopeSelection {
  type: StocktakeScopeType;
  category?: ProductCategory;
  schedule?: ProductSchedule;
}

/** Products (active only) that fall within the given scope. */
export function productsInScope(
  selection: ScopeSelection,
  products: Product[]
): Product[] {
  const active = products.filter((p) => p.status === "active");
  switch (selection.type) {
    case "all_active":
      return active;
    case "low_stock":
      return active.filter((p) => isLowStock(p));
    case "controlled":
      return active.filter((p) => p.schedule === "S8");
    case "category":
      return selection.category
        ? active.filter((p) => p.category === selection.category)
        : [];
    case "schedule":
      return selection.schedule
        ? active.filter((p) => p.schedule === selection.schedule)
        : [];
  }
}

export function scopeLabel(selection: ScopeSelection): string {
  switch (selection.type) {
    case "category":
      return `Category: ${selection.category ?? "—"}`;
    case "schedule":
      return `Schedule: ${selection.schedule ?? "—"}`;
    default:
      return STOCKTAKE_SCOPE_TYPE_LABELS[selection.type];
  }
}

// -----------------------------------------------------------------------------
// Seed data
// -----------------------------------------------------------------------------

const INITIAL_STOCKTAKES: Stocktake[] = [
  {
    id: "stk_2001",
    reference: "ST-0006",
    name: "S8 controlled-drug count — May",
    scopeLabel: "Controlled drugs (S8)",
    status: "completed",
    countedBy: "Priya Nair",
    lines: [
      {
        id: "stl_1",
        productId: "prd_007",
        name: "Oxycodone 5mg Tablets",
        sku: "RX-OXY-05",
        expectedQty: 18,
        countedQty: 18,
      },
    ],
    notes: "Weekly S8 register reconciliation. No discrepancy.",
    startedAt: "2026-05-09",
    completedAt: "2026-05-09",
    createdAt: "2026-05-09T23:00:00.000Z",
    updatedAt: "2026-05-09T23:30:00.000Z",
  },
  {
    id: "stk_2002",
    reference: "ST-0007",
    name: "Fridge line count",
    scopeLabel: "By schedule: S4",
    status: "completed",
    countedBy: "Daniel Okafor",
    lines: [
      {
        id: "stl_2",
        productId: "prd_008",
        name: "Influenza Vaccine 2026",
        sku: "RX-FLU-26",
        expectedQty: 8,
        countedQty: 6,
      },
      {
        id: "stl_3",
        productId: "prd_001",
        name: "Amoxicillin 500mg Capsules",
        sku: "RX-AMX-500",
        expectedQty: 145,
        countedQty: 142,
      },
    ],
    notes: "Two vaccines short — suspected wastage during cold-chain check.",
    startedAt: "2026-05-13",
    completedAt: "2026-05-13",
    createdAt: "2026-05-13T04:00:00.000Z",
    updatedAt: "2026-05-13T05:10:00.000Z",
  },
  {
    id: "stk_2003",
    reference: "ST-0008",
    name: "Low-stock spot check",
    scopeLabel: "Low-stock products only",
    status: "in_progress",
    countedBy: "Grace Sullivan",
    lines: [
      {
        id: "stl_4",
        productId: "prd_006",
        name: "Salbutamol 100mcg Inhaler",
        sku: "OTC-SAL-100",
        expectedQty: 24,
        countedQty: 24,
      },
      {
        id: "stl_5",
        productId: "prd_008",
        name: "Influenza Vaccine 2026",
        sku: "RX-FLU-26",
        expectedQty: 6,
        countedQty: null,
      },
      {
        id: "stl_6",
        productId: "prd_009",
        name: "Pill Organiser — Weekly",
        sku: "ACC-PORG-7",
        expectedQty: 0,
        countedQty: null,
      },
    ],
    startedAt: "2026-05-16",
    createdAt: "2026-05-16T01:00:00.000Z",
    updatedAt: "2026-05-16T01:20:00.000Z",
  },
];

// -----------------------------------------------------------------------------
// Store
// -----------------------------------------------------------------------------

let stocktakes: Stocktake[] = [...INITIAL_STOCKTAKES];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export type StocktakeInput = Omit<
  Stocktake,
  "id" | "reference" | "createdAt" | "updatedAt"
>;

function nextReference(): string {
  const max = stocktakes.reduce((acc, s) => {
    const match = /ST-(\d+)/.exec(s.reference);
    if (!match) return acc;
    return Math.max(acc, Number(match[1]));
  }, 5);
  return `ST-${String(max + 1).padStart(4, "0")}`;
}

export const stocktakeStore = {
  getSnapshot(): Stocktake[] {
    return stocktakes;
  },
  getServerSnapshot(): Stocktake[] {
    return INITIAL_STOCKTAKES;
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  add(input: StocktakeInput): Stocktake {
    const now = new Date().toISOString();
    const created: Stocktake = {
      ...input,
      id: `stk_${Math.random().toString(36).slice(2, 10)}`,
      reference: nextReference(),
      createdAt: now,
      updatedAt: now,
    };
    stocktakes = [created, ...stocktakes];
    emit();
    return created;
  },
  update(id: string, patch: Partial<StocktakeInput>): Stocktake | undefined {
    let updated: Stocktake | undefined;
    stocktakes = stocktakes.map((stocktake) => {
      if (stocktake.id !== id) return stocktake;
      updated = {
        ...stocktake,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      return updated;
    });
    if (updated) emit();
    return updated;
  },
  setCount(
    id: string,
    lineId: string,
    countedQty: number | null
  ): Stocktake | undefined {
    const current = stocktakes.find((s) => s.id === id);
    if (!current) return undefined;
    return stocktakeStore.update(id, {
      lines: current.lines.map((l) =>
        l.id === lineId ? { ...l, countedQty } : l
      ),
    });
  },
  /**
   * Complete a stocktake: mark it completed and write counted quantities back
   * to the products catalog. Returns the number of product stock levels
   * adjusted. Uncounted lines are left untouched.
   */
  complete(id: string): number {
    const current = stocktakes.find((s) => s.id === id);
    if (!current || current.status === "completed") return 0;
    let adjustments = 0;
    for (const line of current.lines) {
      if (line.countedQty == null) continue;
      const product = productStore
        .getSnapshot()
        .find((p) => p.id === line.productId);
      if (product && product.stock !== line.countedQty) {
        productStore.update(line.productId, { stock: line.countedQty });
        adjustments += 1;
      }
    }
    const today = new Date();
    stocktakeStore.update(id, {
      status: "completed",
      completedAt: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
    });
    return adjustments;
  },
  setStatus(id: string, status: StocktakeStatus): Stocktake | undefined {
    return stocktakeStore.update(id, { status });
  },
};
