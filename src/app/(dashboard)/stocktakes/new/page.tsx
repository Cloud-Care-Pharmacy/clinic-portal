import { requireAuth } from "@/lib/auth";
import { NewStocktakeClient } from "./NewStocktakeClient";

export default async function NewStocktakePage() {
  await requireAuth();
  return <NewStocktakeClient />;
}
