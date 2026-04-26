import { PrescriptionsTab } from "../components/tabs/PrescriptionsTab";

export default async function PrescriptionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ selected?: string }>;
}) {
  const [{ id }, { selected }] = await Promise.all([params, searchParams]);

  return <PrescriptionsTab patientId={id} selectedPrescriptionId={selected} />;
}
