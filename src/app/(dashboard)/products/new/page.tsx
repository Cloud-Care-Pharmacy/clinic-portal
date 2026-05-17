import { requireAuth } from "@/lib/auth";
import { NewProductClient } from "./NewProductClient";

export default async function NewProductPage() {
  await requireAuth();
  return <NewProductClient />;
}
