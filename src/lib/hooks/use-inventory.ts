import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  InventoryItem,
  InventoryListResponse,
  InventorySummary,
  StockMovement,
  StockMovementType,
} from "@/types/catalog";

/** Extract a human message from the gateway's error envelope. */
async function errorMessage(res: Response, fallback: string): Promise<string> {
  const payload = (await res.json().catch(() => undefined)) as
    | { error?: string | { message?: string }; details?: string }
    | undefined;
  if (payload && typeof payload.error === "object" && payload.error?.message) {
    return payload.error.message;
  }
  if (typeof payload?.error === "string") return payload.error;
  return payload?.details ?? fallback;
}

async function fetchInventory(): Promise<InventoryListResponse> {
  const res = await fetch(`/api/proxy/inventory?limit=500`);
  if (!res.ok) throw new Error(await errorMessage(res, "Failed to load inventory"));
  return res.json();
}

async function fetchInventorySummary(): Promise<{ data: { summary: InventorySummary } }> {
  const res = await fetch(`/api/proxy/inventory/summary`);
  if (!res.ok) throw new Error(await errorMessage(res, "Failed to load inventory summary"));
  return res.json();
}

async function fetchInventoryItem(productId: string): Promise<{ data: { item: InventoryItem } }> {
  const res = await fetch(`/api/proxy/inventory/${encodeURIComponent(productId)}`);
  if (!res.ok) throw new Error(await errorMessage(res, "Failed to load item"));
  return res.json();
}

async function fetchMovements(productId: string): Promise<{ data: { movements: StockMovement[]; total: number } }> {
  const res = await fetch(`/api/proxy/inventory/${encodeURIComponent(productId)}/movements?limit=100`);
  if (!res.ok) throw new Error(await errorMessage(res, "Failed to load movements"));
  return res.json();
}

export interface AdjustStockPayload {
  productId: string;
  quantity: number;
  type?: StockMovementType;
  reason?: string;
  note?: string;
}

async function adjustStock({ productId, ...body }: AdjustStockPayload) {
  const res = await fetch(`/api/proxy/inventory/${encodeURIComponent(productId)}/adjust`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await errorMessage(res, "Failed to adjust stock"));
  return res.json() as Promise<{ data: { item: InventoryItem; movement: StockMovement } }>;
}

export function useInventory() {
  return useQuery({ queryKey: ["inventory"], queryFn: fetchInventory });
}

export function useInventorySummary() {
  return useQuery({ queryKey: ["inventory-summary"], queryFn: fetchInventorySummary });
}

export function useInventoryItem(productId: string | undefined) {
  return useQuery({
    queryKey: ["inventory-item", productId],
    queryFn: () => fetchInventoryItem(productId!),
    enabled: !!productId,
  });
}

export function useStockMovements(productId: string | undefined) {
  return useQuery({
    queryKey: ["inventory-movements", productId],
    queryFn: () => fetchMovements(productId!),
    enabled: !!productId,
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adjustStock,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["inventory-summary"] });
      qc.invalidateQueries({ queryKey: ["inventory-item", variables.productId] });
      qc.invalidateQueries({ queryKey: ["inventory-movements", variables.productId] });
    },
  });
}
