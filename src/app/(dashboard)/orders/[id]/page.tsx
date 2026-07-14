import { requireAuth } from "@/lib/auth";
import { OrderDetailClient } from "./OrderDetailClient";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;
  return <OrderDetailClient orderId={id} />;
}
