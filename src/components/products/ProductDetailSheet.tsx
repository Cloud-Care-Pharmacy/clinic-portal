"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Archive,
  Ban,
  CheckCircle2,
  Edit3,
  MoreHorizontal,
  PackageCheck,
  ShieldAlert,
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
import { AppSheet } from "@/components/shared/AppSheet";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useLastDefined } from "@/lib/hooks/use-last-defined";
import {
  ProductForm,
  productToFormData,
  useProductForm,
} from "./ProductForm";
import {
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_FORM_LABELS,
  PRODUCT_SCHEDULE_LABELS,
  PRODUCT_STATUS_LABELS,
  PRODUCT_STORAGE_LABELS,
  isExpired,
  isExpiringSoon,
  isLowStock,
  productStore,
  type Product,
  type ProductStatus,
} from "./mock-products";

const PRICE_FMT = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
});

const DATE_FMT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
};

interface ProductDetailSheetProps {
  product: Product | null;
  onClose: () => void;
}

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

function statusVariant(status: ProductStatus) {
  switch (status) {
    case "active":
      return "success" as const;
    case "inactive":
      return "neutral" as const;
    case "discontinued":
      return "warning" as const;
    case "recalled":
      return "danger" as const;
  }
}

export function ProductDetailSheet({
  product: input,
  onClose,
}: ProductDetailSheetProps) {
  const product = useLastDefined(input);
  const open = input != null;
  const formId = useId();
  const [isEditing, setIsEditing] = useState(false);
  const [confirm, setConfirm] = useState<null | {
    title: string;
    description: string;
    confirmLabel: string;
    destructive?: boolean;
    onConfirm: () => void;
  }>(null);

  const form = useProductForm(
    product ? productToFormData(product) : undefined
  );

  // Reset form whenever the selected product changes.
  useEffect(() => {
    if (product) form.reset(productToFormData(product));
  }, [product, form]);

  const warnings = useMemo(() => {
    if (!product) return [];
    const items: { tone: "warning" | "danger"; text: string }[] = [];
    if (product.status === "recalled") {
      items.push({ tone: "danger", text: "This product has been recalled — do not dispense." });
    } else if (product.status === "discontinued") {
      items.push({ tone: "warning", text: "Discontinued — use up existing stock then archive." });
    }
    if (isExpired(product)) {
      items.push({ tone: "danger", text: "Stock is past its earliest expiry date." });
    } else if (isExpiringSoon(product)) {
      items.push({ tone: "warning", text: "Stock is expiring within the next 90 days." });
    }
    if (product.stock === 0) {
      items.push({ tone: "danger", text: "Out of stock." });
    } else if (isLowStock(product)) {
      items.push({
        tone: "warning",
        text: `Stock at or below reorder level (${product.reorderLevel}).`,
      });
    }
    if (product.schedule === "S8" && product.storage !== "controlled") {
      items.push({
        tone: "danger",
        text: "S8 controlled drug must be stored in a controlled-drug safe.",
      });
    }
    return items;
  }, [product]);

  if (!product) {
    return null;
  }

  function changeStatus(status: ProductStatus, message: string) {
    if (!product) return;
    productStore.setStatus(product.id, status);
    toast.success(message);
  }

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={(v) => {
          if (!v) {
            setIsEditing(false);
            onClose();
          }
        }}
        title={
          <span className="flex items-center gap-2">
            <span>{product.name}</span>
            <StatusBadge
              variant={statusVariant(product.status)}
              dot
              className="capitalize"
            >
              {PRODUCT_STATUS_LABELS[product.status]}
            </StatusBadge>
          </span>
        }
        description={product.brand ? `${product.brand} · ${product.sku}` : product.sku}
        footer={
          isEditing ? (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  form.reset(productToFormData(product));
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" form={formId}>
                Save changes
              </Button>
            </>
          ) : (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  aria-label="More actions"
                >
                  <MoreHorizontal className="size-4" aria-hidden="true" />
                  Actions
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="top">
                  {product.status !== "active" && (
                    <DropdownMenuItem
                      onClick={() =>
                        changeStatus("active", "Product reactivated")
                      }
                    >
                      <CheckCircle2 className="size-4" />
                      Mark active
                    </DropdownMenuItem>
                  )}
                  {product.status !== "inactive" && (
                    <DropdownMenuItem
                      onClick={() =>
                        setConfirm({
                          title: "Archive product?",
                          description:
                            "Inactive products are hidden from prescribing and ordering flows but remain in the catalog.",
                          confirmLabel: "Archive",
                          onConfirm: () =>
                            changeStatus("inactive", "Product archived"),
                        })
                      }
                    >
                      <Archive className="size-4" />
                      Archive (set inactive)
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {product.status !== "discontinued" && (
                    <DropdownMenuItem
                      onClick={() =>
                        setConfirm({
                          title: "Mark as discontinued?",
                          description:
                            "Use this when the supplier has discontinued the line. Existing stock can still be dispensed.",
                          confirmLabel: "Discontinue",
                          onConfirm: () =>
                            changeStatus(
                              "discontinued",
                              "Product marked as discontinued"
                            ),
                        })
                      }
                    >
                      <Ban className="size-4" />
                      Mark discontinued
                    </DropdownMenuItem>
                  )}
                  {product.status !== "recalled" && (
                    <DropdownMenuItem
                      onClick={() =>
                        setConfirm({
                          title: "Mark as recalled?",
                          description:
                            "Recalled products are blocked from dispensing. Quarantine stock immediately.",
                          confirmLabel: "Mark recalled",
                          destructive: true,
                          onConfirm: () =>
                            changeStatus(
                              "recalled",
                              "Product marked as recalled"
                            ),
                        })
                      }
                    >
                      <ShieldAlert className="size-4 text-status-danger-fg" />
                      Mark recalled
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={() => setIsEditing(true)}>
                <Edit3 className="size-4" aria-hidden="true" />
                Edit
              </Button>
            </>
          )
        }
      >
        {isEditing ? (
          <ProductForm
            id={formId}
            form={form}
            onValidSubmit={(input) => {
              productStore.update(product.id, input);
              toast.success("Product updated");
              setIsEditing(false);
            }}
          />
        ) : (
          <div className="space-y-5">
            {warnings.length > 0 && (
              <div className="space-y-2">
                {warnings.map((w) => (
                  <div
                    key={w.text}
                    className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                      w.tone === "danger"
                        ? "border-status-danger-border bg-status-danger-bg text-status-danger-fg"
                        : "border-status-warning-border bg-status-warning-bg text-status-warning-fg"
                    }`}
                  >
                    <AlertTriangle className="size-4 mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{w.text}</span>
                  </div>
                )) }
              </div>
            )}

            <section className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {PRODUCT_CATEGORY_LABELS[product.category]}
                </Badge>
                <Badge variant="outline">{PRODUCT_FORM_LABELS[product.form]}</Badge>
                <Badge
                  variant="outline"
                  className={
                    product.schedule === "S8"
                      ? "border-status-danger-border bg-status-danger-bg text-status-danger-fg"
                      : product.schedule === "S4"
                        ? "border-status-warning-border bg-status-warning-bg text-status-warning-fg"
                        : product.schedule === "unscheduled"
                          ? ""
                          : "border-status-info-border bg-status-info-bg text-status-info-fg"
                  }
                >
                  {PRODUCT_SCHEDULE_LABELS[product.schedule]}
                </Badge>
                {product.requiresPrescription && (
                  <Badge variant="outline" className="border-status-info-border bg-status-info-bg text-status-info-fg">
                    Rx required
                  </Badge>
                )}
              </div>
              {product.description ? (
                <p className="text-sm text-muted-foreground">{product.description}</p>
              ) : null}
            </section>

            <section className="grid grid-cols-2 gap-4 rounded-xl border border-border p-4">
              <DetailRow label="Generic name">
                {product.genericName ?? "—"}
              </DetailRow>
              <DetailRow label="Active ingredient">
                {product.activeIngredient ?? "—"}
              </DetailRow>
              <DetailRow label="Strength">{product.strength ?? "—"}</DetailRow>
              <DetailRow label="Pack size">{product.packSize ?? "—"}</DetailRow>
              <DetailRow label="Barcode (GTIN)">{product.barcode ?? "—"}</DetailRow>
              <DetailRow label="ARTG">{product.artgNumber ?? "—"}</DetailRow>
              <DetailRow label="PBS code">{product.pbsCode ?? "—"}</DetailRow>
              <DetailRow label="Supplier">{product.supplier ?? "—"}</DetailRow>
            </section>

            <section className="grid grid-cols-2 gap-4 rounded-xl border border-border p-4">
              <DetailRow label="In stock">
                <span className="flex items-center gap-2 tabular-nums">
                  <PackageCheck className="size-4 text-muted-foreground" aria-hidden="true" />
                  {product.stock}
                  {isLowStock(product) && (
                    <Badge
                      variant="outline"
                      className="border-status-warning-border bg-status-warning-bg text-status-warning-fg"
                    >
                      Low
                    </Badge>
                  )}
                </span>
              </DetailRow>
              <DetailRow label="Reorder level">
                <span className="tabular-nums">{product.reorderLevel}</span>
              </DetailRow>
              <DetailRow label="Storage">
                {PRODUCT_STORAGE_LABELS[product.storage]}
              </DetailRow>
              <DetailRow label="Earliest expiry">
                {product.earliestExpiry
                  ? new Date(product.earliestExpiry).toLocaleDateString(
                      "en-AU",
                      DATE_FMT
                    )
                  : "—"}
              </DetailRow>
            </section>

            <section className="grid grid-cols-2 gap-4 rounded-xl border border-border p-4">
              <DetailRow label="Cost price">
                {product.costPrice != null
                  ? PRICE_FMT.format(product.costPrice)
                  : "—"}
              </DetailRow>
              <DetailRow label="Retail price">
                <span className="font-medium">
                  {PRICE_FMT.format(product.price)}
                </span>
              </DetailRow>
              <DetailRow label="Margin">
                {product.costPrice != null && product.costPrice > 0
                  ? `${Math.round(
                      ((product.price - product.costPrice) / product.price) *
                        100
                    )}%`
                  : "—"}
              </DetailRow>
              <DetailRow label="GST">
                {product.gstApplicable ? "Applicable (10%)" : "GST-free"}
              </DetailRow>
            </section>

            <section className="rounded-xl border border-border p-4 text-xs text-muted-foreground space-y-1">
              <div>
                Created{" "}
                {new Date(product.createdAt).toLocaleDateString("en-AU", DATE_FMT)}
              </div>
              <div>
                Last updated{" "}
                {new Date(product.updatedAt).toLocaleDateString("en-AU", DATE_FMT)}
              </div>
              <div>ID: {product.id}</div>
            </section>
          </div>
        )}
      </AppSheet>

      <AlertDialog
        open={confirm != null}
        onOpenChange={(v) => {
          if (!v) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.description}</AlertDialogDescription>
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
    </>
  );
}
