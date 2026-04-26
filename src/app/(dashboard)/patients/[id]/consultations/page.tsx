import { api } from "@/lib/api";
import { ConsultationsPageClient } from "./ConsultationsPageClient";

export default async function ConsultationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ selected?: string }>;
}) {
  const [{ id }, { selected }] = await Promise.all([params, searchParams]);
  const initialConsultations = await api
    .getPatientConsultations(id, { limit: 50, offset: 0 })
    .catch(() => undefined);

  return (
    <ConsultationsPageClient
      patientId={id}
      selectedConsultationId={selected}
      initialConsultations={initialConsultations}
    />
  );
}
