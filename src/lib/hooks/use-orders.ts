import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  OrderDetail,
  OrdersListResponse,
  OrdersSummary,
} from "@/types/catalog";

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

async function fetchOrders(): Promise<OrdersListResponse> {
  const res = await fetch(`/api/proxy/orders?limit=500`);
  if (!res.ok) throw new Error(await errorMessage(res, "Failed to load orders"));
  return res.json();
}

async function fetchOrdersSummary(): Promise<{ data: { summary: OrdersSummary } }> {
  const res = await fetch(`/api/proxy/orders/summary`);
  if (!res.ok) throw new Error(await errorMessage(res, "Failed to load orders summary"));
  return res.json();
}

async function fetchOrder(orderId: string): Promise<{ data: { order: OrderDetail } }> {
  const res = await fetch(`/api/proxy/orders/${encodeURIComponent(orderId)}`);
  if (!res.ok) throw new Error(await errorMessage(res, "Failed to load order"));
  return res.json();
}

async function advanceOrder(orderId: string): Promise<{ data: { order: OrderDetail } }> {
  const res = await fetch(`/api/proxy/orders/${encodeURIComponent(orderId)}/advance`, { method: "POST" });
  if (!res.ok) throw new Error(await errorMessage(res, "Failed to advance order"));
  return res.json();
}

async function cancelOrder({ orderId, reason }: { orderId: string; reason?: string }) {
  const res = await fetch(`/api/proxy/orders/${encodeURIComponent(orderId)}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, "Failed to cancel order"));
  return res.json() as Promise<{ data: { order: OrderDetail } }>;
}

export interface RecordPaymentPayload {
  orderId: string;
  amountCents: number;
  method?: string;
  kind?: "payment" | "refund";
  reference?: string;
}

async function recordPayment({ orderId, ...body }: RecordPaymentPayload) {
  const res = await fetch(`/api/proxy/orders/${encodeURIComponent(orderId)}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await errorMessage(res, "Failed to record payment"));
  return res.json() as Promise<{ data: { order: OrderDetail } }>;
}

export function useOrders() {
  return useQuery({ queryKey: ["orders"], queryFn: fetchOrders });
}

export function useOrdersSummary() {
  return useQuery({ queryKey: ["orders-summary"], queryFn: fetchOrdersSummary });
}

export function useOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: ["order", orderId],
    queryFn: () => fetchOrder(orderId!),
    enabled: !!orderId,
  });
}

function invalidateOrder(qc: ReturnType<typeof useQueryClient>, orderId: string) {
  qc.invalidateQueries({ queryKey: ["orders"] });
  qc.invalidateQueries({ queryKey: ["orders-summary"] });
  qc.invalidateQueries({ queryKey: ["order", orderId] });
}

export function useAdvanceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: advanceOrder,
    onSuccess: (_d, orderId) => invalidateOrder(qc, orderId),
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cancelOrder,
    onSuccess: (_d, vars) => invalidateOrder(qc, vars.orderId),
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: recordPayment,
    onSuccess: (_d, vars) => invalidateOrder(qc, vars.orderId),
  });
}
