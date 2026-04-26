import { api } from "@/lib/api";
import { DashboardClient } from "./DashboardClient";

const ENTITY_ID = process.env.NEXT_PUBLIC_DEFAULT_ENTITY_ID ?? "";

export default async function DashboardPage() {
  const [initialConsultations, initialSummary, initialIntakeOverview, initialActivity] =
    await Promise.all([
      api.getConsultations({ limit: 50, offset: 0 }).catch(() => undefined),
      ENTITY_ID
        ? api.getDashboardSummary(ENTITY_ID, "30d").catch(() => undefined)
        : Promise.resolve(undefined),
      api
        .getDashboardIntakeOverview({
          entityId: ENTITY_ID || undefined,
          range: "12m",
          bucket: "month",
        })
        .catch(() => undefined),
      ENTITY_ID
        ? api
            .getDashboardRecentActivity({ entityId: ENTITY_ID, limit: 5 })
            .catch(() => undefined)
        : Promise.resolve(undefined),
    ]);

  return (
    <DashboardClient
      entityId={ENTITY_ID}
      initialConsultations={initialConsultations}
      initialSummary={initialSummary}
      initialIntakeOverview={initialIntakeOverview}
      initialActivity={initialActivity}
    />
  );
}
