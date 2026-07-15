"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  ClipboardCheck,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { cn } from "@/lib/utils";
import {
  STOCKTAKE_STATUS_LABELS,
  lineVariance,
  stocktakeStore,
  stocktakeSummary,
  type StocktakeLine,
} from "@/components/stocktakes/mock-stocktakes";
import { statusVariant } from "@/components/stocktakes/StocktakeTable";

const DATE_FMT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
};

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

interface StocktakeDetailClientProps {
  stocktakeId: string;
}

export function StocktakeDetailClient({
  stocktakeId,
}: StocktakeDetailClientProps) {
  const { push } = useRouter();
  const stocktakes = useSyncExternalStore(
    stocktakeStore.subscribe,
    stocktakeStore.getSnapshot,
    stocktakeStore.getServerSnapshot
  );

  const stocktake = useMemo(
    () => stocktakes.find((s) => s.id === stocktakeId) ?? null,
    [stocktakes, stocktakeId]
  );

  const [confirm, setConfirm] = useState<null | {
    title: string;
    description: string;
    confirmLabel: string;
    destructive?: boolean;
    onConfirm: () => void;
  }>(null);

  if (!stocktake) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/stocktakes"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to stocktakes
          </Link>
        </div>
        <EmptyState
          icon={ClipboardCheck}
          title="Stocktake not found"
          description={`No stocktake with id ${stocktakeId}. It may have been removed.`}
          actionLabel="Back to stocktakes"
          onAction={() => push("/stocktakes")}
        />
      </div>
    );
  }

  const summary = stocktakeSummary(stocktake);
  const editable = stocktake.status === "in_progress";

  function setCount(line: StocktakeLine, raw: string) {
    if (!stocktake) return;
    const trimmed = raw.trim();
    if (trimmed === "") {
      stocktakeStore.setCount(stocktake.id, line.id, null);
      return;
    }
    const n = Number(trimmed);
    if (!Number.isInteger(n) || n < 0) return;
    stocktakeStore.setCount(stocktake.id, line.id, n);
  }

  function complete() {
    if (!stocktake) return;
    const adjustments = stocktakeStore.complete(stocktake.id);
    toast.success(
      adjustments > 0
        ? `${stocktake.reference} completed — ${adjustments} stock level${adjustments === 1 ? "" : "s"} updated`
        : `${stocktake.reference} completed — no adjustments needed`
    );
  }

  const headerActions =
    stocktake.status === "in_progress" ? (
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
            <DropdownMenuItem
              onClick={() =>
                setConfirm({
                  title: "Cancel stocktake?",
                  description:
                    "The stocktake will be marked as cancelled without adjusting any stock.",
                  confirmLabel: "Cancel stocktake",
                  destructive: true,
                  onConfirm: () => {
                    stocktakeStore.setStatus(stocktake.id, "cancelled");
                    toast.success("Stocktake cancelled");
                  },
                })
              }
            >
              <Ban className="size-4 text-status-danger-fg" />
              Cancel stocktake
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          onClick={() =>
            setConfirm({
              title: "Complete stocktake?",
              description: summary.fullyCounted
                ? `This will write ${summary.discrepancyLines} counted adjustment${summary.discrepancyLines === 1 ? "" : "s"} back to product stock.`
                : `${summary.totalLines - summary.countedLines} line(s) are still uncounted and will be skipped. Counted lines will be written back to product stock.`,
              confirmLabel: "Complete & reconcile",
              onConfirm: complete,
            })
          }
          disabled={summary.countedLines === 0}
        >
          <CheckCircle2 className="size-4" aria-hidden="true" />
          Complete
        </Button>
      </div>
    ) : null;

  return (
    <div className="space-y-6 pb-12">
      <div>
        <Link
          href="/stocktakes"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to stocktakes
        </Link>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {stocktake.name}
            </h1>
            <StatusBadge variant={statusVariant(stocktake.status)} dot>
              {STOCKTAKE_STATUS_LABELS[stocktake.status]}
            </StatusBadge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-mono">{stocktake.reference}</span> ·{" "}
            {stocktake.scopeLabel} · {stocktake.countedBy}
          </p>
        </div>
        {headerActions}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryStat
          label="Counted"
          value={`${summary.countedLines}/${summary.totalLines}`}
        />
        <SummaryStat
          label="Discrepancies"
          value={summary.discrepancyLines}
          tone={summary.discrepancyLines > 0 ? "danger" : "default"}
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
        <SummaryStat label="Units off (abs)" value={summary.absVariance} />
      </div>

      <div className="overflow-hidden rounded-sm border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Product</th>
              <th className="w-28 px-4 py-2.5 text-right font-medium">
                Expected
              </th>
              <th className="w-32 px-4 py-2.5 text-right font-medium">Counted</th>
              <th className="w-28 px-4 py-2.5 text-right font-medium">
                Variance
              </th>
            </tr>
          </thead>
          <tbody>
            {stocktake.lines.map((line) => {
              const variance = lineVariance(line);
              return (
                <tr
                  key={line.id}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col leading-tight">
                      <span className="font-medium text-foreground">
                        {line.name}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {line.sku}
                      </span>
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
                        defaultValue={line.countedQty ?? ""}
                        onBlur={(e) => setCount(line, e.target.value)}
                        className="ml-auto h-9 w-24 text-right"
                      />
                    ) : (
                      <span className="tabular-nums">
                        {line.countedQty ?? "—"}
                      </span>
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

      {editable && (
        <p className="text-xs text-muted-foreground">
          Enter the physical count for each line — changes save automatically.
          Completing the stocktake writes counted quantities back to product
          stock.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3 rounded-sm border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Details</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Started
              </span>
              <span>
                {new Date(stocktake.startedAt).toLocaleDateString(
                  "en-AU",
                  DATE_FMT
                )}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Completed
              </span>
              <span>
                {stocktake.completedAt
                  ? new Date(stocktake.completedAt).toLocaleDateString(
                      "en-AU",
                      DATE_FMT
                    )
                  : "—"}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Counted by
              </span>
              <span>{stocktake.countedBy}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Scope
              </span>
              <span>{stocktake.scopeLabel}</span>
            </div>
          </div>
        </section>

        {stocktake.notes && (
          <section className="space-y-2 rounded-sm border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Notes</h2>
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {stocktake.notes}
            </p>
          </section>
        )}
      </div>

      <AlertDialog
        open={confirm != null}
        onOpenChange={(v) => {
          if (!v) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.description}
            </AlertDialogDescription>
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
