import { api } from "@/lib/api";
import { DocumentsTab } from "@/components/patients/DocumentsTab";

export default async function DocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ action?: string; selected?: string }>;
}) {
  const initialDocumentsP = params.then(({ id }) =>
    api.getPatientDocuments(id).catch(() => undefined)
  );
  const [{ id }, { action, selected }, initialDocuments] = await Promise.all([
    params,
    searchParams,
    initialDocumentsP,
  ]);

  return (
    <DocumentsTab
      patientId={id}
      initialAction={action === "upload" ? "upload" : undefined}
      selectedDocumentId={selected}
      initialDocuments={initialDocuments}
    />
  );
}
