import { queryOptions, useQuery } from "@tanstack/react-query";
import type { PatientActivityResponse } from "@/types";

async function fetchPatientActivity(
  patientId: string,
  limit = 50,
  offset = 0
): Promise<PatientActivityResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const res = await fetch(
    `/api/proxy/patients/${encodeURIComponent(patientId)}/activity?${params}`
  );
  if (!res.ok) throw new Error("Failed to fetch patient activity");
  return (await res.json()) as PatientActivityResponse;
}

export function patientActivityQueryOptions(patientId: string) {
  return queryOptions({
    queryKey: ["patient-activity", patientId],
    queryFn: () => fetchPatientActivity(patientId),
  });
}

export function usePatientActivity(
  patientId: string | undefined,
  initialData?: PatientActivityResponse
) {
  const query = useQuery({
    ...patientActivityQueryOptions(patientId ?? ""),
    enabled: Boolean(patientId),
    initialData,
  });

  return {
    data: query.data,
    events: query.data?.data?.events ?? [],
    isLoading: query.isLoading,
    errors: query.error ? [query.error] : [],
  };
}
