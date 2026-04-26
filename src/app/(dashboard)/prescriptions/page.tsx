import { api, ApiError } from "@/lib/api";
import {
  emptyParchmentPrescriptionsResponse,
  normalizePatientPrescriptionsResponse,
} from "@/lib/prescriptions";
import { PrescriptionsClient } from "./PrescriptionsClient";

const ENTITY_ID = process.env.NEXT_PUBLIC_DEFAULT_ENTITY_ID ?? "";

export default async function PrescriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string }>;
}) {
  const { patientId } = await searchParams;
  const [initialPatients, initialPrescriptions] = await Promise.all([
    ENTITY_ID
      ? api.getPatients(ENTITY_ID, { limit: 50, offset: 0 }).catch(() => undefined)
      : Promise.resolve(undefined),
    patientId
      ? api
          .getPatientPrescriptions(patientId)
          .then((payload) => normalizePatientPrescriptionsResponse(payload, patientId))
          .catch((error) => {
            if (error instanceof ApiError && error.status === 404) {
              return emptyParchmentPrescriptionsResponse(patientId);
            }
            return undefined;
          })
      : Promise.resolve(undefined),
  ]);

  return (
    <PrescriptionsClient
      entityId={ENTITY_ID}
      selectedPatientId={patientId ?? ""}
      initialPatients={initialPatients}
      initialPrescriptions={initialPrescriptions}
    />
  );
}
