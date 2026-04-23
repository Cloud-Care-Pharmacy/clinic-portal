import type { Entity } from "@/types";
import { useQuery } from "@tanstack/react-query";

async function fetchEntities() {
  const res = await fetch("/api/proxy/entities");
  if (!res.ok) throw new Error("Failed to fetch entities");
  return res.json() as Promise<{ success: boolean; data: Entity[] }>;
}

export function useEntities() {
  return useQuery({
    queryKey: ["entities"],
    queryFn: fetchEntities,
  });
}
