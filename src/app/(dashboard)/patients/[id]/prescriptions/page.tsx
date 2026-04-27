import { api, ApiError } from "@/lib/api";
import { emptyListPrescriptionsResponse } from "@/lib/prescriptions";
import { PrescriptionsTab } from "../components/tabs/PrescriptionsTab";

export default async function PrescriptionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ selected?: string }>;
}) {
  const [{ id }, { selected }] = await Promise.all([params, searchParams]);
  const initialPrescriptions = await api.getPatientPrescriptions(id).catch((error) => {
    if (error instanceof ApiError && error.status === 404) {
      return emptyListPrescriptionsResponse(id);
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
