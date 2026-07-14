"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { StocktakeTable } from "@/components/stocktakes/StocktakeTable";
import {
  stocktakeStore,
  stocktakeSummary,
  type StocktakeStatus,
} from "@/components/stocktakes/mock-stocktakes";

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "info" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "text-status-danger-fg"
      : tone === "info"
        ? "text-status-info-fg"
        : "text-foreground";
  return (
    <div className="rounded-sm border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}

export function StocktakesClient() {
  const { push } = useRouter();
  const stocktakes = useSyncExternalStore(
    stocktakeStore.subscribe,
    stocktakeStore.getSnapshot,
    stocktakeStore.getServerSnapshot
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState<StocktakeStatus[]>([]);

  const stats = useMemo(() => {
    const inProgress = stocktakes.filter((s) => s.status === "in_progress");
    const completed = stocktakes.filter((s) => s.status === "completed");
    const discrepancies = completed.reduce(
      (sum, s) => sum + stocktakeSummary(s).discrepancyLines,
      0
    );
    return {
      total: stocktakes.length,
      inProgress: inProgress.length,
      completed: completed.length,
      discrepancies,
    };
  }, [stocktakes]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stocktakes"
        description="Reconcile physical stock against the catalog. Completing a stocktake writes counted quantities back to product stock. Mocked locally until the backend ships."
        actions={
          <Link
            href="/stocktakes/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="size-4" aria-hidden="true" />
            New stocktake
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total" value={stats.total} />
        <Stat
          label="In progress"
          value={stats.inProgress}
          tone={stats.inProgress > 0 ? "info" : "default"}
        />
        <Stat label="Completed" value={stats.completed} />
        <Stat
          label="Discrepancies"
          value={stats.discrepancies}
          tone={stats.discrepancies > 0 ? "danger" : "default"}
        />
      </div>

      <ErrorBoundary>
        <StocktakeTable
          stocktakes={stocktakes}
          onAdd={() => push("/stocktakes/new")}
          onRowClick={(s) => push(`/stocktakes/${s.id}`)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilters={statusFilters}
          onStatusFiltersChange={setStatusFilters}
        />
      </ErrorBoundary>
    </div>
  );
}
