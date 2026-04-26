import type {
  EntityPrescriptionSummaryResponse,
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

async function fetchEntityPrescriptionSummary(
  entityId: string,
  opts?: { from?: string; to?: string }
) {
  const params = new URLSearchParams();
  if (opts?.from) params.set("from", opts.from);
  if (opts?.to) params.set("to", opts.to);
  const qs = params.toString() ? `?${params}` : "";
  const res = await fetch(
    `/api/proxy/entities/${encodeURIComponent(entityId)}/prescriptions/summary${qs}`
  );
  if (!res.ok) throw new Error("Failed to fetch prescription summary");
  return res.json() as Promise<EntityPrescriptionSummaryResponse>;
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

export function useEntityPrescriptionSummary(
  entityId: string | undefined,
  opts?: { from?: string; to?: string },
  initialData?: EntityPrescriptionSummaryResponse
) {
  return useQuery({
    queryKey: [
      "entity-prescription-summary",
      entityId,
      opts?.from ?? "",
      opts?.to ?? "",
    ],
    queryFn: () => fetchEntityPrescriptionSummary(entityId!, opts),
    enabled: !!entityId,
    initialData,
  });
}
