import { api, ApiError } from "@/lib/api";
import { getEntityId } from "@/lib/auth";
import { emptyListPrescriptionsResponse } from "@/lib/prescriptions";
import { PrescriptionsClient } from "./PrescriptionsClient";

export default async function PrescriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string }>;
}) {
  const { patientId } = await searchParams;
  const entityId = await getEntityId();
  const [initialPatients, initialPrescriptions] = await Promise.all([
    entityId
      ? api.getPatients(entityId, { limit: 50, offset: 0 }).catch(() => undefined)
      : Promise.resolve(undefined),
    patientId
      ? api.getPatientPrescriptions(patientId).catch((error) => {
          if (error instanceof ApiError && error.status === 404) {
            return emptyListPrescriptionsResponse(patientId);
          }
          return undefined;
        })
      : Promise.resolve(undefined),
  ]);

  return (
    <PrescriptionsClient
      entityId={entityId}
      selectedPatientId={patientId ?? ""}
      initialPatients={initialPatients}
      initialPrescriptions={initialPrescriptions}
    />
  );
}
