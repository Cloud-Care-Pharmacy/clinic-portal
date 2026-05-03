import { api } from "@/lib/api";
import { getEntityId } from "@/lib/auth";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const entityId = await getEntityId();
  const [initialConsultations, initialSummary, initialIntakeOverview, initialActivity] =
    await Promise.all([
      api.getConsultations({ limit: 50, offset: 0 }).catch(() => undefined),
      entityId
        ? api.getDashboardSummary(entityId, "30d").catch(() => undefined)
        : Promise.resolve(undefined),
      api
        .getDashboardIntakeOverview({
          entityId: entityId || undefined,
          range: "12m",
          bucket: "month",
        })
        .catch(() => undefined),
      entityId
        ? api.getDashboardRecentActivity({ entityId, limit: 5 }).catch(() => undefined)
        : Promise.resolve(undefined),
    ]);

  return (
    <DashboardClient
      entityId={entityId}
      initialConsultations={initialConsultations}
      initialSummary={initialSummary}
      initialIntakeOverview={initialIntakeOverview}
      initialActivity={initialActivity}
    />
  );
}
