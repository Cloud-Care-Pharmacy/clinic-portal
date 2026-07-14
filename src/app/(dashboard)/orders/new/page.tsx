import { requireAuth } from "@/lib/auth";
import { NewOrderClient } from "./NewOrderClient";

export default async function NewOrderPage() {
  await requireAuth();
  return <NewOrderClient />;
}
