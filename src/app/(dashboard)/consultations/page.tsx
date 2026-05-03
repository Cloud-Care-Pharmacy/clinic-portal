import { api } from "@/lib/api";
import { getEntityId } from "@/lib/auth";
import { ConsultationsClient } from "./ConsultationsClient";

export default async function ConsultationsPage() {
  const [entityId, initialConsultations] = await Promise.all([
    getEntityId(),
    api
      .getConsultations({ limit: 25, offset: 0, sort: "scheduledAt", order: "desc" })
      .catch(() => undefined),
  ]);

  return (
    <ConsultationsClient
      entityId={entityId}
      initialConsultations={initialConsultations}
    />
  );
}
