import type { ParchmentPrescriptionsResponse } from "@/types";
import { useQuery } from "@tanstack/react-query";

async function fetchPrescriptions(patientId: string) {
  const res = await fetch(
    `/api/proxy/parchment/patients/${encodeURIComponent(patientId)}/prescriptions`
  );
  if (res.status === 404) {
    return {
      success: true,
      data: {
        patientId,
        prescriptions: [],
        pagination: { limit: 50, offset: 0, total: 0 },
      },
    } as ParchmentPrescriptionsResponse;
  }
  if (!res.ok) throw new Error("Failed to fetch prescriptions");
  return res.json() as Promise<ParchmentPrescriptionsResponse>;
}

export function usePrescriptions(patientId: string | undefined) {
  return useQuery({
    queryKey: ["prescriptions", patientId],
    queryFn: () => fetchPrescriptions(patientId!),
    enabled: !!patientId,
  });
}
