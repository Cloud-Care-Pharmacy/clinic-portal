import { useQuery } from "@tanstack/react-query";
import type {
  ActivityEventCategory,
  DashboardIntakeBucket,
  DashboardIntakeOverviewResponse,
  DashboardIntakeRange,
  DashboardPeriod,
  DashboardRecentActivityResponse,
  DashboardSummaryResponse,
} from "@/types";

async function fetchDashboardSummary(
  entityId: string,
  period: DashboardPeriod
): Promise<DashboardSummaryResponse> {
  const params = new URLSearchParams({ entityId, period });
  const res = await fetch(`/api/proxy/dashboard/summary?${params}`);
  if (!res.ok) throw new Error("Failed to fetch dashboard summary");
  return res.json();
}

async function fetchDashboardIntakeOverview(opts?: {
  entityId?: string;
  range?: DashboardIntakeRange;
  from?: string;
  to?: string;
  bucket?: DashboardIntakeBucket;
}): Promise<DashboardIntakeOverviewResponse> {
  const params = new URLSearchParams();
  if (opts?.entityId) params.set("entityId", opts.entityId);
  if (opts?.range) params.set("range", opts.range);
  if (opts?.from) params.set("from", opts.from);
  if (opts?.to) params.set("to", opts.to);
  if (opts?.bucket) params.set("bucket", opts.bucket);
  const qs = params.toString() ? `?${params}` : "";
  const res = await fetch(`/api/proxy/dashboard/intake-overview${qs}`);
  if (!res.ok) throw new Error("Failed to fetch intake overview");
  return res.json();
}

async function fetchDashboardRecentActivity(opts: {
  entityId: string;
  limit?: number;
  category?: ActivityEventCategory;
}): Promise<DashboardRecentActivityResponse> {
  const params = new URLSearchParams({ entityId: opts.entityId });
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.category) params.set("category", opts.category);
  const res = await fetch(`/api/proxy/dashboard/recent-activity?${params}`);
  if (!res.ok) throw new Error("Failed to fetch recent activity");
  return res.json();
}

export function useDashboardSummary(
  entityId: string | undefined,
  period: DashboardPeriod = "30d",
  initialData?: DashboardSummaryResponse
) {
  return useQuery({
    queryKey: ["dashboard-summary", entityId, period],
    queryFn: () => fetchDashboardSummary(entityId!, period),
    enabled: Boolean(entityId),
    initialData,
  });
}

export function useDashboardIntakeOverview(
  opts?: {
    entityId?: string;
    range?: DashboardIntakeRange;
    from?: string;
    to?: string;
    bucket?: DashboardIntakeBucket;
  },
  initialData?: DashboardIntakeOverviewResponse
) {
  return useQuery({
    queryKey: [
      "dashboard-intake-overview",
      opts?.entityId ?? "",
      opts?.range ?? "",
      opts?.from ?? "",
      opts?.to ?? "",
      opts?.bucket ?? "",
    ],
    queryFn: () => fetchDashboardIntakeOverview(opts),
    initialData,
  });
}

export function useDashboardRecentActivity(
  opts: { entityId?: string; limit?: number; category?: ActivityEventCategory },
  initialData?: DashboardRecentActivityResponse
) {
  return useQuery({
    queryKey: [
      "dashboard-recent-activity",
      opts.entityId ?? "",
      opts.limit ?? 5,
      opts.category ?? "",
    ],
    queryFn: () =>
      fetchDashboardRecentActivity({
        entityId: opts.entityId!,
        limit: opts.limit,
        category: opts.category,
      }),
    enabled: Boolean(opts.entityId),
    initialData,
  });
}
