import { EditTemplateClient } from "@/components/templates/EditTemplateClient";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditTemplateClient id={id} />;
}
