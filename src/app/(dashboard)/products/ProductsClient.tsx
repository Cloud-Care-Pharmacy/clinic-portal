"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { ProductTable, type QuickFilter } from "@/components/products/ProductTable";
import {
  isExpiringSoon,
  isLowStock,
  productStore,
  type ProductCategory,
  type ProductSchedule,
  type ProductStatus,
} from "@/components/products/mock-products";

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "warning" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "text-status-danger-fg"
      : tone === "warning"
        ? "text-status-warning-fg"
        : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}

export function ProductsClient() {
  const router = useRouter();
  const products = useSyncExternalStore(
    productStore.subscribe,
    productStore.getSnapshot,
    productStore.getServerSnapshot
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilters, setCategoryFilters] = useState<ProductCategory[]>([]);
  const [scheduleFilters, setScheduleFilters] = useState<ProductSchedule[]>([]);
  const [statusFilters, setStatusFilters] = useState<ProductStatus[]>([]);
  const [quickFilters, setQuickFilters] = useState<QuickFilter[]>([]);

  const stats = useMemo(() => {
    const active = products.filter((p) => p.status === "active");
    return {
      total: products.length,
      active: active.length,
      lowStock: active.filter((p) => isLowStock(p)).length,
      expiring: active.filter((p) => isExpiringSoon(p)).length,
      controlled: active.filter((p) => p.schedule === "S8").length,
    };
  }, [products]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Manage the clinic's product catalog — medicines, devices, supplements and accessories. Mocked locally until the backend ships."
        actions={
          <Link
            href="/products/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add product
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Total products" value={stats.total} />
        <Stat label="Active" value={stats.active} />
        <Stat
          label="Low stock"
          value={stats.lowStock}
          tone={stats.lowStock > 0 ? "warning" : "default"}
        />
        <Stat
          label="Expiring < 90 days"
          value={stats.expiring}
          tone={stats.expiring > 0 ? "warning" : "default"}
        />
        <Stat
          label="S8 controlled"
          value={stats.controlled}
          tone={stats.controlled > 0 ? "danger" : "default"}
        />
      </div>

      <ErrorBoundary>
        <ProductTable
          products={products}
          onAdd={() => router.push("/products/new")}
          onRowClick={(product) => router.push(`/products/${product.id}`)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          categoryFilters={categoryFilters}
          onCategoryFiltersChange={setCategoryFilters}
          scheduleFilters={scheduleFilters}
          onScheduleFiltersChange={setScheduleFilters}
          statusFilters={statusFilters}
          onStatusFiltersChange={setStatusFilters}
          quickFilters={quickFilters}
          onQuickFiltersChange={setQuickFilters}
        />
      </ErrorBoundary>
    </div>
  );
}
