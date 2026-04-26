import { DocumentsTab } from "@/components/patients/DocumentsTab";

export default async function DocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ action?: string; selected?: string }>;
}) {
  const [{ id }, { action, selected }] = await Promise.all([params, searchParams]);

  return (
    <DocumentsTab
      patientId={id}
      initialAction={action === "upload" ? "upload" : undefined}
      selectedDocumentId={selected}
    />
  );
}
