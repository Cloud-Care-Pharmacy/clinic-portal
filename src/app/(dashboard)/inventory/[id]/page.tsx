import { requireAuth } from "@/lib/auth";
import { InventoryDetailClient } from "./InventoryDetailClient";

export default async function InventoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;
  return <InventoryDetailClient productId={id} />;
}
