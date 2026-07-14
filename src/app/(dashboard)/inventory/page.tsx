import { requireAuth } from "@/lib/auth";
import { InventoryClient } from "./InventoryClient";

export default async function InventoryPage() {
  await requireAuth();
  return <InventoryClient />;
}
