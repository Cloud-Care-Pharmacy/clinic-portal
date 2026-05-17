import { requireAuth } from "@/lib/auth";
import { ProductDetailClient } from "./ProductDetailClient";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;
  return <ProductDetailClient productId={id} />;
}
