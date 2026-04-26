import { api } from "@/lib/api";
import { DocumentsTab } from "@/components/patients/DocumentsTab";

export default async function DocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ action?: string; selected?: string }>;
}) {
  const [{ id }, { action, selected }] = await Promise.all([params, searchParams]);
  const initialDocuments = await api.getPatientDocuments(id).catch(() => undefined);

  return (
    <DocumentsTab
      patientId={id}
      initialAction={action === "upload" ? "upload" : undefined}
      selectedDocumentId={selected}
      initialDocuments={initialDocuments}
    />
  );
}
