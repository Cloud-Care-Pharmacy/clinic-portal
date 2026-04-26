import { api } from "@/lib/api";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const initialConsultations = await api
    .getConsultations({ limit: 50, offset: 0 })
    .catch(() => undefined);

  return <DashboardClient initialConsultations={initialConsultations} />;
}
