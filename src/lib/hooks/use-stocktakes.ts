import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  CompleteStocktakePayload,
  CreateStocktakePayload,
  StocktakeDetail,
  StocktakesListResponse,
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

async function fetchStocktakes(): Promise<StocktakesListResponse> {
  const res = await fetch(`/api/proxy/stocktakes?limit=200`);
  if (!res.ok) throw new Error(await errorMessage(res, "Failed to load stocktakes"));
  return res.json();
}

async function fetchStocktake(
  stocktakeId: string
): Promise<{ data: { stocktake: StocktakeDetail } }> {
  const res = await fetch(`/api/proxy/stocktakes/${encodeURIComponent(stocktakeId)}`);
  if (!res.ok) throw new Error(await errorMessage(res, "Failed to load stocktake"));
  return res.json();
}

async function createStocktake(
  body: CreateStocktakePayload
): Promise<{ data: { stocktake: StocktakeDetail } }> {
  const res = await fetch(`/api/proxy/stocktakes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await errorMessage(res, "Failed to start stocktake"));
  return res.json();
}

async function completeStocktake({
  stocktakeId,
  ...body
}: CompleteStocktakePayload & { stocktakeId: string }): Promise<{
  data: { stocktake: StocktakeDetail };
}> {
  const res = await fetch(
    `/api/proxy/stocktakes/${encodeURIComponent(stocktakeId)}/complete`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) throw new Error(await errorMessage(res, "Failed to complete stocktake"));
  return res.json();
}

async function cancelStocktake({
  stocktakeId,
  reason,
}: {
  stocktakeId: string;
  reason?: string;
}): Promise<{ data: { stocktake: StocktakeDetail } }> {
  const res = await fetch(
    `/api/proxy/stocktakes/${encodeURIComponent(stocktakeId)}/cancel`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }
  );
  if (!res.ok) throw new Error(await errorMessage(res, "Failed to cancel stocktake"));
  return res.json();
}

export function useStocktakes() {
  return useQuery({ queryKey: ["stocktakes"], queryFn: fetchStocktakes });
}

export function useStocktake(stocktakeId: string | undefined) {
  return useQuery({
    queryKey: ["stocktake", stocktakeId],
    queryFn: () => fetchStocktake(stocktakeId!),
    enabled: !!stocktakeId,
  });
}

export function useCreateStocktake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createStocktake,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stocktakes"] });
    },
  });
}

/** Completing a stocktake reconciles product stock — invalidate inventory too. */
function invalidateAfterReconcile(
  qc: ReturnType<typeof useQueryClient>,
  stocktakeId: string
) {
  qc.invalidateQueries({ queryKey: ["stocktakes"] });
  qc.invalidateQueries({ queryKey: ["stocktake", stocktakeId] });
  qc.invalidateQueries({ queryKey: ["inventory"] });
  qc.invalidateQueries({ queryKey: ["inventory-summary"] });
}

export function useCompleteStocktake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: completeStocktake,
    onSuccess: (_d, vars) => invalidateAfterReconcile(qc, vars.stocktakeId),
  });
}

export function useCancelStocktake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cancelStocktake,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["stocktakes"] });
      qc.invalidateQueries({ queryKey: ["stocktake", vars.stocktakeId] });
    },
  });
}
