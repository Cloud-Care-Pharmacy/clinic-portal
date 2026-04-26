import { api, ApiError } from "@/lib/api";
import {
  emptyParchmentPrescriptionsResponse,
  normalizePatientPrescriptionsResponse,
} from "@/lib/prescriptions";
import { PrescriptionsTab } from "../components/tabs/PrescriptionsTab";

export default async function PrescriptionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ selected?: string }>;
}) {
  const [{ id }, { selected }] = await Promise.all([params, searchParams]);
  const initialPrescriptions = await api
    .getPatientPrescriptions(id)
    .then((payload) => normalizePatientPrescriptionsResponse(payload, id))
    .catch((error) => {
      if (error instanceof ApiError && error.status === 404) {
        return emptyParchmentPrescriptionsResponse(id);
      }
      return undefined;
    });

  return (
    <PrescriptionsTab
      patientId={id}
      selectedPrescriptionId={selected}
      initialPrescriptions={initialPrescriptions}
    />
  );
}
