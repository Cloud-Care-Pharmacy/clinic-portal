import { requireAuth } from "@/lib/auth";
import { OrdersClient } from "./OrdersClient";

export default async function OrdersPage() {
  await requireAuth();
  return <OrdersClient />;
}
