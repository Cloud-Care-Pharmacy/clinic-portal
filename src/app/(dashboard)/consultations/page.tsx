import { api } from "@/lib/api";
import { ConsultationsClient } from "./ConsultationsClient";

export default async function ConsultationsPage() {
  const initialConsultations = await api
    .getConsultations({ limit: 50, offset: 0 })
    .catch(() => undefined);

  return <ConsultationsClient initialConsultations={initialConsultations} />;
}
