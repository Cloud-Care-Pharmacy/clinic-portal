import { api } from "@/lib/api";
import { ClinicalHistoryTab } from "../components/tabs/ClinicalHistoryTab";

export default async function ClinicalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ selected?: string; action?: string }>;
}) {
  const initialClinicalDataP = params.then(({ id }) =>
    api.getClinicalData(id, { limit: 50, offset: 0 }).catch(() => undefined)
  );
  const [{ id }, { selected, action }, initialClinicalData] = await Promise.all([
    params,
    searchParams,
    initialClinicalDataP,
  ]);

  return (
    <ClinicalHistoryTab
      patientId={id}
      selectedClinicalId={selected}
      reviewMode={action === "review"}
      initialClinicalData={initialClinicalData}
    />
  );
}
