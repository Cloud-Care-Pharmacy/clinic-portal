import { ActivityTab } from "../components/tabs/ActivityTab";

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ActivityTab patientId={id} />;
}
