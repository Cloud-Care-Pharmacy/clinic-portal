import { requireAuth } from "@/lib/auth";
import { StocktakeDetailClient } from "./StocktakeDetailClient";

export default async function StocktakeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;
  return <StocktakeDetailClient stocktakeId={id} />;
}
