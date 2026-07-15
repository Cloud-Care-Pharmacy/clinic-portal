"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { ClipboardList, PackageSearch } from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_SCHEDULES,
  PRODUCT_SCHEDULE_LABELS,
  productStore,
  type ProductCategory,
  type ProductSchedule,
} from "@/components/products/mock-products";
import {
  STOCKTAKE_SCOPE_TYPES,
  STOCKTAKE_SCOPE_TYPE_LABELS,
  productsInScope,
  scopeLabel,
  type ScopeSelection,
  type StocktakeInput,
  type StocktakeScopeType,
} from "./mock-stocktakes";

// -----------------------------------------------------------------------------
// Schema (manual safeParse — repo convention; do not use @hookform/resolvers)
// -----------------------------------------------------------------------------

export const stocktakeFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  countedBy: z.string().min(1, "Counted-by name is required"),
  notes: z.string().optional(),
});

export type StocktakeFormData = z.infer<typeof stocktakeFormSchema>;

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function useStocktakeForm() {
  return useForm<StocktakeFormData>({
    defaultValues: { name: "", countedBy: "", notes: "" },
  });
}

// -----------------------------------------------------------------------------
// Form component
// -----------------------------------------------------------------------------

interface StocktakeFormProps {
  id: string;
  form: UseFormReturn<StocktakeFormData>;
  onValidSubmit: (input: StocktakeInput) => void;
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

export function StocktakeForm({ id, form, onValidSubmit }: StocktakeFormProps) {
  const errors = form.formState.errors;
  const [scopeType, setScopeType] = useState<StocktakeScopeType>("all_active");
  const [category, setCategory] = useState<ProductCategory>("prescription");
  const [schedule, setSchedule] = useState<ProductSchedule>("S8");
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [scopeError, setScopeError] = useState<string | null>(null);

  const products = useSyncExternalStore(
    productStore.subscribe,
    productStore.getSnapshot,
    productStore.getServerSnapshot
  );

  const selection: ScopeSelection = useMemo(
    () => ({ type: scopeType, category, schedule }),
    [scopeType, category, schedule]
  );

  const scopedProducts = useMemo(
    () => productsInScope(selection, products),
    [selection, products]
  );

  const summary = useMemo(() => {
    let counted = 0;
    let variance = 0;
    for (const p of scopedProducts) {
      const raw = counts[p.id];
      if (raw == null || raw.trim() === "") continue;
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 0) continue;
      counted += 1;
      variance += n - p.stock;
    }
    return { total: scopedProducts.length, counted, variance };
  }, [scopedProducts, counts]);

  function handleSubmit(data: StocktakeFormData) {
    const result = stocktakeFormSchema.safeParse(data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        form.setError(issue.path[0] as keyof StocktakeFormData, {
          message: issue.message,
        });
      }
      return;
    }
    if (scopedProducts.length === 0) {
      setScopeError(
        "No active products match this scope. Choose a different scope to count."
      );
      return;
    }
    setScopeError(null);

    const lines = scopedProducts.map((p, i) => {
      const raw = counts[p.id];
      const n = raw != null && raw.trim() !== "" ? Number(raw) : NaN;
      const countedQty = Number.isInteger(n) && n >= 0 ? n : null;
      return {
        id: `stl_${Math.random().toString(36).slice(2, 8)}_${i}`,
        productId: p.id,
        name: p.name,
        sku: p.sku,
        expectedQty: p.stock,
        countedQty,
      };
    });

    onValidSubmit({
      name: result.data.name.trim(),
      countedBy: result.data.countedBy.trim(),
      scopeLabel: scopeLabel(selection),
      status: "in_progress",
      lines,
      notes: result.data.notes?.trim() || undefined,
      startedAt: todayIso(),
    });
  }

  return (
    <form id={id} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Details --------------------------------------------------------- */}
      <Section title="Stocktake details">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${id}-name`}>
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`${id}-name`}
              placeholder="e.g. Monthly full count — July"
              {...form.register("name")}
            />
            <FieldError message={errors.name?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-by`}>
              Counted by <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`${id}-by`}
              placeholder="Staff member performing the count"
              {...form.register("countedBy")}
            />
            <FieldError message={errors.countedBy?.message} />
          </div>
        </div>
      </Section>

      {/* Scope ----------------------------------------------------------- */}
      <Section
        title="Scope"
        description="Choose which products to count. A count sheet is generated from the current catalog."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Count</Label>
            <Select
              value={scopeType}
              onValueChange={(v) => {
                setScopeType(v as StocktakeScopeType);
                setScopeError(null);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STOCKTAKE_SCOPE_TYPES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STOCKTAKE_SCOPE_TYPE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {scopeType === "category" && (
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as ProductCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {PRODUCT_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {scopeType === "schedule" && (
            <div className="space-y-2">
              <Label>Schedule</Label>
              <Select
                value={schedule}
                onValueChange={(v) => setSchedule(v as ProductSchedule)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_SCHEDULES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PRODUCT_SCHEDULE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        {scopeError && <FieldError message={scopeError} />}
      </Section>

      {/* Count sheet ----------------------------------------------------- */}
      <Section
        title="Count sheet"
        description="Enter the physical count for each product. You can leave lines blank and finish counting later."
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            <strong className="text-foreground tabular-nums">
              {summary.total}
            </strong>{" "}
            in scope
          </span>
          <span>
            <strong className="text-foreground tabular-nums">
              {summary.counted}
            </strong>{" "}
            counted
          </span>
          <span>
            Net variance:{" "}
            <strong
              className={cn(
                "tabular-nums",
                summary.variance === 0
                  ? "text-foreground"
                  : summary.variance > 0
                    ? "text-status-success-fg"
                    : "text-status-danger-fg"
              )}
            >
              {summary.variance > 0 ? "+" : ""}
              {summary.variance}
            </strong>
          </span>
        </div>

        {scopedProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
            <PackageSearch
              className="size-5 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              No active products match this scope.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-sm border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="w-24 px-3 py-2 text-right font-medium">
                    Expected
                  </th>
                  <th className="w-28 px-3 py-2 text-right font-medium">
                    Counted
                  </th>
                  <th className="w-24 px-3 py-2 text-right font-medium">
                    Variance
                  </th>
                </tr>
              </thead>
              <tbody>
                {scopedProducts.map((p) => {
                  const raw = counts[p.id] ?? "";
                  const n = raw.trim() === "" ? NaN : Number(raw);
                  const valid = Number.isInteger(n) && n >= 0;
                  const variance = valid ? n - p.stock : null;
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="px-3 py-2">
                        <div className="flex flex-col leading-tight">
                          <span className="font-medium text-foreground">
                            {p.name}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {p.sku}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {p.stock}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
                          placeholder="—"
                          value={raw}
                          onChange={(e) =>
                            setCounts((prev) => ({
                              ...prev,
                              [p.id]: e.target.value,
                            }))
                          }
                          className="h-9 w-24 text-right"
                        />
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2 text-right tabular-nums",
                          variance == null
                            ? "text-muted-foreground"
                            : variance === 0
                              ? "text-foreground"
                              : variance > 0
                                ? "text-status-success-fg"
                                : "text-status-danger-fg"
                        )}
                      >
                        {variance == null
                          ? "—"
                          : `${variance > 0 ? "+" : ""}${variance}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Notes ----------------------------------------------------------- */}
      <Section title="Notes">
        <div className="flex items-start gap-2 rounded-sm border border-status-info-border bg-status-info-bg px-3 py-2 text-xs text-status-info-fg">
          <ClipboardList className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            The stocktake is saved as{" "}
            <strong>in&nbsp;progress</strong>. Completing it later reconciles the
            catalog by writing counted quantities back to product stock.
          </span>
        </div>
        <Textarea
          id={`${id}-notes`}
          placeholder="Context for this count — location, reason, anything unusual."
          rows={3}
          {...form.register("notes")}
        />
      </Section>
    </form>
  );
}
