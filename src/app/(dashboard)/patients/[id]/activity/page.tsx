import { api } from "@/lib/api";
import { ActivityTab } from "../components/tabs/ActivityTab";

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const initialActivity = await api
    .getPatientActivity(id, { limit: 50, offset: 0 })
    .catch(() => undefined);

  return <ActivityTab patientId={id} initialActivity={initialActivity} />;
}
