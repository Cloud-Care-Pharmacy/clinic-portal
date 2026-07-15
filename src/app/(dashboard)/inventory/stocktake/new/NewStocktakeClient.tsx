"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Boxes, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/shared/PageHeader";
import { SegmentedControl } from "@/components/shared/SegmentedControl";
import { EmptyState } from "@/components/shared/EmptyState";
import { matchesSearchQuery } from "@/lib/table-search";
import { useInventory } from "@/lib/hooks/use-inventory";
import { useCreateStocktake } from "@/lib/hooks/use-stocktakes";

type Scope = "all" | "selected";

export function NewStocktakeClient() {
  const { push } = useRouter();
  const create = useCreateStocktake();
  const { data, isLoading } = useInventory();
  const items = useMemo(() => data?.data.items ?? [], [data]);

  const [scope, setScope] = useState<Scope>("all");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const visible = useMemo(
    () =>
      items.filter((i) =>
        matchesSearchQuery(search, [i.name, i.sku, i.supplierName ?? ""])
      ),
    [items, search]
  );

  function toggle(productId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  function start() {
    if (scope === "selected" && selected.size === 0) {
      toast.error("Select at least one product to count.");
      return;
    }
    create.mutate(
      {
        note: note.trim() || undefined,
        productIds: scope === "selected" ? [...selected] : undefined,
      },
      {
        onSuccess: (res) => {
          toast.success(`Started ${res.data.stocktake.displayId}`);
          push(`/inventory/stocktake/${res.data.stocktake.id}`);
        },
        onError: (e) =>
          toast.error(
            e instanceof Error ? e.message : "Failed to start stocktake"
          ),
      }
    );
  }

  const startLabel =
    scope === "selected"
      ? `Start count (${selected.size})`
      : "Start count (all)";

  return (
    <div className="space-y-6 pb-12">
      <Link
        href="/inventory"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to inventory
      </Link>

      <PageHeader
        title="New stocktake"
        description="Open a count session. The system snapshots expected quantities now; you record the physical counts on the next screen and reconcile stock when you complete."
      />

      <div className="space-y-5 rounded-sm border border-border bg-card p-6">
        <div className="space-y-2">
          <Label>Scope</Label>
          <SegmentedControl<Scope>
            value={scope}
            onChange={setScope}
            size="md"
            options={[
              { value: "all", label: "All stocked items" },
              { value: "selected", label: "Choose items" },
            ]}
          />
          <p className="text-xs text-muted-foreground">
            {scope === "all"
              ? "Every product with a stock level will be added to the count sheet."
              : "Only the products you tick below will be counted."}
          </p>
        </div>

        {scope === "selected" && (
          <div className="space-y-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search products…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-8"
              />
            </div>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading catalog…</p>
            ) : visible.length === 0 ? (
              <EmptyState
                icon={Boxes}
                title="No products found"
                description="Adjust your search to find products to count."
                dashed
              />
            ) : (
              <div className="max-h-80 overflow-y-auto rounded-sm border border-border">
                {visible.map((item) => (
                  <label
                    key={item.productId}
                    className="flex cursor-pointer items-center gap-3 border-b border-border px-3 py-2 last:border-b-0 hover:bg-accent/50"
                  >
                    <Checkbox
                      checked={selected.has(item.productId)}
                      onCheckedChange={() => toggle(item.productId)}
                    />
                    <span className="flex min-w-0 flex-1 flex-col leading-tight">
                      <span className="truncate text-sm font-medium text-foreground">
                        {item.name}
                      </span>
                      <span className="truncate font-mono text-xs text-muted-foreground">
                        {item.sku} · {item.onHand} on hand
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="stocktake-note">Note</Label>
          <Textarea
            id="stocktake-note"
            placeholder="Context for this count — location, reason, anything unusual."
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => push("/inventory")}>
          Cancel
        </Button>
        <Button type="button" onClick={start} disabled={create.isPending}>
          {create.isPending ? "Starting…" : startLabel}
        </Button>
      </div>
    </div>
  );
}
