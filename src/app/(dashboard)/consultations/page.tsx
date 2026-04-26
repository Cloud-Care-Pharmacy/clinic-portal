import { api } from "@/lib/api";
import { ConsultationsClient } from "./ConsultationsClient";

const ENTITY_ID = process.env.NEXT_PUBLIC_DEFAULT_ENTITY_ID ?? "";

export default async function ConsultationsPage() {
  const initialConsultations = await api
    .getConsultations({ limit: 50, offset: 0 })
    .catch(() => undefined);

  return (
    <ConsultationsClient
      entityId={ENTITY_ID}
      initialConsultations={initialConsultations}
    />
  );
}
