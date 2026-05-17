import type {
  CreatePrescriptionRequest,
  CreatePrescriptionResponse,
  GetPrescriptionResponse,
  ListPrescriptionsResponse,
} from "@/types";
import { emptyListPrescriptionsResponse } from "@/lib/prescriptions";
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

// ---- Parchment (ERX) redirect ----

export interface ParchmentPrescriptionLinkResponse {
  success: boolean;
  data: {
    patientId: string;
    parchmentPatientId: string;
    created: boolean;
  };
}

const PARCHMENT_PATIENT_URL_BASE = process.env.NEXT_PUBLIC_PARCHMENT_PATIENT_URL_BASE;

export function buildParchmentPatientUrl(parchmentPatientId: string): string {
  if (!PARCHMENT_PATIENT_URL_BASE) {
    throw new Error("Missing NEXT_PUBLIC_PARCHMENT_PATIENT_URL_BASE");
  }
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

export function useCreateParchmentPrescriptionLink() {
  return useMutation({
    mutationFn: (patientId: string) => createParchmentPrescriptionLink(patientId),
  });
}

// ---- Native prescriptions ----

interface ListPrescriptionsOpts {
  status?: string;
  limit?: number;
  offset?: number;
}

function buildPrescriptionsUrl(patientId: string, opts: ListPrescriptionsOpts) {
  const params = new URLSearchParams();
  if (opts.status) params.set("status", opts.status);
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.offset) params.set("offset", String(opts.offset));
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

export function prescriptionsQueryOptions(
  patientId: string,
  opts: ListPrescriptionsOpts = {}
) {
  return queryOptions({
    queryKey: ["prescriptions", patientId, opts.status ?? "all"],
    queryFn: () => fetchPrescriptions(patientId, opts),
  });
}

export function usePrescriptions(
  patientId: string | undefined,
  initialData?: ListPrescriptionsResponse,
  opts: ListPrescriptionsOpts = {}
) {
  return useQuery({
    ...prescriptionsQueryOptions(patientId ?? "", opts),
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

/**
 * Error thrown by `useCreatePrescription` so callers can branch on
 * status and on the backend `code` (`VALIDATION_ERROR`, `UNPROCESSABLE_ENTITY`,
 * `FORBIDDEN`, etc.) to drive UI affordances (banner, disable button, …).
 */
export class CreatePrescriptionError extends Error {
  status: number;
  code: string | undefined;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "CreatePrescriptionError";
    this.status = status;
    this.code = code;
  }
  /** True when consultation outcome was "reject" — the clinical-decision gate. */
  get isClinicallyRejected(): boolean {
    return this.status === 422 || this.code === "UNPROCESSABLE_ENTITY";
  }
}

async function createPrescription(
  patientId: string,
  body: CreatePrescriptionRequest
): Promise<CreatePrescriptionResponse> {
  const res = await fetch(
    `/api/proxy/patients/${encodeURIComponent(patientId)}/prescriptions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  const payload = (await res.json().catch(() => ({}))) as {
    error?: string;
    code?: string;
  };
  if (!res.ok) {
    const message =
      payload.error ??
      (res.status === 422
        ? "This consultation was clinically rejected — no prescription can be issued."
        : res.status === 403
          ? "You are not authorised to issue a prescription for this patient."
          : res.status === 404
            ? "Patient or consultation not found."
            : "Failed to create prescription.");
    throw new CreatePrescriptionError(message, res.status, payload.code);
  }
  return payload as unknown as CreatePrescriptionResponse;
}

export function useCreatePrescription(patientId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<
    CreatePrescriptionResponse,
    CreatePrescriptionError,
    CreatePrescriptionRequest
  >({
    mutationFn: (body) => {
      if (!patientId) throw new Error("Missing patient ID");
      return createPrescription(patientId, body);
    },
    onSuccess: () => {
      if (patientId) {
        queryClient.invalidateQueries({ queryKey: ["prescriptions", patientId] });
        queryClient.invalidateQueries({ queryKey: ["patient-counts", patientId] });
        queryClient.invalidateQueries({ queryKey: ["patient-activity", patientId] });
      }
    },
  });
}
