/**
 * Temporary client-side mock store for the products feature.
 *
 * There is no backend yet — this module keeps a per-tab in-memory list of
 * products and exposes a tiny pub/sub so the table, sheets and detail view
 * stay in sync. Swap this file for TanStack Query hooks (`use-products`)
 * backed by the gateway once `/v1/products` ships. The shape here intentionally
 * mirrors what a clinic/pharmacy catalog needs (identification, pharmaceutical,
 * regulatory, inventory, pricing) so it can map cleanly to the future API.
 */

// -----------------------------------------------------------------------------
// Domain types
// -----------------------------------------------------------------------------

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

/**
 * Australian Poisons Standard scheduling.
 * - unscheduled: general sale
 * - S2: pharmacy medicine
 * - S3: pharmacist-only medicine
 * - S4: prescription only
 * - S8: controlled drug (Schedule 8)
 */
export type ProductSchedule = "unscheduled" | "S2" | "S3" | "S4" | "S8";

export type ProductStorage =
  | "room"
  | "refrigerated"
  | "frozen"
  | "controlled";

export type ProductStatus =
  | "active"
  | "inactive"
  | "discontinued"
  | "recalled";

export interface Product {
  id: string;
  // Identification
  name: string;
  brand?: string;
  genericName?: string;
  sku: string;
  barcode?: string;
  // Pharmaceutical
  category: ProductCategory;
  form: ProductForm;
  strength?: string; // e.g. "500 mg", "25 mg/mL"
  packSize?: string; // e.g. "21 capsules", "100 mL"
  activeIngredient?: string;
  // Regulatory
  schedule: ProductSchedule;
  requiresPrescription: boolean;
  artgNumber?: string; // AUST R / AUST L
  pbsCode?: string;
  // Inventory
  stock: number;
  reorderLevel: number;
  supplier?: string;
  storage: ProductStorage;
  earliestExpiry?: string; // ISO date (YYYY-MM-DD)
  // Pricing (AUD)
  costPrice?: number;
  price: number;
  gstApplicable: boolean;
  // Misc
  status: ProductStatus;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// Enumerations & labels
// -----------------------------------------------------------------------------

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  "prescription",
  "otc",
  "supplement",
  "device",
  "consumable",
  "compounded",
  "accessory",
];

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  prescription: "Prescription",
  otc: "Over the counter",
  supplement: "Supplement",
  device: "Medical device",
  consumable: "Consumable",
  compounded: "Compounded",
  accessory: "Accessory",
};

export const PRODUCT_FORMS: ProductForm[] = [
  "tablet",
  "capsule",
  "liquid",
  "cream",
  "ointment",
  "injection",
  "inhaler",
  "drops",
  "patch",
  "spray",
  "device",
  "other",
];

export const PRODUCT_FORM_LABELS: Record<ProductForm, string> = {
  tablet: "Tablet",
  capsule: "Capsule",
  liquid: "Liquid / syrup",
  cream: "Cream",
  ointment: "Ointment",
  injection: "Injection",
  inhaler: "Inhaler",
  drops: "Drops",
  patch: "Patch",
  spray: "Spray",
  device: "Device",
  other: "Other",
};

export const PRODUCT_SCHEDULES: ProductSchedule[] = [
  "unscheduled",
  "S2",
  "S3",
  "S4",
  "S8",
];

export const PRODUCT_SCHEDULE_LABELS: Record<ProductSchedule, string> = {
  unscheduled: "Unscheduled",
  S2: "S2 — Pharmacy medicine",
  S3: "S3 — Pharmacist only",
  S4: "S4 — Prescription only",
  S8: "S8 — Controlled drug",
};

export const PRODUCT_SCHEDULE_SHORT: Record<ProductSchedule, string> = {
  unscheduled: "—",
  S2: "S2",
  S3: "S3",
  S4: "S4",
  S8: "S8",
};

export const PRODUCT_STORAGES: ProductStorage[] = [
  "room",
  "refrigerated",
  "frozen",
  "controlled",
];

export const PRODUCT_STORAGE_LABELS: Record<ProductStorage, string> = {
  room: "Room temperature",
  refrigerated: "Refrigerated (2–8 °C)",
  frozen: "Frozen",
  controlled: "Controlled-drug safe",
};

export const PRODUCT_STATUSES: ProductStatus[] = [
  "active",
  "inactive",
  "discontinued",
  "recalled",
];

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  discontinued: "Discontinued",
  recalled: "Recalled",
};

/** Number of days before expiry that triggers the "expiring soon" warning. */
export const EXPIRY_WARNING_DAYS = 90;

/** Schedules that require a prescription by default. */
export function scheduleRequiresPrescription(schedule: ProductSchedule): boolean {
  return schedule === "S4" || schedule === "S8";
}

export function isLowStock(product: Pick<Product, "stock" | "reorderLevel">): boolean {
  return product.stock <= product.reorderLevel;
}

export function isExpiringSoon(
  product: Pick<Product, "earliestExpiry">,
  now: Date = new Date()
): boolean {
  if (!product.earliestExpiry) return false;
  const expiry = new Date(product.earliestExpiry);
  if (Number.isNaN(expiry.getTime())) return false;
  const diffDays = (expiry.getTime() - now.getTime()) / 86_400_000;
  return diffDays <= EXPIRY_WARNING_DAYS;
}

export function isExpired(
  product: Pick<Product, "earliestExpiry">,
  now: Date = new Date()
): boolean {
  if (!product.earliestExpiry) return false;
  const expiry = new Date(product.earliestExpiry);
  if (Number.isNaN(expiry.getTime())) return false;
  return expiry.getTime() < now.getTime();
}

// -----------------------------------------------------------------------------
// Seed data
// -----------------------------------------------------------------------------

const INITIAL_PRODUCTS: Product[] = [
  {
    id: "prd_001",
    name: "Amoxicillin 500mg Capsules",
    brand: "Amoxil",
    genericName: "Amoxicillin",
    sku: "RX-AMX-500",
    barcode: "9312345000017",
    category: "prescription",
    form: "capsule",
    strength: "500 mg",
    packSize: "21 capsules",
    activeIngredient: "Amoxicillin trihydrate",
    schedule: "S4",
    requiresPrescription: true,
    artgNumber: "AUST R 12345",
    pbsCode: "1956Y",
    stock: 142,
    reorderLevel: 40,
    supplier: "Symbion",
    storage: "room",
    earliestExpiry: "2027-04-30",
    costPrice: 11.2,
    price: 18.5,
    gstApplicable: false,
    status: "active",
    description: "Broad-spectrum penicillin antibiotic, 21-capsule blister pack.",
    createdAt: "2025-11-02T10:00:00.000Z",
    updatedAt: "2026-05-12T03:11:00.000Z",
  },
  {
    id: "prd_002",
    name: "Atorvastatin 20mg Tablets",
    brand: "Lipitor",
    genericName: "Atorvastatin",
    sku: "RX-ATV-20",
    barcode: "9312345000024",
    category: "prescription",
    form: "tablet",
    strength: "20 mg",
    packSize: "30 tablets",
    activeIngredient: "Atorvastatin calcium",
    schedule: "S4",
    requiresPrescription: true,
    artgNumber: "AUST R 23456",
    pbsCode: "8213K",
    stock: 86,
    reorderLevel: 30,
    supplier: "Sigma Healthcare",
    storage: "room",
    earliestExpiry: "2026-08-15",
    costPrice: 14.5,
    price: 24.0,
    gstApplicable: false,
    status: "active",
    description: "HMG-CoA reductase inhibitor for cholesterol management.",
    createdAt: "2025-09-18T09:00:00.000Z",
    updatedAt: "2026-05-10T22:48:00.000Z",
  },
  {
    id: "prd_003",
    name: "Paracetamol 500mg Tablets",
    brand: "Panadol",
    genericName: "Paracetamol",
    sku: "OTC-PCM-500",
    barcode: "9312345000031",
    category: "otc",
    form: "tablet",
    strength: "500 mg",
    packSize: "100 tablets",
    activeIngredient: "Paracetamol",
    schedule: "unscheduled",
    requiresPrescription: false,
    artgNumber: "AUST R 34567",
    stock: 412,
    reorderLevel: 80,
    supplier: "API",
    storage: "room",
    earliestExpiry: "2028-02-28",
    costPrice: 3.4,
    price: 6.95,
    gstApplicable: false,
    status: "active",
    description: "Pain & fever relief tablets, 100-pack.",
    createdAt: "2024-03-15T11:00:00.000Z",
    updatedAt: "2026-05-14T01:02:00.000Z",
  },
  {
    id: "prd_004",
    name: "Vitamin D3 1000 IU Softgels",
    brand: "Blackmores",
    sku: "SUP-VTD-1000",
    barcode: "9312345000048",
    category: "supplement",
    form: "capsule",
    strength: "1000 IU",
    packSize: "90 softgels",
    activeIngredient: "Cholecalciferol",
    schedule: "unscheduled",
    requiresPrescription: false,
    artgNumber: "AUST L 45678",
    stock: 58,
    reorderLevel: 20,
    supplier: "Symbion",
    storage: "room",
    earliestExpiry: "2027-11-30",
    costPrice: 12.0,
    price: 19.95,
    gstApplicable: true,
    status: "active",
    description: "Daily vitamin D supplement, 90 softgels.",
    createdAt: "2025-01-08T08:00:00.000Z",
    updatedAt: "2026-04-29T05:33:00.000Z",
  },
  {
    id: "prd_005",
    name: "Digital Blood-pressure Monitor",
    brand: "Omron HEM-7156T",
    sku: "DEV-BPM-01",
    barcode: "9312345000055",
    category: "device",
    form: "device",
    packSize: "1 unit",
    schedule: "unscheduled",
    requiresPrescription: false,
    artgNumber: "ARTG 56789",
    stock: 12,
    reorderLevel: 5,
    supplier: "Omron Healthcare AU",
    storage: "room",
    costPrice: 62.0,
    price: 129.0,
    gstApplicable: true,
    status: "active",
    description: "Upper-arm cuff blood pressure monitor with Bluetooth sync.",
    createdAt: "2024-10-22T14:00:00.000Z",
    updatedAt: "2026-04-15T20:21:00.000Z",
  },
  {
    id: "prd_006",
    name: "Salbutamol 100mcg Inhaler",
    brand: "Ventolin",
    genericName: "Salbutamol",
    sku: "OTC-SAL-100",
    barcode: "9312345000062",
    category: "otc",
    form: "inhaler",
    strength: "100 mcg/dose",
    packSize: "200 doses",
    activeIngredient: "Salbutamol sulfate",
    schedule: "S3",
    requiresPrescription: false,
    artgNumber: "AUST R 67890",
    stock: 24,
    reorderLevel: 30,
    supplier: "Sigma Healthcare",
    storage: "room",
    earliestExpiry: "2026-07-31",
    costPrice: 8.2,
    price: 14.95,
    gstApplicable: false,
    status: "active",
    description: "Short-acting beta-2 agonist reliever inhaler — pharmacist only.",
    createdAt: "2025-02-20T10:00:00.000Z",
    updatedAt: "2026-05-13T09:00:00.000Z",
  },
  {
    id: "prd_007",
    name: "Oxycodone 5mg Tablets",
    brand: "Endone",
    genericName: "Oxycodone",
    sku: "RX-OXY-05",
    barcode: "9312345000079",
    category: "prescription",
    form: "tablet",
    strength: "5 mg",
    packSize: "20 tablets",
    activeIngredient: "Oxycodone hydrochloride",
    schedule: "S8",
    requiresPrescription: true,
    artgNumber: "AUST R 78901",
    pbsCode: "1215Y",
    stock: 18,
    reorderLevel: 10,
    supplier: "Mundipharma",
    storage: "controlled",
    earliestExpiry: "2026-11-30",
    costPrice: 9.0,
    price: 16.5,
    gstApplicable: false,
    status: "active",
    description:
      "Short-acting opioid analgesic. Controlled drug — log every dispensing in the S8 register.",
    createdAt: "2025-05-10T12:00:00.000Z",
    updatedAt: "2026-05-09T16:40:00.000Z",
  },
  {
    id: "prd_008",
    name: "Influenza Vaccine 2026",
    brand: "Fluquadri",
    sku: "RX-FLU-26",
    barcode: "9312345000086",
    category: "prescription",
    form: "injection",
    strength: "0.5 mL pre-filled syringe",
    packSize: "1 syringe",
    activeIngredient: "Quadrivalent influenza vaccine",
    schedule: "S4",
    requiresPrescription: true,
    artgNumber: "AUST R 89012",
    stock: 6,
    reorderLevel: 25,
    supplier: "Sanofi",
    storage: "refrigerated",
    earliestExpiry: "2026-09-30",
    costPrice: 18.5,
    price: 28.0,
    gstApplicable: false,
    status: "active",
    description:
      "Seasonal influenza vaccine. Maintain cold chain (2–8 °C) at all times.",
    createdAt: "2026-02-01T08:00:00.000Z",
    updatedAt: "2026-05-15T11:20:00.000Z",
  },
  {
    id: "prd_009",
    name: "Pill Organiser — Weekly",
    sku: "ACC-PORG-7",
    barcode: "9312345000093",
    category: "accessory",
    form: "other",
    packSize: "1 unit",
    schedule: "unscheduled",
    requiresPrescription: false,
    stock: 0,
    reorderLevel: 10,
    supplier: "API",
    storage: "room",
    costPrice: 3.5,
    price: 9.5,
    gstApplicable: true,
    status: "inactive",
    description: "Seven-day AM/PM compartments.",
    createdAt: "2024-06-01T10:00:00.000Z",
    updatedAt: "2026-03-02T11:00:00.000Z",
  },
  {
    id: "prd_010",
    name: "Hydrocortisone 1% Cream",
    brand: "Sigmacort",
    genericName: "Hydrocortisone",
    sku: "OTC-HYD-1",
    barcode: "9312345000109",
    category: "otc",
    form: "cream",
    strength: "1%",
    packSize: "30 g tube",
    activeIngredient: "Hydrocortisone acetate",
    schedule: "S2",
    requiresPrescription: false,
    artgNumber: "AUST R 90123",
    stock: 64,
    reorderLevel: 20,
    supplier: "Symbion",
    storage: "room",
    earliestExpiry: "2027-06-30",
    costPrice: 4.8,
    price: 9.95,
    gstApplicable: false,
    status: "active",
    description: "Mild topical corticosteroid for minor skin inflammation.",
    createdAt: "2024-12-12T09:00:00.000Z",
    updatedAt: "2026-05-08T13:15:00.000Z",
  },
];

// -----------------------------------------------------------------------------
// Store
// -----------------------------------------------------------------------------

let products: Product[] = [...INITIAL_PRODUCTS];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export type ProductInput = Omit<Product, "id" | "createdAt" | "updatedAt">;

export const productStore = {
  getSnapshot(): Product[] {
    return products;
  },
  getServerSnapshot(): Product[] {
    return INITIAL_PRODUCTS;
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  add(input: ProductInput): Product {
    const now = new Date().toISOString();
    const created: Product = {
      ...input,
      id: `prd_${Math.random().toString(36).slice(2, 10)}`,
      createdAt: now,
      updatedAt: now,
    };
    products = [created, ...products];
    emit();
    return created;
  },
  update(id: string, patch: Partial<ProductInput>): Product | undefined {
    let updated: Product | undefined;
    products = products.map((product) => {
      if (product.id !== id) return product;
      updated = {
        ...product,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      return updated;
    });
    if (updated) emit();
    return updated;
  },
  setStatus(id: string, status: ProductStatus): Product | undefined {
    return productStore.update(id, { status });
  },
  adjustStock(id: string, delta: number): Product | undefined {
    const current = products.find((p) => p.id === id);
    if (!current) return undefined;
    return productStore.update(id, {
      stock: Math.max(0, current.stock + delta),
    });
  },
};
