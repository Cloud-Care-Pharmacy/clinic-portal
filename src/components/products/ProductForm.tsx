"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch, type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/shared/DatePicker";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_FORMS,
  PRODUCT_FORM_LABELS,
  PRODUCT_SCHEDULES,
  PRODUCT_SCHEDULE_LABELS,
  PRODUCT_STATUSES,
  PRODUCT_STATUS_LABELS,
  PRODUCT_STORAGES,
  PRODUCT_STORAGE_LABELS,
  scheduleRequiresPrescription,
  type Product,
  type ProductCategory,
  type ProductForm,
  type ProductInput,
  type ProductSchedule,
  type ProductStatus,
  type ProductStorage,
} from "./mock-products";

// -----------------------------------------------------------------------------
// Schema (manual safeParse — repo convention; do not use @hookform/resolvers)
// -----------------------------------------------------------------------------

export const productFormSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  brand: z.string().optional(),
  genericName: z.string().optional(),
  sku: z.string().min(1, "SKU is required"),
  barcode: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  form: z.string().min(1, "Form is required"),
  strength: z.string().optional(),
  packSize: z.string().optional(),
  activeIngredient: z.string().optional(),
  schedule: z.string().min(1, "Schedule is required"),
  requiresPrescription: z.boolean(),
  artgNumber: z.string().optional(),
  pbsCode: z.string().optional(),
  stock: z
    .string()
    .min(1, "Stock is required")
    .refine(
      (v) => Number.isInteger(Number(v)) && Number(v) >= 0,
      "Enter a whole number"
    ),
  reorderLevel: z
    .string()
    .min(1, "Reorder level is required")
    .refine(
      (v) => Number.isInteger(Number(v)) && Number(v) >= 0,
      "Enter a whole number"
    ),
  supplier: z.string().optional(),
  storage: z.string().min(1, "Storage is required"),
  earliestExpiry: z.string().optional(),
  costPrice: z
    .string()
    .optional()
    .refine(
      (v) => !v || (!Number.isNaN(parseFloat(v)) && parseFloat(v) >= 0),
      "Enter a valid amount"
    ),
  price: z
    .string()
    .min(1, "Price is required")
    .refine(
      (v) => !Number.isNaN(parseFloat(v)) && parseFloat(v) >= 0,
      "Enter a valid price"
    ),
  gstApplicable: z.boolean(),
  status: z.string().min(1, "Status is required"),
  description: z.string().optional(),
});

export type ProductFormData = z.infer<typeof productFormSchema>;

// -----------------------------------------------------------------------------
// Defaults & conversion
// -----------------------------------------------------------------------------

export const EMPTY_PRODUCT_FORM: ProductFormData = {
  name: "",
  brand: "",
  genericName: "",
  sku: "",
  barcode: "",
  category: "otc",
  form: "tablet",
  strength: "",
  packSize: "",
  activeIngredient: "",
  schedule: "unscheduled",
  requiresPrescription: false,
  artgNumber: "",
  pbsCode: "",
  stock: "0",
  reorderLevel: "10",
  supplier: "",
  storage: "room",
  earliestExpiry: "",
  costPrice: "",
  price: "",
  gstApplicable: false,
  status: "active",
  description: "",
};

export function productToFormData(product: Product): ProductFormData {
  return {
    name: product.name,
    brand: product.brand ?? "",
    genericName: product.genericName ?? "",
    sku: product.sku,
    barcode: product.barcode ?? "",
    category: product.category,
    form: product.form,
    strength: product.strength ?? "",
    packSize: product.packSize ?? "",
    activeIngredient: product.activeIngredient ?? "",
    schedule: product.schedule,
    requiresPrescription: product.requiresPrescription,
    artgNumber: product.artgNumber ?? "",
    pbsCode: product.pbsCode ?? "",
    stock: String(product.stock),
    reorderLevel: String(product.reorderLevel),
    supplier: product.supplier ?? "",
    storage: product.storage,
    earliestExpiry: product.earliestExpiry ?? "",
    costPrice: product.costPrice != null ? String(product.costPrice) : "",
    price: String(product.price),
    gstApplicable: product.gstApplicable,
    status: product.status,
    description: product.description ?? "",
  };
}

export function formDataToProductInput(data: ProductFormData): ProductInput {
  const trim = (v?: string) => v?.trim() || undefined;
  return {
    name: data.name.trim(),
    brand: trim(data.brand),
    genericName: trim(data.genericName),
    sku: data.sku.trim().toUpperCase(),
    barcode: trim(data.barcode),
    category: data.category as ProductCategory,
    form: data.form as ProductForm,
    strength: trim(data.strength),
    packSize: trim(data.packSize),
    activeIngredient: trim(data.activeIngredient),
    schedule: data.schedule as ProductSchedule,
    requiresPrescription: data.requiresPrescription,
    artgNumber: trim(data.artgNumber),
    pbsCode: trim(data.pbsCode),
    stock: parseInt(data.stock, 10),
    reorderLevel: parseInt(data.reorderLevel, 10),
    supplier: trim(data.supplier),
    storage: data.storage as ProductStorage,
    earliestExpiry: trim(data.earliestExpiry),
    costPrice: data.costPrice ? parseFloat(data.costPrice) : undefined,
    price: parseFloat(data.price),
    gstApplicable: data.gstApplicable,
    status: data.status as ProductStatus,
    description: trim(data.description),
  };
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

export function useProductForm(initial?: ProductFormData) {
  return useForm<ProductFormData>({ defaultValues: initial ?? EMPTY_PRODUCT_FORM });
}

// -----------------------------------------------------------------------------
// Form component
// -----------------------------------------------------------------------------

interface ProductFormProps {
  id: string;
  form: UseFormReturn<ProductFormData>;
  onValidSubmit: (input: ProductInput) => void;
}

// Pill tabs mirror the product detail view so add/edit feel consistent.
const FORM_TABS = [
  { id: "details", label: "Details" },
  { id: "stock", label: "Stock" },
  { id: "pricing", label: "Pricing" },
  { id: "status", label: "Status" },
] as const;

type FormTabId = (typeof FORM_TABS)[number]["id"];

const TAB_FIELDS: Record<FormTabId, (keyof ProductFormData)[]> = {
  details: [
    "name",
    "brand",
    "genericName",
    "sku",
    "barcode",
    "category",
    "form",
    "strength",
    "packSize",
    "activeIngredient",
    "schedule",
    "requiresPrescription",
    "artgNumber",
    "pbsCode",
  ],
  stock: ["stock", "reorderLevel", "supplier", "storage", "earliestExpiry"],
  pricing: ["costPrice", "price", "gstApplicable"],
  status: ["status", "description"],
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function ProductForm({ id, form, onValidSubmit }: ProductFormProps) {
  const errors = form.formState.errors;
  const [activeTab, setActiveTab] = useState<FormTabId>("details");

  const tabErrorCounts = useMemo(() => {
    const counts: Record<FormTabId, number> = {
      details: 0,
      stock: 0,
      pricing: 0,
      status: 0,
    };
    for (const tab of FORM_TABS) {
      for (const field of TAB_FIELDS[tab.id]) {
        if (errors[field]) counts[tab.id] += 1;
      }
    }
    return counts;
  }, [errors]);

  const scheduleValue = useWatch({ control: form.control, name: "schedule" });
  const categoryValue = useWatch({ control: form.control, name: "category" });
  const formValue = useWatch({ control: form.control, name: "form" });
  const storageValue = useWatch({ control: form.control, name: "storage" });
  const statusValue = useWatch({ control: form.control, name: "status" });
  const gstValue = useWatch({ control: form.control, name: "gstApplicable" });
  const rxValue = useWatch({
    control: form.control,
    name: "requiresPrescription",
  });

  // Auto-tick "requires prescription" for S4/S8 unless user overrides.
  useEffect(() => {
    if (
      scheduleValue &&
      scheduleRequiresPrescription(scheduleValue as ProductSchedule) &&
      !rxValue
    ) {
      form.setValue("requiresPrescription", true, { shouldDirty: true });
    }
  }, [scheduleValue, rxValue, form]);

  const scheduleHint = useMemo(() => {
    if (scheduleValue === "S8") {
      return "Schedule 8 controlled drug — must be stored in a controlled-drug safe and recorded in the S8 register.";
    }
    if (scheduleValue === "S4") {
      return "Prescription-only medicine. Dispense only against a valid prescription.";
    }
    if (scheduleValue === "S3") {
      return "Pharmacist-only — requires pharmacist intervention before sale.";
    }
    if (scheduleValue === "S2") {
      return "Pharmacy medicine — sold only from a pharmacy.";
    }
    return null;
  }, [scheduleValue]);

  function setSelect(
    field: keyof ProductFormData,
    value: string | null
  ) {
    if (!value) return;
    // Cast through unknown because the select-backed fields are all strings,
    // but K could include boolean fields in the schema.
    form.setValue(field, value as unknown as never, { shouldDirty: true });
    form.clearErrors(field);
  }

  function handleSubmit(data: ProductFormData) {
    const result = productFormSchema.safeParse(data);
    if (!result.success) {
      const erroredFields = new Set<keyof ProductFormData>();
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ProductFormData;
        form.setError(field, { message: issue.message });
        erroredFields.add(field);
      }
      // Jump to the first tab containing an error so the user can see it.
      const firstErroredTab = FORM_TABS.find((tab) =>
        TAB_FIELDS[tab.id].some((f) => erroredFields.has(f))
      );
      if (firstErroredTab) setActiveTab(firstErroredTab.id);
      return;
    }
    onValidSubmit(formDataToProductInput(result.data));
  }

  return (
    <form
      id={id}
      onSubmit={form.handleSubmit(handleSubmit)}
      className="space-y-5"
    >
      {/* Tab navigation — mirrors the product detail view */}
      <nav className="inline-flex bg-muted rounded-sm p-1.5">
        {FORM_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const errorCount = tabErrorCounts[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 h-10 px-4.5 rounded-sm text-sm font-medium whitespace-nowrap transition-colors",
                isActive
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {errorCount > 0 && (
                <span className="inline-flex items-center justify-center rounded-sm px-1.5 text-[11px] font-semibold min-w-5 h-5 bg-destructive text-destructive-foreground">
                  {errorCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Details tab: identification + pharmaceutical + regulatory ----- */}
      <div hidden={activeTab !== "details"} className="space-y-5">
      {/* Identification ------------------------------------------------- */}
      <Section title="Identification">
        <div className="space-y-2">
          <Label htmlFor={`${id}-name`}>
            Product name <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`${id}-name`}
            placeholder="e.g. Amoxicillin 500mg Capsules"
            {...form.register("name")}
          />
          <FieldError message={errors.name?.message} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor={`${id}-brand`}>Brand</Label>
            <Input
              id={`${id}-brand`}
              placeholder="e.g. Amoxil"
              {...form.register("brand")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-generic`}>Generic name</Label>
            <Input
              id={`${id}-generic`}
              placeholder="e.g. Amoxicillin"
              {...form.register("genericName")}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor={`${id}-sku`}>
              SKU <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`${id}-sku`}
              placeholder="RX-AMX-500"
              {...form.register("sku")}
            />
            <FieldError message={errors.sku?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-barcode`}>Barcode (GTIN)</Label>
            <Input
              id={`${id}-barcode`}
              inputMode="numeric"
              placeholder="9312345000017"
              {...form.register("barcode")}
            />
          </div>
        </div>
      </Section>

      {/* Pharmaceutical ------------------------------------------------- */}
      <Section title="Pharmaceutical">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>
              Category <span className="text-destructive">*</span>
            </Label>
            <Select
              value={categoryValue}
              onValueChange={(v) => setSelect("category", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {PRODUCT_CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.category?.message} />
          </div>

          <div className="space-y-2">
            <Label>
              Form <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formValue}
              onValueChange={(v) => setSelect("form", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select form" />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_FORMS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {PRODUCT_FORM_LABELS[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.form?.message} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor={`${id}-strength`}>Strength</Label>
            <Input
              id={`${id}-strength`}
              placeholder="e.g. 500 mg"
              {...form.register("strength")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-pack`}>Pack size</Label>
            <Input
              id={`${id}-pack`}
              placeholder="e.g. 21 capsules"
              {...form.register("packSize")}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${id}-active`}>Active ingredient</Label>
          <Input
            id={`${id}-active`}
            placeholder="e.g. Amoxicillin trihydrate"
            {...form.register("activeIngredient")}
          />
        </div>
      </Section>

      {/* Regulatory ----------------------------------------------------- */}
      <Section
        title="Regulatory"
        description="Australian Poisons Standard scheduling and ARTG / PBS identifiers."
      >
        <div className="space-y-2">
          <Label>
            Schedule <span className="text-destructive">*</span>
          </Label>
          <Select
            value={scheduleValue}
            onValueChange={(v) => setSelect("schedule", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select schedule" />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_SCHEDULES.map((s) => (
                <SelectItem key={s} value={s}>
                  {PRODUCT_SCHEDULE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.schedule?.message} />
          {scheduleHint ? (
            <p
              className={cn(
                "text-xs",
                scheduleValue === "S8"
                  ? "text-status-danger-fg"
                  : "text-muted-foreground"
              )}
            >
              {scheduleHint}
            </p>
          ) : null}
        </div>

        <label
          htmlFor={`${id}-rx`}
          className="flex items-start gap-3 rounded-sm border border-border p-3"
        >
          <Checkbox
            id={`${id}-rx`}
            checked={rxValue}
            onCheckedChange={(v) =>
              form.setValue("requiresPrescription", Boolean(v), {
                shouldDirty: true,
              })
            }
          />
          <span className="flex flex-col">
            <span className="text-sm font-medium">Requires a prescription</span>
            <span className="text-xs text-muted-foreground">
              Auto-enabled for S4 and S8. Override only when clinically appropriate.
            </span>
          </span>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor={`${id}-artg`}>ARTG number</Label>
            <Input
              id={`${id}-artg`}
              placeholder="AUST R 12345"
              {...form.register("artgNumber")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-pbs`}>PBS code</Label>
            <Input
              id={`${id}-pbs`}
              placeholder="1956Y"
              {...form.register("pbsCode")}
            />
          </div>
        </div>
      </Section>
      </div>

      {/* Stock tab: inventory & storage -------------------------------- */}
      <div hidden={activeTab !== "stock"} className="space-y-5">
      {/* Inventory & storage ------------------------------------------- */}
      <Section title="Inventory & storage">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor={`${id}-stock`}>
              Current stock <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`${id}-stock`}
              type="number"
              inputMode="numeric"
              step="1"
              min="0"
              {...form.register("stock")}
            />
            <FieldError message={errors.stock?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-reorder`}>
              Reorder level <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`${id}-reorder`}
              type="number"
              inputMode="numeric"
              step="1"
              min="0"
              {...form.register("reorderLevel")}
            />
            <FieldError message={errors.reorderLevel?.message} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${id}-supplier`}>Supplier</Label>
          <Input
            id={`${id}-supplier`}
            placeholder="e.g. Symbion"
            {...form.register("supplier")}
          />
        </div>

        <div className="space-y-2">
          <Label>
            Storage <span className="text-destructive">*</span>
          </Label>
          <Select
            value={storageValue}
            onValueChange={(v) => setSelect("storage", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select storage" />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_STORAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {PRODUCT_STORAGE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.storage?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${id}-expiry`}>Earliest expiry</Label>
          <DatePicker
            id={`${id}-expiry`}
            value={form.watch("earliestExpiry") ?? ""}
            onChange={(v) =>
              form.setValue("earliestExpiry", v, { shouldDirty: true, shouldValidate: true })
            }
          />
          <p className="text-xs text-muted-foreground">
            Earliest expiry across all batches in stock. Update when receiving
            new stock with a later expiry.
          </p>
        </div>
      </Section>
      </div>

      {/* Pricing tab --------------------------------------------------- */}
      <div hidden={activeTab !== "pricing"} className="space-y-5">
      {/* Pricing -------------------------------------------------------- */}
      <Section title="Pricing">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor={`${id}-cost`}>Cost price (AUD)</Label>
            <Input
              id={`${id}-cost`}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...form.register("costPrice")}
            />
            <FieldError message={errors.costPrice?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-price`}>
              Retail price (AUD) <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`${id}-price`}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...form.register("price")}
            />
            <FieldError message={errors.price?.message} />
          </div>
        </div>

        <label
          htmlFor={`${id}-gst`}
          className="flex items-start gap-3 rounded-sm border border-border p-3"
        >
          <Checkbox
            id={`${id}-gst`}
            checked={gstValue}
            onCheckedChange={(v) =>
              form.setValue("gstApplicable", Boolean(v), { shouldDirty: true })
            }
          />
          <span className="flex flex-col">
            <span className="text-sm font-medium">GST applicable (10%)</span>
            <span className="text-xs text-muted-foreground">
              Most prescription medicines are GST-free; most devices and
              accessories are taxable.
            </span>
          </span>
        </label>
      </Section>
      </div>

      {/* Status tab ---------------------------------------------------- */}
      <div hidden={activeTab !== "status"} className="space-y-5">
      {/* Status & notes ------------------------------------------------- */}
      <Section title="Status & notes">
        <div className="space-y-2">
          <Label>
            Status <span className="text-destructive">*</span>
          </Label>
          <Select
            value={statusValue}
            onValueChange={(v) => setSelect("status", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {PRODUCT_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.status?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${id}-desc`}>Notes / description</Label>
          <Textarea
            id={`${id}-desc`}
            placeholder="Clinical notes, handling instructions, or anything staff should know."
            rows={3}
            {...form.register("description")}
          />
        </div>
      </Section>
      </div>
    </form>
  );
}
