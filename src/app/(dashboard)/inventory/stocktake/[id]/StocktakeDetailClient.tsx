"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Ban, CheckCircle2, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import {
  useCancelStocktake,
  useCompleteStocktake,
  useStocktake,
} from "@/lib/hooks/use-stocktakes";
import type { StocktakeStatus } from "@/types/catalog";

const STATUS_LABELS: Record<StocktakeStatus, string> = {
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

function statusVariant(status: StocktakeStatus) {
  switch (status) {
    case "completed":
      return "success" as const;
    case "in_progress":
      return "info" as const;
    case "cancelled":
      return "neutral" as const;
  }
}

function SummaryStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "danger" | "success";
}) {
  const toneClass =
    tone === "danger"
      ? "text-status-danger-fg"
      : tone === "success"
        ? "text-status-success-fg"
        : "text-foreground";
  return (
    <div className="rounded-sm border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}

export function StocktakeDetailClient({ stocktakeId }: { stocktakeId: string }) {
  const { data, isLoading, error } = useStocktake(stocktakeId);
  const complete = useCompleteStocktake();
  const cancel = useCancelStocktake();

  const stocktake = data?.data.stocktake;
  const editable = stocktake?.status === "in_progress";

  // Local counts keyed by productId, seeded once per stocktake load.
  const [counts, setCounts] = useState<Record<string, string>>({});
  const seededRef = useRef<string | null>(null);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    if (stocktake && seededRef.current !== stocktake.id) {
      const init: Record<string, string> = {};
      for (const line of stocktake.lines) {
        init[line.productId] = line.countedQty != null ? String(line.countedQty) : "";
      }
      setCounts(init);
      seededRef.current = stocktake.id;
    }
  }, [stocktake]);

  const summary = useMemo(() => {
    const lines = stocktake?.lines ?? [];
    let counted = 0;
    let discrepancies = 0;
    let netVariance = 0;
    for (const line of lines) {
      const raw = counts[line.productId];
      if (raw == null || raw.trim() === "") continue;
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 0) continue;
      counted += 1;
      const variance = n - line.expectedQty;
      netVariance += variance;
      if (variance !== 0) discrepancies += 1;
    }
    return { total: lines.length, counted, discrepancies, netVariance };
  }, [stocktake, counts]);

  if (error) {
    return (
      <div className="space-y-6">
        <BackLink />
        <EmptyState
          icon={ClipboardList}
          title="Couldn't load stocktake"
          description={error instanceof Error ? error.message : "Please try again."}
          dashed
        />
      </div>
    );
  }

  if (isLoading || !stocktake) {
    return (
      <div className="space-y-6">
        <BackLink />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  function buildCounts() {
    const out: { productId: string; countedQty: number }[] = [];
    for (const line of stocktake!.lines) {
      const raw = counts[line.productId];
      if (raw == null || raw.trim() === "") continue;
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 0) continue;
      out.push({ productId: line.productId, countedQty: n });
    }
    return out;
  }

  function runComplete() {
    complete.mutate(
      { stocktakeId, counts: buildCounts() },
      {
        onSuccess: () => toast.success(`${stocktake!.displayId} completed — stock reconciled`),
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Failed to complete stocktake"),
      }
    );
  }

  function runCancel() {
    cancel.mutate(
      { stocktakeId },
      {
        onSuccess: () => toast.success("Stocktake cancelled"),
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Failed to cancel stocktake"),
      }
    );
  }

  const uncounted = summary.total - summary.counted;

  return (
    <div className="space-y-6 pb-12">
      <BackLink />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-2xl font-semibold tracking-tight">
              {stocktake.displayId}
            </h1>
            <StatusBadge variant={statusVariant(stocktake.status)} dot>
              {STATUS_LABELS[stocktake.status]}
            </StatusBadge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Started {formatDateTime(stocktake.startedAt)}
            {stocktake.completedAt
              ? ` · Completed ${formatDateTime(stocktake.completedAt)}`
              : ""}
          </p>
        </div>

        {editable && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmCancel(true)}
              disabled={cancel.isPending}
            >
              <Ban className="size-4" aria-hidden="true" />
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => setConfirmComplete(true)}
              disabled={complete.isPending || summary.counted === 0}
            >
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Complete
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryStat label="Counted" value={`${summary.counted}/${summary.total}`} />
        <SummaryStat
          label="Discrepancies"
          value={summary.discrepancies}
          tone={summary.discrepancies > 0 ? "danger" : "default"}
        />
        <SummaryStat
          label="Net variance"
          value={`${summary.netVariance > 0 ? "+" : ""}${summary.netVariance}`}
          tone={
            summary.netVariance === 0
              ? "default"
              : summary.netVariance > 0
                ? "success"
                : "danger"
          }
        />
        <SummaryStat label="Uncounted" value={uncounted} />
      </div>

      <div className="overflow-hidden rounded-sm border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Product</th>
              <th className="w-28 px-4 py-2.5 text-right font-medium">Expected</th>
              <th className="w-32 px-4 py-2.5 text-right font-medium">Counted</th>
              <th className="w-28 px-4 py-2.5 text-right font-medium">Variance</th>
            </tr>
          </thead>
          <tbody>
            {stocktake.lines.map((line) => {
              const raw = counts[line.productId] ?? "";
              const n = raw.trim() === "" ? NaN : Number(raw);
              const valid = Number.isInteger(n) && n >= 0;
              const variance = valid ? n - line.expectedQty : null;
              return (
                <tr key={line.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3">
                    <div className="flex flex-col leading-tight">
                      <span className="font-medium text-foreground">{line.name}</span>
                      {line.sku && (
                        <span className="font-mono text-xs text-muted-foreground">
                          {line.sku}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {line.expectedQty}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editable ? (
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
                            [line.productId]: e.target.value,
                          }))
                        }
                        className="ml-auto h-9 w-24 text-right"
                      />
                    ) : (
                      <span className="tabular-nums">{line.countedQty ?? "—"}</span>
                    )}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right tabular-nums font-medium",
                      variance == null
                        ? "text-muted-foreground"
                        : variance === 0
                          ? "text-foreground"
                          : variance > 0
                            ? "text-status-success-fg"
                            : "text-status-danger-fg"
                    )}
                  >
                    {variance == null ? "—" : `${variance > 0 ? "+" : ""}${variance}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editable ? (
        <p className="text-xs text-muted-foreground">
          Enter the physical count for each line. Completing writes the counted
          quantities back to product stock (as{" "}
          <span className="font-medium">stocktake</span> movements); uncounted
          lines are left unchanged.
        </p>
      ) : null}

      {stocktake.note && (
        <div className="space-y-2 rounded-sm border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Note</h2>
          <p className="whitespace-pre-line text-sm text-muted-foreground">
            {stocktake.note}
          </p>
        </div>
      )}

      <AlertDialog open={confirmComplete} onOpenChange={setConfirmComplete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete stocktake?</AlertDialogTitle>
            <AlertDialogDescription>
              This writes {summary.counted} counted line
              {summary.counted === 1 ? "" : "s"} back to product stock
              {summary.discrepancies > 0
                ? ` (${summary.discrepancies} with a variance)`
                : ""}
              .{uncounted > 0 ? ` ${uncounted} uncounted line${uncounted === 1 ? "" : "s"} will be left unchanged.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmComplete(false);
                runComplete();
              }}
            >
              Complete &amp; reconcile
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel stocktake?</AlertDialogTitle>
            <AlertDialogDescription>
              The stocktake will be marked as cancelled without adjusting any
              stock.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep counting</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setConfirmCancel(false);
                runCancel();
              }}
            >
              Cancel stocktake
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/inventory"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Back to inventory
    </Link>
  );
}
