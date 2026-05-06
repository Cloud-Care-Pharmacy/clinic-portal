import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { AdminClient } from "./AdminClient";

export default async function AdminPage() {
  const { role } = await requireAuth();
  if (role !== "admin") redirect("/dashboard");
  return <AdminClient />;
}
