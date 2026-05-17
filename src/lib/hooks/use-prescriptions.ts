import type {
  CreateInternalPrescriptionRequest,
  CreateInternalPrescriptionResponse,
  GetPrescriptionResponse,
  ListPrescriptionsResponse,
  PrescriptionSource,
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

interface ListPrescriptionsOpts {
  status?: string;
  source?: PrescriptionSource;
  limit?: number;
  offset?: number;
  refresh?: boolean;
}

function buildPrescriptionsUrl(patientId: string, opts: ListPrescriptionsOpts) {
  const params = new URLSearchParams();
  if (opts.status) params.set("status", opts.status);
  if (opts.source) params.set("source", opts.source);
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

export function prescriptionsQueryOptions(
  patientId: string,
  opts: ListPrescriptionsOpts = {}
) {
  return queryOptions({
    queryKey: ["prescriptions", patientId, opts.source ?? "all", opts.status ?? "all"],
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

/**
 * Error thrown by `useCreateInternalPrescription` so callers can branch on
 * status and on the backend `code` (`VALIDATION_ERROR`, `UNPROCESSABLE_ENTITY`,
 * `FORBIDDEN`, etc.) to drive UI affordances (banner, disable button, …).
 */
export class CreateInternalPrescriptionError extends Error {
  status: number;
  code: string | undefined;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "CreateInternalPrescriptionError";
    this.status = status;
    this.code = code;
  }
  /** True when consultation outcome was "reject" — the clinical-decision gate. */
  get isClinicallyRejected(): boolean {
    return this.status === 422 || this.code === "UNPROCESSABLE_ENTITY";
  }
}

async function createInternalPrescription(
  patientId: string,
  body: CreateInternalPrescriptionRequest
): Promise<CreateInternalPrescriptionResponse> {
  const res = await fetch(
    `/api/proxy/patients/${encodeURIComponent(patientId)}/prescriptions/internal`,
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
          ? "You are not authorised to issue a prescription for this consultation."
          : res.status === 404
            ? "Patient or consultation not found."
            : "Failed to create prescription.");
    throw new CreateInternalPrescriptionError(message, res.status, payload.code);
  }
  return payload as unknown as CreateInternalPrescriptionResponse;
}

export function useCreateInternalPrescription(patientId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<
    CreateInternalPrescriptionResponse,
    CreateInternalPrescriptionError,
    CreateInternalPrescriptionRequest
  >({
    mutationFn: (body) => {
      if (!patientId) throw new Error("Missing patient ID");
      return createInternalPrescription(patientId, body);
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

export function useCreateParchmentPrescriptionLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patientId: string) => createParchmentPrescriptionLink(patientId),
    onSuccess: (_data, patientId) => {
      // A new Parchment link may produce a new prescription on the patient.
      queryClient.invalidateQueries({ queryKey: ["prescriptions", patientId] });
    },
  });
}

