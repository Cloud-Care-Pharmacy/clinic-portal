import type {
  ParchmentPrescriptionsResponse,
  PatientPrescriptionsApiResponse,
} from "@/types";
import {
  emptyParchmentPrescriptionsResponse,
  normalizePatientPrescriptionsResponse,
} from "@/lib/prescriptions";
import { queryOptions, useQuery } from "@tanstack/react-query";

async function fetchPrescriptions(patientId: string) {
  const res = await fetch(
    `/api/proxy/patients/${encodeURIComponent(patientId)}/prescriptions`
  );
  if (res.status === 404) {
    return emptyParchmentPrescriptionsResponse(patientId);
  }
  if (!res.ok) throw new Error("Failed to fetch prescriptions");
  const payload = (await res.json()) as PatientPrescriptionsApiResponse;
  return normalizePatientPrescriptionsResponse(payload, patientId);
}

export function prescriptionsQueryOptions(patientId: string) {
  return queryOptions({
    queryKey: ["prescriptions", patientId],
    queryFn: () => fetchPrescriptions(patientId),
  });
}

export function usePrescriptions(
  patientId: string | undefined,
  initialData?: ParchmentPrescriptionsResponse
) {
  return useQuery({
    ...prescriptionsQueryOptions(patientId ?? ""),
    enabled: !!patientId,
    initialData,
  });
}
