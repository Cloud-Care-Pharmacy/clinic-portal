import type { PatientCountsResponse } from "@/types";
import { queryOptions, useQuery } from "@tanstack/react-query";

async function fetchPatientCounts(patientId: string): Promise<PatientCountsResponse> {
  const res = await fetch(
    `/api/proxy/patients/${encodeURIComponent(patientId)}/counts`
  );
  if (!res.ok) throw new Error("Failed to fetch patient counts");
  return res.json();
}

export function patientCountsQueryOptions(patientId: string) {
  return queryOptions({
    queryKey: ["patient-counts", patientId],
    queryFn: () => fetchPatientCounts(patientId),
  });
}

export function usePatientCounts(
  patientId: string | undefined,
  initialData?: PatientCountsResponse
) {
  return useQuery({
    ...patientCountsQueryOptions(patientId ?? ""),
    enabled: Boolean(patientId),
    initialData,
  });
}
