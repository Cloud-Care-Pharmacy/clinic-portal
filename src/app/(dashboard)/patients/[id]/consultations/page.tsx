import { api } from "@/lib/api";
import { ConsultationsPageClient } from "./ConsultationsPageClient";

export default async function ConsultationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ selected?: string }>;
}) {
  const initialConsultationsP = params.then(({ id }) =>
    api.getPatientConsultations(id, { limit: 50, offset: 0 }).catch(() => undefined)
  );
  const [{ id }, { selected }, initialConsultations] = await Promise.all([
    params,
    searchParams,
    initialConsultationsP,
  ]);

  return (
    <ConsultationsPageClient
      patientId={id}
      selectedConsultationId={selected}
      initialConsultations={initialConsultations}
    />
  );
}
