import { requireAuth } from "@/lib/auth";
import { StocktakesClient } from "./StocktakesClient";

export default async function StocktakesPage() {
  await requireAuth();
  return <StocktakesClient />;
}
