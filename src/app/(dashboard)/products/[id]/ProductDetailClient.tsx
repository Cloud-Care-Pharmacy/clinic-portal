"use client";

import { useEffect, useId, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Edit3,
  Minus,
  MoreHorizontal,
  Package,
  PackageCheck,
  Plus,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  ProductForm,
  productToFormData,
  useProductForm,
} from "@/components/products/ProductForm";
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
} from "@/components/products/mock-products";
import { cn } from "@/lib/utils";

const PRICE_FMT = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
});

const DATE_FMT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
};

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "details", label: "Details" },
  { id: "stock", label: "Stock" },
  { id: "pricing", label: "Pricing" },
  { id: "activity", label: "Activity" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
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

interface ProductDetailClientProps {
  productId: string;
}

export function ProductDetailClient({ productId }: ProductDetailClientProps) {
  const { push } = useRouter();
  const products = useSyncExternalStore(
    productStore.subscribe,
    productStore.getSnapshot,
    productStore.getServerSnapshot
  );

  const product = useMemo(
    () => products.find((p) => p.id === productId) ?? null,
    [products, productId]
  );

  const formId = useId();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [confirm, setConfirm] = useState<null | {
    title: string;
    description: string;
    confirmLabel: string;
    destructive?: boolean;
    onConfirm: () => void;
  }>(null);

  const form = useProductForm(product ? productToFormData(product) : undefined);

  // Keep form in sync when product changes (e.g., status mutation outside edit mode).
  useEffect(() => {
    if (product && !isEditing) form.reset(productToFormData(product));
  }, [product, isEditing, form]);

  const warnings = useMemo(() => {
    if (!product) return [];
    const items: { tone: "warning" | "danger"; text: string }[] = [];
    if (product.status === "recalled") {
      items.push({
        tone: "danger",
        text: "This product has been recalled — do not dispense.",
      });
    } else if (product.status === "discontinued") {
      items.push({
        tone: "warning",
        text: "Discontinued — use up existing stock then archive.",
      });
    }
    if (isExpired(product)) {
      items.push({
        tone: "danger",
        text: "Stock is past its earliest expiry date.",
      });
    } else if (isExpiringSoon(product)) {
      items.push({
        tone: "warning",
        text: "Stock is expiring within the next 90 days.",
      });
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
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to products
          </Link>
        </div>
        <EmptyState
          icon={Package}
          title="Product not found"
          description={`No product with id ${productId}. It may have been removed.`}
          actionLabel="Back to products"
          onAction={() => push("/products")}
        />
      </div>
    );
  }

  function changeStatus(status: ProductStatus, message: string) {
    if (!product) return;
    productStore.setStatus(product.id, status);
    toast.success(message);
  }

  const tabCounts: Partial<Record<TabId, number>> = {
    overview: warnings.length || undefined,
  };

  const headerActions = isEditing ? (
    <div className="flex items-center gap-2">
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
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="More actions"
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
          Actions
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {product.status !== "active" && (
            <DropdownMenuItem
              onClick={() => changeStatus("active", "Product reactivated")}
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
                  onConfirm: () => changeStatus("inactive", "Product archived"),
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
                    changeStatus("discontinued", "Product marked as discontinued"),
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
                    changeStatus("recalled", "Product marked as recalled"),
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
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      <div>
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to products
        </Link>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
            <StatusBadge
              variant={statusVariant(product.status)}
              dot
              className="capitalize"
            >
              {PRODUCT_STATUS_LABELS[product.status]}
            </StatusBadge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {product.brand ? `${product.brand} · ${product.sku}` : product.sku}
          </p>
        </div>
        {headerActions}
      </div>

      {isEditing ? (
        <div className="rounded-sm border border-border bg-card p-6">
          <ProductForm
            id={formId}
            form={form}
            onValidSubmit={(input) => {
              productStore.update(product.id, input);
              toast.success("Product updated");
              setIsEditing(false);
            }}
          />
        </div>
      ) : (
        <>
          {/* Tab navigation */}
          <nav className="inline-flex bg-muted rounded-sm p-1.5">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const count = tabCounts[tab.id];
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
                  {count != null && count > 0 && (
                    <span className="inline-flex items-center justify-center rounded-sm px-1.5 text-[11px] font-semibold min-w-5 h-5 bg-[color-mix(in_srgb,currentColor_12%,transparent)]">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {activeTab === "overview" && (
            <OverviewTab product={product} warnings={warnings} />
          )}
          {activeTab === "details" && <DetailsTab product={product} />}
          {activeTab === "stock" && <StockTab product={product} />}
          {activeTab === "pricing" && <PricingTab product={product} />}
          {activeTab === "activity" && <ActivityTab product={product} />}
        </>
      )}

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
    </div>
  );
}

function OverviewTab({
  product,
  warnings,
}: {
  product: Product;
  warnings: { tone: "warning" | "danger"; text: string }[];
}) {
  return (
    <div className="space-y-6">
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w) => (
            <div
              key={w.text}
              className={`flex items-start gap-2 rounded-sm border px-3 py-2 text-sm ${
                w.tone === "danger"
                  ? "border-status-danger-border bg-status-danger-bg text-status-danger-fg"
                  : "border-status-warning-border bg-status-warning-bg text-status-warning-fg"
              }`}
            >
              <AlertTriangle className="size-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span>{w.text}</span>
            </div>
          ))}
        </div>
      )}

      <section className="space-y-3 rounded-sm border border-border bg-card p-6">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{PRODUCT_CATEGORY_LABELS[product.category]}</Badge>
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
            <Badge
              variant="outline"
              className="border-status-info-border bg-status-info-bg text-status-info-fg"
            >
              Rx required
            </Badge>
          )}
        </div>
        {product.description ? (
          <p className="text-sm text-muted-foreground">{product.description}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No description provided.
          </p>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryStat label="In stock" value={product.stock.toString()} />
        <SummaryStat label="Retail price" value={PRICE_FMT.format(product.price)} />
        <SummaryStat
          label="Earliest expiry"
          value={
            product.earliestExpiry
              ? new Date(product.earliestExpiry).toLocaleDateString("en-AU", DATE_FMT)
              : "—"
          }
        />
        <SummaryStat label="Storage" value={PRODUCT_STORAGE_LABELS[product.storage]} />
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums text-foreground">
        {value}
      </div>
    </div>
  );
}

function DetailsTab({ product }: { product: Product }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-4 rounded-sm border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground">Identification</h2>
        <div className="grid grid-cols-2 gap-4">
          <DetailRow label="Name">{product.name}</DetailRow>
          <DetailRow label="Brand">{product.brand ?? "—"}</DetailRow>
          <DetailRow label="Generic name">{product.genericName ?? "—"}</DetailRow>
          <DetailRow label="Active ingredient">
            {product.activeIngredient ?? "—"}
          </DetailRow>
          <DetailRow label="Strength">{product.strength ?? "—"}</DetailRow>
          <DetailRow label="Pack size">{product.packSize ?? "—"}</DetailRow>
          <DetailRow label="Form">{PRODUCT_FORM_LABELS[product.form]}</DetailRow>
          <DetailRow label="Category">
            {PRODUCT_CATEGORY_LABELS[product.category]}
          </DetailRow>
        </div>
      </section>

      <section className="space-y-4 rounded-sm border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground">Codes & regulatory</h2>
        <div className="grid grid-cols-2 gap-4">
          <DetailRow label="SKU">{product.sku}</DetailRow>
          <DetailRow label="Barcode (GTIN)">{product.barcode ?? "—"}</DetailRow>
          <DetailRow label="ARTG">{product.artgNumber ?? "—"}</DetailRow>
          <DetailRow label="PBS code">{product.pbsCode ?? "—"}</DetailRow>
          <DetailRow label="Schedule">
            {PRODUCT_SCHEDULE_LABELS[product.schedule]}
          </DetailRow>
          <DetailRow label="Prescription required">
            {product.requiresPrescription ? "Yes" : "No"}
          </DetailRow>
          <DetailRow label="Supplier">{product.supplier ?? "—"}</DetailRow>
          <DetailRow label="Status">{PRODUCT_STATUS_LABELS[product.status]}</DetailRow>
        </div>
      </section>

      {product.description && (
        <section className="space-y-2 rounded-sm border border-border bg-card p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground">Description</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {product.description}
          </p>
        </section>
      )}
    </div>
  );
}

function StockTab({ product }: { product: Product }) {
  const [adjustQty, setAdjustQty] = useState(1);
  const isControlled = product.schedule === "S8";

  function adjust(delta: number) {
    if (delta === 0) return;
    const next = product.stock + delta;
    if (next < 0) {
      toast.error("Stock cannot go below zero");
      return;
    }
    productStore.adjustStock(product.id, delta);
    toast.success(
      delta > 0
        ? `Added ${delta} to stock (now ${next})`
        : `Removed ${Math.abs(delta)} from stock (now ${next})`
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-sm border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground">Inventory levels</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <DetailRow label="In stock">
            <span className="flex items-center gap-2 tabular-nums">
              <PackageCheck
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="text-lg font-semibold">{product.stock}</span>
              {product.stock === 0 ? (
                <Badge
                  variant="outline"
                  className="border-status-danger-border bg-status-danger-bg text-status-danger-fg"
                >
                  Out
                </Badge>
              ) : isLowStock(product) ? (
                <Badge
                  variant="outline"
                  className="border-status-warning-border bg-status-warning-bg text-status-warning-fg"
                >
                  Low
                </Badge>
              ) : null}
            </span>
          </DetailRow>
          <DetailRow label="Reorder level">
            <span className="tabular-nums">{product.reorderLevel}</span>
          </DetailRow>
          <DetailRow label="Pack size">{product.packSize ?? "—"}</DetailRow>
          <DetailRow label="Supplier">{product.supplier ?? "—"}</DetailRow>
        </div>
      </section>

      <section className="space-y-4 rounded-sm border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Adjust stock</h2>
          {isControlled && (
            <Badge
              variant="outline"
              className="border-status-danger-border bg-status-danger-bg text-status-danger-fg"
            >
              S8: log in CD register
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Mock adjustment (changes are local). Once the backend ships this will create
          an audited stock movement.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="number"
            min={1}
            value={adjustQty}
            onChange={(e) => setAdjustQty(Math.max(1, Number(e.target.value) || 1))}
            className="w-24"
          />
          <Button type="button" variant="outline" onClick={() => adjust(adjustQty)}>
            <Plus className="size-4" aria-hidden="true" />
            Add
          </Button>
          <Button type="button" variant="outline" onClick={() => adjust(-adjustQty)}>
            <Minus className="size-4" aria-hidden="true" />
            Remove
          </Button>
        </div>
      </section>

      <section className="space-y-4 rounded-sm border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground">Storage & expiry</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <DetailRow label="Storage requirement">
            {PRODUCT_STORAGE_LABELS[product.storage]}
          </DetailRow>
          <DetailRow label="Earliest expiry">
            <span
              className={cn(
                isExpired(product) && "text-status-danger-fg font-medium",
                !isExpired(product) &&
                  isExpiringSoon(product) &&
                  "text-status-warning-fg font-medium"
              )}
            >
              {product.earliestExpiry
                ? new Date(product.earliestExpiry).toLocaleDateString("en-AU", DATE_FMT)
                : "—"}
            </span>
          </DetailRow>
          <DetailRow label="Cold chain">
            {product.storage === "refrigerated" || product.storage === "frozen"
              ? "Yes"
              : "No"}
          </DetailRow>
        </div>
        {product.schedule === "S8" && product.storage !== "controlled" && (
          <div className="flex items-start gap-2 rounded-sm border border-status-danger-border bg-status-danger-bg px-3 py-2 text-sm text-status-danger-fg">
            <AlertTriangle className="size-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>S8 controlled drug must be stored in a controlled-drug safe.</span>
          </div>
        )}
      </section>
    </div>
  );
}

function PricingTab({ product }: { product: Product }) {
  const margin =
    product.costPrice != null && product.costPrice > 0 && product.price > 0
      ? Math.round(((product.price - product.costPrice) / product.price) * 100)
      : null;
  const markup =
    product.costPrice != null && product.costPrice > 0
      ? Math.round(((product.price - product.costPrice) / product.costPrice) * 100)
      : null;

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-sm border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground">Prices</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <DetailRow label="Cost price">
            {product.costPrice != null ? PRICE_FMT.format(product.costPrice) : "—"}
          </DetailRow>
          <DetailRow label="Retail price">
            <span className="text-lg font-semibold">
              {PRICE_FMT.format(product.price)}
            </span>
          </DetailRow>
          <DetailRow label="Margin">{margin != null ? `${margin}%` : "—"}</DetailRow>
          <DetailRow label="Markup">{markup != null ? `${markup}%` : "—"}</DetailRow>
        </div>
      </section>

      <section className="space-y-4 rounded-sm border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground">Tax & PBS</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <DetailRow label="GST">
            {product.gstApplicable ? "Applicable (10%)" : "GST-free"}
          </DetailRow>
          <DetailRow label="PBS code">{product.pbsCode ?? "—"}</DetailRow>
          <DetailRow label="Rx required">
            {product.requiresPrescription ? "Yes" : "No"}
          </DetailRow>
        </div>
      </section>
    </div>
  );
}

function ActivityTab({ product }: { product: Product }) {
  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-sm border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground">Metadata</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
          <DetailRow label="Created">
            {new Date(product.createdAt).toLocaleDateString("en-AU", DATE_FMT)}
          </DetailRow>
          <DetailRow label="Last updated">
            {new Date(product.updatedAt).toLocaleDateString("en-AU", DATE_FMT)}
          </DetailRow>
          <DetailRow label="Product ID">
            <span className="font-mono text-xs">{product.id}</span>
          </DetailRow>
        </div>
      </section>

      <section className="space-y-3 rounded-sm border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground">Activity history</h2>
        <EmptyState
          icon={Package}
          title="No activity recorded"
          description="Stock movements, edits, dispenses, and audit events will appear here once the backend is connected."
        />
      </section>
    </div>
  );
}
