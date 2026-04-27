import type {
  EntityPrescriptionSummaryResponse,
  ParchmentPrescriptionsResponse,
  PatientPrescriptionsApiResponse,
} from "@/types";
import {
  emptyParchmentPrescriptionsResponse,
  normalizePatientPrescriptionsResponse,
} from "@/lib/prescriptions";
import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";

export interface ParchmentPrescriptionLinkResponse {
  success: boolean;
  data: {
    patientId: string;
    parchmentPatientId: string;
    created: boolean;
  };
}

const PARCHMENT_PATIENT_URL_BASE = "https://portal.parchment.health/dashboard/patients";

export function buildParchmentPatientUrl(parchmentPatientId: string): string {
  return `${PARCHMENT_PATIENT_URL_BASE}/${encodeURIComponent(parchmentPatientId)}`;
}

async function createParchmentPrescriptionLink(patientId: string) {
  const res = await fetch(`/api/proxy/parchment/patients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patientId }),
  });
  const payload = await res
    .json()
    .catch(() => ({ error: "Failed to create Parchment patient" }));
  if (!res.ok) {
    const message =
      (payload as { error?: string }).error ??
      (res.status === 400
        ? "Patient is missing required details for Parchment (name, DOB, gender, address, mobile)."
        : res.status === 404
          ? "Patient not found."
          : "Failed to create Parchment patient");
    throw new Error(message);
  }
  return payload as ParchmentPrescriptionLinkResponse;
}

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

export function useCreateParchmentPrescriptionLink() {
  return useMutation({
    mutationFn: (patientId: string) => createParchmentPrescriptionLink(patientId),
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
