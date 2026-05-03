import { api } from "@/lib/api";
import { getEntityId } from "@/lib/auth";
import { PatientsClient } from "./PatientsClient";

export default async function PatientsPage() {
  const entityId = await getEntityId();
  const initialPatients = entityId
    ? await api.getPatients(entityId, { limit: 50, offset: 0 }).catch(() => undefined)
    : undefined;

  return <PatientsClient entityId={entityId} initialPatients={initialPatients} />;
}
