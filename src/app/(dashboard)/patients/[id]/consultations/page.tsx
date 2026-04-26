import { ConsultationsPageClient } from "./ConsultationsPageClient";

export default async function ConsultationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ selected?: string }>;
}) {
  const [{ id }, { selected }] = await Promise.all([params, searchParams]);

  return <ConsultationsPageClient patientId={id} selectedConsultationId={selected} />;
}
