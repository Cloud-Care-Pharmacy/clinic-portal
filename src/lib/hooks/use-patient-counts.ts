import type { PatientCountsResponse } from "@/types";
import { useQuery } from "@tanstack/react-query";

async function fetchPatientCounts(patientId: string): Promise<PatientCountsResponse> {
  const res = await fetch(
    `/api/proxy/patients/${encodeURIComponent(patientId)}/counts`
  );
  if (!res.ok) throw new Error("Failed to fetch patient counts");
  return res.json();
}

export function usePatientCounts(patientId: string | undefined) {
  return useQuery({
    queryKey: ["patient-counts", patientId],
    queryFn: () => fetchPatientCounts(patientId!),
    enabled: Boolean(patientId),
  });
}
