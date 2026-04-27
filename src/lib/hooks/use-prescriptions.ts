import type {
  EntityPrescriptionSummaryResponse,
  GetPrescriptionResponse,
  ListPrescriptionsResponse,
  SyncPrescriptionsResponse,
} from "@/types";
import { emptyListPrescriptionsResponse } from "@/lib/prescriptions";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

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

interface ListPrescriptionsOpts {
  status?: string;
  limit?: number;
  offset?: number;
  refresh?: boolean;
}

function buildPrescriptionsUrl(patientId: string, opts: ListPrescriptionsOpts) {
  const params = new URLSearchParams();
  if (opts.status) params.set("status", opts.status);
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.offset) params.set("offset", String(opts.offset));
  if (opts.refresh) params.set("refresh", "true");
  const qs = params.toString() ? `?${params.toString()}` : "";
  return `/api/proxy/patients/${encodeURIComponent(patientId)}/prescriptions${qs}`;
}

async function fetchPrescriptions(patientId: string, opts: ListPrescriptionsOpts = {}) {
  const res = await fetch(buildPrescriptionsUrl(patientId, opts));
  if (res.status === 404) {
    return emptyListPrescriptionsResponse(patientId);
  }
  if (!res.ok) throw new Error("Failed to fetch prescriptions");
  return (await res.json()) as ListPrescriptionsResponse;
}

async function fetchPrescription(patientId: string, prescriptionId: string) {
  const res = await fetch(
    `/api/proxy/patients/${encodeURIComponent(patientId)}/prescriptions/${encodeURIComponent(prescriptionId)}`
  );
  if (!res.ok) throw new Error("Failed to fetch prescription");
  return (await res.json()) as GetPrescriptionResponse;
}

async function syncPrescriptions(patientId: string) {
  const res = await fetch(
    `/api/proxy/patients/${encodeURIComponent(patientId)}/prescriptions/sync`,
    { method: "POST" }
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({ error: "Sync failed" }));
    const message =
      (payload as { error?: string }).error ??
      (res.status === 400
        ? "Patient is not linked to Parchment yet."
        : "Failed to sync prescriptions from Parchment.");
    throw new Error(message);
  }
  return (await res.json()) as SyncPrescriptionsResponse;
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
  initialData?: ListPrescriptionsResponse
) {
  return useQuery({
    ...prescriptionsQueryOptions(patientId ?? ""),
    enabled: !!patientId,
    initialData,
  });
}

export function usePrescription(
  patientId: string | undefined,
  prescriptionId: string | undefined
) {
  return useQuery({
    queryKey: ["prescription", patientId, prescriptionId],
    queryFn: () => fetchPrescription(patientId!, prescriptionId!),
    enabled: !!patientId && !!prescriptionId,
  });
}

export function useSyncPrescriptions(patientId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => {
      if (!patientId) throw new Error("Missing patient ID");
      return syncPrescriptions(patientId);
    },
    onSuccess: () => {
      if (patientId) {
        queryClient.invalidateQueries({ queryKey: ["prescriptions", patientId] });
      }
    },
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
