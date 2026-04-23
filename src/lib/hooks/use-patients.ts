import type { PatientMapping } from "@/types";
import { useQuery } from "@tanstack/react-query";

async function fetchPatients(entityId: string, limit = 50, offset = 0) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const res = await fetch(
    `/api/proxy/entities/${encodeURIComponent(entityId)}/patients?${params}`
  );
  if (!res.ok) throw new Error("Failed to fetch patients");
  return res.json() as Promise<{
    success: boolean;
    data: {
      entityId: string;
      patients: PatientMapping[];
      pagination: { limit: number; offset: number; total: number };
    };
  }>;
}

export function usePatients(
  entityId: string | undefined,
  opts?: { limit?: number; offset?: number }
) {
  return useQuery({
    queryKey: ["patients", entityId, opts?.limit, opts?.offset],
    queryFn: () => fetchPatients(entityId!, opts?.limit, opts?.offset),
    enabled: !!entityId,
  });
}
