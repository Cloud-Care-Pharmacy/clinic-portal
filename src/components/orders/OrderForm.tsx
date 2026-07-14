"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  useFieldArray,
  useForm,
  useWatch,
  type UseFormReturn,
} from "react-hook-form";
import { z } from "zod";
import { Package, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/shared/DatePicker";
import { cn } from "@/lib/utils";
import {
  productStore,
  type Product,
} from "@/components/products/mock-products";
import {
  ORDER_CHANNELS,
  ORDER_CHANNEL_LABELS,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  type Order,
  type OrderChannel,
  type OrderInput,
  type OrderStatus,
} from "./mock-orders";

const PRICE_FMT = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
});

// -----------------------------------------------------------------------------
// Schema (manual safeParse — repo convention; do not use @hookform/resolvers)
// -----------------------------------------------------------------------------

const lineItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1, "Product is required"),
  name: z.string(),
  sku: z.string(),
  quantity: z
    .string()
    .refine(
      (v) => Number.isInteger(Number(v)) && Number(v) >= 1,
      "Qty must be at least 1"
    ),
  unitPrice: z
    .string()
    .refine(
      (v) => !Number.isNaN(parseFloat(v)) && parseFloat(v) >= 0,
      "Enter a valid price"
    ),
  gstApplicable: z.boolean(),
  requiresPrescription: z.boolean(),
});

export const orderFormSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),
      "Enter a valid email"
    ),
  customerPhone: z.string().optional(),
  channel: z.string().min(1, "Channel is required"),
  status: z.string().min(1, "Status is required"),
  placedAt: z.string().min(1, "Order date is required"),
  discount: z
    .string()
    .optional()
    .refine(
      (v) => !v || (!Number.isNaN(parseFloat(v)) && parseFloat(v) >= 0),
      "Enter a valid amount"
    ),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, "Add at least one item"),
});

export type OrderLineFormData = z.infer<typeof lineItemSchema>;
export type OrderFormData = z.infer<typeof orderFormSchema>;

// -----------------------------------------------------------------------------
// Defaults & conversion
// -----------------------------------------------------------------------------

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function emptyOrderForm(): OrderFormData {
  return {
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    channel: "in_store",
    status: "draft",
    placedAt: todayIso(),
    discount: "",
    notes: "",
    lineItems: [],
  };
}

export function orderToFormData(order: Order): OrderFormData {
  return {
    customerName: order.customerName,
    customerEmail: order.customerEmail ?? "",
    customerPhone: order.customerPhone ?? "",
    channel: order.channel,
    status: order.status,
    placedAt: order.placedAt,
    discount: order.discount ? String(order.discount) : "",
    notes: order.notes ?? "",
    lineItems: order.lineItems.map((l) => ({
      id: l.id,
      productId: l.productId,
      name: l.name,
      sku: l.sku,
      quantity: String(l.quantity),
      unitPrice: String(l.unitPrice),
      gstApplicable: l.gstApplicable,
      requiresPrescription: l.requiresPrescription,
    })),
  };
}

export function formDataToOrderInput(data: OrderFormData): OrderInput {
  const trim = (v?: string) => v?.trim() || undefined;
  const status = data.status as OrderStatus;
  return {
    customerName: data.customerName.trim(),
    customerEmail: trim(data.customerEmail),
    customerPhone: trim(data.customerPhone),
    channel: data.channel as OrderChannel,
    status,
    discount: data.discount ? parseFloat(data.discount) : 0,
    placedAt: data.placedAt,
    fulfilledAt: status === "fulfilled" ? todayIso() : undefined,
    notes: trim(data.notes),
    lineItems: data.lineItems.map((l, i) => ({
      id: l.id ?? `oli_${Math.random().toString(36).slice(2, 8)}_${i}`,
      productId: l.productId,
      name: l.name,
      sku: l.sku,
      quantity: parseInt(l.quantity, 10),
      unitPrice: parseFloat(l.unitPrice),
      gstApplicable: l.gstApplicable,
      requiresPrescription: l.requiresPrescription,
    })),
  };
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

export function useOrderForm(initial?: OrderFormData) {
  return useForm<OrderFormData>({ defaultValues: initial ?? emptyOrderForm() });
}

// -----------------------------------------------------------------------------
// Form component
// -----------------------------------------------------------------------------

interface OrderFormProps {
  id: string;
  form: UseFormReturn<OrderFormData>;
  onValidSubmit: (input: OrderInput) => void;
}

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
    <section className="space-y-3 border-t border-border pt-5 first:border-t-0 first:pt-0">
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

export function OrderForm({ id, form, onValidSubmit }: OrderFormProps) {
  const errors = form.formState.errors;
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });
  const [lineFieldErrors, setLineFieldErrors] = useState<Record<string, string>>(
    {}
  );
  const [addValue, setAddValue] = useState("");

  const products = useSyncExternalStore(
    productStore.subscribe,
    productStore.getSnapshot,
    productStore.getServerSnapshot
  );
  const sellableProducts = useMemo(
    () => products.filter((p) => p.status === "active"),
    [products]
  );

  const channelValue = useWatch({ control: form.control, name: "channel" });
  const statusValue = useWatch({ control: form.control, name: "status" });
  const watchedLines = useWatch({ control: form.control, name: "lineItems" });
  const discountValue = useWatch({ control: form.control, name: "discount" });

  // Live totals preview (tolerant of partially-typed numbers).
  const totals = useMemo(() => {
    const lines = watchedLines ?? [];
    const subtotal = lines.reduce((sum, l) => {
      const qty = parseInt(l.quantity, 10);
      const price = parseFloat(l.unitPrice);
      if (Number.isNaN(qty) || Number.isNaN(price)) return sum;
      return sum + qty * price;
    }, 0);
    const discount = Math.min(
      discountValue ? parseFloat(discountValue) || 0 : 0,
      subtotal
    );
    const unitCount = lines.reduce((sum, l) => {
      const qty = parseInt(l.quantity, 10);
      return Number.isNaN(qty) ? sum : sum + qty;
    }, 0);
    return {
      subtotal,
      discount,
      total: Math.max(0, subtotal - discount),
      unitCount,
    };
  }, [watchedLines, discountValue]);

  function setSelect(field: keyof OrderFormData, value: string | null) {
    if (!value) return;
    form.setValue(field, value as unknown as never, { shouldDirty: true });
    form.clearErrors(field);
  }

  function addProduct(productId: string) {
    const product = sellableProducts.find((p) => p.id === productId);
    if (!product) return;
    // If already on the order, bump its quantity instead of duplicating.
    const existingIndex = fields.findIndex((f) => f.productId === productId);
    if (existingIndex >= 0) {
      const current = form.getValues(`lineItems.${existingIndex}`);
      const nextQty = (parseInt(current.quantity, 10) || 0) + 1;
      update(existingIndex, { ...current, quantity: String(nextQty) });
    } else {
      append(newLineFor(product));
      form.clearErrors("lineItems");
    }
    setAddValue("");
  }

  function handleSubmit(data: OrderFormData) {
    const result = orderFormSchema.safeParse(data);
    if (!result.success) {
      const nextLineErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const [head, index, field] = issue.path;
        if (head === "lineItems" && typeof index === "number" && field) {
          nextLineErrors[`${index}-${String(field)}`] = issue.message;
        } else {
          form.setError(issue.path[0] as keyof OrderFormData, {
            message: issue.message,
          });
        }
      }
      setLineFieldErrors(nextLineErrors);
      return;
    }
    setLineFieldErrors({});
    onValidSubmit(formDataToOrderInput(result.data));
  }

  return (
    <form
      id={id}
      onSubmit={form.handleSubmit(handleSubmit)}
      className="space-y-6"
    >
      {/* Customer -------------------------------------------------------- */}
      <Section title="Customer">
        <div className="space-y-2">
          <Label htmlFor={`${id}-cust`}>
            Customer name <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`${id}-cust`}
            placeholder="e.g. Margaret Hollis or Walk-in customer"
            {...form.register("customerName")}
          />
          <FieldError message={errors.customerName?.message} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${id}-email`}>Email</Label>
            <Input
              id={`${id}-email`}
              type="email"
              inputMode="email"
              placeholder="name@example.com"
              {...form.register("customerEmail")}
            />
            <FieldError message={errors.customerEmail?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-phone`}>Phone</Label>
            <Input
              id={`${id}-phone`}
              type="tel"
              inputMode="tel"
              placeholder="0412 345 678"
              {...form.register("customerPhone")}
            />
          </div>
        </div>
      </Section>

      {/* Fulfilment ------------------------------------------------------ */}
      <Section title="Fulfilment">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>
              Channel <span className="text-destructive">*</span>
            </Label>
            <Select
              value={channelValue}
              onValueChange={(v) => setSelect("channel", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select channel" />
              </SelectTrigger>
              <SelectContent>
                {ORDER_CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {ORDER_CHANNEL_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.channel?.message} />
          </div>
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
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {ORDER_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.status?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-placed`}>
              Order date <span className="text-destructive">*</span>
            </Label>
            <DatePicker
              id={`${id}-placed`}
              value={form.watch("placedAt")}
              onChange={(v) =>
                form.setValue("placedAt", v, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
            <FieldError message={errors.placedAt?.message} />
          </div>
        </div>
      </Section>

      {/* Items ----------------------------------------------------------- */}
      <Section
        title="Items"
        description="Add products from the catalog. Prices default to the catalog retail price and can be overridden per order."
      >
        <div className="space-y-2">
          <Label>Add product</Label>
          <Select
            value={addValue}
            onValueChange={(v) => {
              if (v) addProduct(v);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Search the catalog…" />
            </SelectTrigger>
            <SelectContent>
              {sellableProducts.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  No active products in the catalog.
                </div>
              ) : (
                sellableProducts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} · {PRICE_FMT.format(p.price)}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {typeof errors.lineItems?.message === "string" && (
            <FieldError message={errors.lineItems.message} />
          )}
        </div>

        {fields.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
            <Package className="size-5 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              No items yet — add a product to build the order.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-sm border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="w-24 px-3 py-2 text-right font-medium">Qty</th>
                  <th className="w-32 px-3 py-2 text-right font-medium">
                    Unit price
                  </th>
                  <th className="w-28 px-3 py-2 text-right font-medium">Total</th>
                  <th className="w-10 px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => {
                  const qtyErr = lineFieldErrors[`${index}-quantity`];
                  const priceErr = lineFieldErrors[`${index}-unitPrice`];
                  const line = watchedLines?.[index];
                  const qty = parseInt(line?.quantity ?? "", 10);
                  const price = parseFloat(line?.unitPrice ?? "");
                  const rowTotal =
                    Number.isNaN(qty) || Number.isNaN(price) ? null : qty * price;
                  return (
                    <tr
                      key={field.id}
                      className="border-b border-border last:border-b-0 align-top"
                    >
                      <td className="px-3 py-2">
                        <div className="flex flex-col leading-tight">
                          <span className="font-medium text-foreground">
                            {field.name}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {field.sku}
                          </span>
                          {field.requiresPrescription && (
                            <Badge
                              variant="outline"
                              className="mt-1 w-fit border-status-info-border bg-status-info-bg text-status-info-fg text-[11px]"
                            >
                              Rx required
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          step={1}
                          className="h-9 w-20 text-right"
                          aria-invalid={qtyErr ? true : undefined}
                          {...form.register(`lineItems.${index}.quantity`)}
                        />
                        {qtyErr && (
                          <p className="mt-1 text-[11px] text-destructive">
                            {qtyErr}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.01"
                          className="h-9 w-28 text-right"
                          aria-invalid={priceErr ? true : undefined}
                          {...form.register(`lineItems.${index}.unitPrice`)}
                        />
                        {priceErr && (
                          <p className="mt-1 text-[11px] text-destructive">
                            {priceErr}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {rowTotal != null ? PRICE_FMT.format(rowTotal) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="inline-flex size-8 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                          aria-label={`Remove ${field.name}`}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals ------------------------------------------------------- */}
        <div className="flex flex-col items-end gap-2 pt-1">
          <div className="grid w-full max-w-xs grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-right tabular-nums">
              {PRICE_FMT.format(totals.subtotal)}
            </span>
            <div className="col-span-2 flex items-center justify-between gap-2">
              <Label
                htmlFor={`${id}-discount`}
                className="text-muted-foreground font-normal"
              >
                Discount
              </Label>
              <div className="relative w-28">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id={`${id}-discount`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  className={cn("h-9 pl-5 text-right", "w-28")}
                  {...form.register("discount")}
                />
              </div>
            </div>
            {typeof errors.discount?.message === "string" && (
              <p className="col-span-2 text-right text-xs text-destructive">
                {errors.discount.message}
              </p>
            )}
            <span className="border-t border-border pt-1.5 font-semibold text-foreground">
              Total
            </span>
            <span className="border-t border-border pt-1.5 text-right text-base font-semibold tabular-nums text-foreground">
              {PRICE_FMT.format(totals.total)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {totals.unitCount} unit{totals.unitCount === 1 ? "" : "s"} ·{" "}
            {fields.length} line{fields.length === 1 ? "" : "s"}
          </p>
        </div>
      </Section>

      {/* Notes ----------------------------------------------------------- */}
      <Section title="Notes">
        <Textarea
          id={`${id}-notes`}
          placeholder="Anything staff should know — collection preferences, prescription status, etc."
          rows={3}
          {...form.register("notes")}
        />
      </Section>
    </form>
  );
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function newLineFor(product: Product): OrderLineFormData {
  return {
    id: undefined,
    productId: product.id,
    name: product.name,
    sku: product.sku,
    quantity: "1",
    unitPrice: String(product.price),
    gstApplicable: product.gstApplicable,
    requiresPrescription: product.requiresPrescription,
  };
}
