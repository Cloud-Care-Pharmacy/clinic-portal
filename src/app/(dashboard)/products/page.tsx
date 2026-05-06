import { requireAuth } from "@/lib/auth";
import { ProductsClient } from "./ProductsClient";

export default async function ProductsPage() {
  await requireAuth();
  return <ProductsClient />;
}
