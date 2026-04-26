import { ClinicalHistoryTab } from "../components/tabs/ClinicalHistoryTab";

export default async function ClinicalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ selected?: string; action?: string }>;
}) {
  const [{ id }, { selected, action }] = await Promise.all([params, searchParams]);

  return (
    <ClinicalHistoryTab
      patientId={id}
      selectedClinicalId={selected}
      reviewMode={action === "review"}
    />
  );
}
