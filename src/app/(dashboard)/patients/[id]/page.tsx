import { OverviewTab } from "./components/tabs/OverviewTab";

export default async function PatientOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <OverviewTab patientId={id} />;
}
