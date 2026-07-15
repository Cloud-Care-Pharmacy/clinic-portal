"use client";

import { useMemo, useState } from "react";
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
import { formatAudCents } from "@/lib/format";
import { useInventory } from "@/lib/hooks/use-inventory";
import { CHANNEL_LABELS } from "@/components/orders/order-format";
import type {
  CreateOrderPayload,
  InventoryItem,
  OrderChannel,
} from "@/types/catalog";

const CHANNELS: OrderChannel[] = ["in_store", "online", "phone"];

// -----------------------------------------------------------------------------
// Schema (manual safeParse — repo convention; @hookform/resolvers is not used)
// -----------------------------------------------------------------------------

const lineSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  name: z.string(),
  sku: z.string().nullable(),
  priceCents: z.number(),
  requiresPrescription: z.boolean(),
  qty: z
    .string()
    .refine(
      (v) => Number.isInteger(Number(v)) && Number(v) >= 1,
      "Qty must be at least 1"
    ),
});

export const orderFormSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  channel: z.string().min(1, "Channel is required"),
  customerEmail: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),
      "Enter a valid email"
    ),
  customerPhone: z.string().optional(),
  note: z.string().optional(),
  lines: z.array(lineSchema).min(1, "Add at least one item"),
});

export type OrderLineFormData = z.infer<typeof lineSchema>;
export type OrderFormData = z.infer<typeof orderFormSchema>;

export const EMPTY_ORDER_FORM: OrderFormData = {
  customerName: "",
  channel: "in_store",
  customerEmail: "",
  customerPhone: "",
  note: "",
  lines: [],
};

export function useOrderForm(initial?: OrderFormData) {
  return useForm<OrderFormData>({ defaultValues: initial ?? EMPTY_ORDER_FORM });
}

/** Map validated form data to the gateway create-order payload. */
function toPayload(data: OrderFormData): CreateOrderPayload {
  const trim = (v?: string) => v?.trim() || undefined;
  return {
    customerName: data.customerName.trim(),
    channel: data.channel as OrderChannel,
    customerEmail: trim(data.customerEmail),
    customerPhone: trim(data.customerPhone),
    note: trim(data.note),
    lines: data.lines.map((l) => ({
      productId: l.productId,
      qty: parseInt(l.qty, 10),
    })),
  };
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

interface OrderFormProps {
  id: string;
  form: UseFormReturn<OrderFormData>;
  onValidSubmit: (payload: CreateOrderPayload) => void;
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
    name: "lines",
  });
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({});
  const [addValue, setAddValue] = useState("");

  const { data: inventoryData, isLoading } = useInventory();
  const products = useMemo<InventoryItem[]>(
    () => inventoryData?.data.items ?? [],
    [inventoryData]
  );

  const channel = useWatch({ control: form.control, name: "channel" });
  const watchedLines = useWatch({ control: form.control, name: "lines" });

  const subtotalCents = useMemo(() => {
    return (watchedLines ?? []).reduce((sum, l) => {
      const qty = parseInt(l.qty, 10);
      if (Number.isNaN(qty)) return sum;
      return sum + qty * l.priceCents;
    }, 0);
  }, [watchedLines]);

  function addProduct(productId: string) {
    const product = products.find((p) => p.productId === productId);
    if (!product) return;
    const existing = fields.findIndex((f) => f.productId === productId);
    if (existing >= 0) {
      const current = form.getValues(`lines.${existing}`);
      update(existing, {
        ...current,
        qty: String((parseInt(current.qty, 10) || 0) + 1),
      });
    } else {
      append({
        productId: product.productId,
        name: product.name,
        sku: product.sku,
        priceCents: product.priceCents,
        requiresPrescription: product.requiresPrescription,
        qty: "1",
      });
      form.clearErrors("lines");
    }
    setAddValue("");
  }

  function handleSubmit(data: OrderFormData) {
    const result = orderFormSchema.safeParse(data);
    if (!result.success) {
      const nextLineErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const [head, index, field] = issue.path;
        if (head === "lines" && typeof index === "number" && field) {
          nextLineErrors[`${index}-${String(field)}`] = issue.message;
        } else {
          form.setError(issue.path[0] as keyof OrderFormData, {
            message: issue.message,
          });
        }
      }
      setLineErrors(nextLineErrors);
      return;
    }
    setLineErrors({});
    onValidSubmit(toPayload(result.data));
  }

  return (
    <form id={id} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Customer ------------------------------------------------------- */}
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>
              Channel <span className="text-destructive">*</span>
            </Label>
            <Select
              value={channel}
              onValueChange={(v) => {
                if (!v) return;
                form.setValue("channel", v, { shouldDirty: true });
                form.clearErrors("channel");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select channel" />
              </SelectTrigger>
              <SelectContent>
                {CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CHANNEL_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.channel?.message} />
          </div>
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

      {/* Items ---------------------------------------------------------- */}
      <Section
        title="Items"
        description="Add products from the catalog. Prices are taken from the catalog at the time the order is created."
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
              <SelectValue
                placeholder={isLoading ? "Loading catalog…" : "Search the catalog…"}
              />
            </SelectTrigger>
            <SelectContent>
              {products.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  {isLoading ? "Loading…" : "No products available."}
                </div>
              ) : (
                products.map((p) => (
                  <SelectItem key={p.productId} value={p.productId}>
                    {p.name} · {formatAudCents(p.priceCents)}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {typeof errors.lines?.message === "string" && (
            <FieldError message={errors.lines.message} />
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
                  <th className="w-28 px-3 py-2 text-right font-medium">Unit</th>
                  <th className="w-28 px-3 py-2 text-right font-medium">Total</th>
                  <th className="w-10 px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => {
                  const qtyErr = lineErrors[`${index}-qty`];
                  const line = watchedLines?.[index];
                  const qty = parseInt(line?.qty ?? "", 10);
                  const rowTotal = Number.isNaN(qty)
                    ? null
                    : qty * field.priceCents;
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
                          {field.sku && (
                            <span className="font-mono text-xs text-muted-foreground">
                              {field.sku}
                            </span>
                          )}
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
                          {...form.register(`lines.${index}.qty`)}
                        />
                        {qtyErr && (
                          <p className="mt-1 text-[11px] text-destructive">
                            {qtyErr}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {formatAudCents(field.priceCents)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {rowTotal != null ? formatAudCents(rowTotal) : "—"}
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

        {fields.length > 0 && (
          <div className="flex items-center justify-end gap-3 pt-1 text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-base font-semibold tabular-nums text-foreground">
              {formatAudCents(subtotalCents)}
            </span>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          GST, shipping and the final total are calculated by the gateway when
          the order is created.
        </p>
      </Section>

      {/* Notes ---------------------------------------------------------- */}
      <Section title="Notes">
        <Textarea
          id={`${id}-note`}
          placeholder="Anything staff should know — collection preferences, prescription status, etc."
          rows={3}
          {...form.register("note")}
        />
      </Section>
    </form>
  );
}
