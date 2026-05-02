import {
  queryOptions,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  ConsultationsListResponse,
  ConsultationResponse,
  ConsultationType,
  ConsultationStatus,
  ConsultationsQuery,
  ConsultationConflict,
  ConsultationConflictsResponse,
  ConsultationFacetsResponse,
  ConsultationTypesResponse,
  ConsultationErrorCode,
} from "@/types";

// ---- Error helpers ----

/**
 * Structured error thrown by consultation mutations. The backend uses a
 * nested envelope (`{ error: { code, message, details } }`) for the new
 * 403/409 codes; legacy errors keep the flat shape (`{ error: "…" }`).
 */
export class ConsultationApiError extends Error {
  readonly status: number;
  readonly code?: ConsultationErrorCode | string;
  readonly details?: unknown;

  constructor(opts: {
    status: number;
    message: string;
    code?: ConsultationErrorCode | string;
    details?: unknown;
  }) {
    super(opts.message);
    this.name = "ConsultationApiError";
    this.status = opts.status;
    this.code = opts.code;
    this.details = opts.details;
  }
}

async function parseConsultationError(
  res: Response,
  fallback: string
): Promise<ConsultationApiError> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // ignore — fall through to fallback message
  }
  if (body && typeof body === "object") {
    const err = (body as { error?: unknown }).error;
    if (err && typeof err === "object") {
      const nested = err as {
        code?: string;
        message?: string;
        details?: unknown;
      };
      return new ConsultationApiError({
        status: res.status,
        message: nested.message ?? fallback,
        code: nested.code,
        details: nested.details,
      });
    }
    if (typeof err === "string") {
      const flat = body as { code?: string; details?: unknown };
      return new ConsultationApiError({
        status: res.status,
        message: err,
        code: flat.code,
        details: flat.details,
      });
    }
  }
  return new ConsultationApiError({ status: res.status, message: fallback });
}

// ---- Fetch helpers ----

async function fetchConsultations(
  patientId?: string,
  opts?: Omit<ConsultationsQuery, "patientId">
): Promise<ConsultationsListResponse> {
  const params = new URLSearchParams();
  params.set("limit", String(opts?.limit ?? 50));
  params.set("offset", String(opts?.offset ?? 0));
  if (opts?.status) params.set("status", opts.status);
  if (opts?.type) params.set("type", opts.type);
  if (opts?.doctorId) params.set("doctorId", opts.doctorId);
  if (opts?.from) params.set("from", opts.from);
  if (opts?.to) params.set("to", opts.to);
  if (opts?.search) params.set("search", opts.search);
  if (opts?.sort) params.set("sort", opts.sort);
  if (opts?.order) params.set("order", opts.order);
  const qs = params.toString();
  const url = patientId
    ? `/api/proxy/patients/${encodeURIComponent(patientId)}/consultations?${qs}`
    : `/api/proxy/consultations?${qs}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch consultations");
  return res.json();
}

async function fetchConsultation(id: string): Promise<ConsultationResponse> {
  const res = await fetch(`/api/proxy/consultations/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error("Failed to fetch consultation");
  return res.json();
}

export interface CreateConsultationInput {
  patientId: string;
  scheduledAt: string;
  type: ConsultationType;
  doctorId?: string;
  duration?: number;
  notes?: string | null;
  /** Admin-only: skip server-side conflict check. Ignored for non-admins. */
  force?: boolean;
}

async function createConsultationApi(
  input: CreateConsultationInput
): Promise<ConsultationResponse> {
  const { force, ...body } = input;
  const url = force
    ? "/api/proxy/consultations?force=true"
    : "/api/proxy/consultations";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw await parseConsultationError(res, "Failed to create consultation");
  }
  return res.json();
}

export interface UpdateConsultationInput {
  id: string;
  status?: ConsultationStatus;
  outcome?: string | null;
  notes?: string | null;
  scheduledAt?: string;
  duration?: number | null;
  type?: ConsultationType;
  doctorId?: string;
  /** Admin-only: skip server-side conflict check. Ignored for non-admins. */
  force?: boolean;
}

async function updateConsultationApi(
  input: UpdateConsultationInput
): Promise<ConsultationResponse> {
  const { id, force, ...body } = input;
  const path = `/api/proxy/consultations/${encodeURIComponent(id)}`;
  const url = force ? `${path}?force=true` : path;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw await parseConsultationError(res, "Failed to update consultation");
  }
  return res.json();
}

async function deleteConsultationApi(
  id: string
): Promise<{ success: boolean; data?: { deleted: boolean } }> {
  const res = await fetch(`/api/proxy/consultations/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete consultation");
  return res.json();
}

async function fetchConsultationConflicts(params: {
  doctorId: string;
  scheduledAt: string;
  duration: number;
  excludeId?: string;
}): Promise<ConsultationConflict[]> {
  const qs = new URLSearchParams({
    doctorId: params.doctorId,
    scheduledAt: params.scheduledAt,
    duration: String(params.duration),
  });
  if (params.excludeId) qs.set("excludeId", params.excludeId);
  const res = await fetch(`/api/proxy/consultations/conflicts?${qs.toString()}`);
  if (!res.ok) return [];
  const json = (await res.json()) as ConsultationConflictsResponse;
  return json.data?.conflicts ?? [];
}

async function fetchConsultationFacets(opts?: {
  from?: string;
  to?: string;
}): Promise<ConsultationFacetsResponse> {
  const qs = new URLSearchParams();
  if (opts?.from) qs.set("from", opts.from);
  if (opts?.to) qs.set("to", opts.to);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await fetch(`/api/proxy/consultations/facets${suffix}`);
  if (!res.ok) throw new Error("Failed to fetch consultation facets");
  return res.json();
}

async function fetchConsultationTypes(): Promise<ConsultationTypesResponse> {
  const res = await fetch("/api/proxy/consultation-types");
  if (!res.ok) throw new Error("Failed to fetch consultation types");
  return res.json();
}

// ---- Hooks ----

export function consultationsQueryOptions(
  patientId?: string,
  opts?: Omit<ConsultationsQuery, "patientId">
) {
  return queryOptions({
    queryKey: patientId
      ? [
          "consultations",
          patientId,
          opts?.limit ?? 50,
          opts?.offset ?? 0,
          opts?.status ?? "",
          opts?.type ?? "",
          opts?.doctorId ?? "",
          opts?.from ?? "",
          opts?.to ?? "",
          opts?.search ?? "",
          opts?.sort ?? "",
          opts?.order ?? "",
        ]
      : [
          "consultations",
          opts?.limit ?? 50,
          opts?.offset ?? 0,
          opts?.status ?? "",
          opts?.type ?? "",
          opts?.doctorId ?? "",
          opts?.from ?? "",
          opts?.to ?? "",
          opts?.search ?? "",
          opts?.sort ?? "",
          opts?.order ?? "",
        ],
    queryFn: () => fetchConsultations(patientId, opts),
  });
}

export function useConsultations(
  patientId?: string,
  initialData?: ConsultationsListResponse,
  opts?: Omit<ConsultationsQuery, "patientId">
) {
  return useQuery({
    ...consultationsQueryOptions(patientId, opts),
    enabled: patientId !== "",
    initialData,
  });
}

export function useConsultation(id: string) {
  return useQuery({
    queryKey: ["consultation", id],
    queryFn: () => fetchConsultation(id),
    enabled: Boolean(id),
  });
}

export function useCreateConsultation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateConsultationInput) => createConsultationApi(input),
    onSuccess: (res) => {
      const patientId = res.data.consultation.patientId;
      queryClient.invalidateQueries({ queryKey: ["consultations"] });
      queryClient.invalidateQueries({ queryKey: ["consultation-facets"] });
      queryClient.invalidateQueries({ queryKey: ["patient-counts", patientId] });
      queryClient.invalidateQueries({ queryKey: ["patient-activity", patientId] });
    },
  });
}

export function useUpdateConsultation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateConsultationInput) => updateConsultationApi(input),
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: ["consultation", res.data.consultation.id],
      });
      const patientId = res.data.consultation.patientId;
      queryClient.invalidateQueries({ queryKey: ["consultations"] });
      queryClient.invalidateQueries({ queryKey: ["consultation-facets"] });
      queryClient.invalidateQueries({ queryKey: ["patient-counts", patientId] });
      queryClient.invalidateQueries({ queryKey: ["patient-activity", patientId] });
    },
  });
}

export function useDeleteConsultation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteConsultationApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consultations"] });
      queryClient.invalidateQueries({ queryKey: ["consultation-facets"] });
      queryClient.invalidateQueries({ queryKey: ["patient-counts"] });
      queryClient.invalidateQueries({ queryKey: ["patient-activity"] });
    },
  });
}

/**
 * Live double-booking warning. The same overlap check runs server-side at
 * write time; this is purely for UX feedback.
 */
export function useConsultationConflicts(
  params: {
    doctorId?: string;
    scheduledAt?: string;
    duration?: number;
    excludeId?: string;
  },
  enabled = true
) {
  const ready =
    enabled &&
    Boolean(params.doctorId) &&
    Boolean(params.scheduledAt) &&
    typeof params.duration === "number" &&
    params.duration > 0;
  return useQuery({
    queryKey: [
      "consultation-conflicts",
      params.doctorId ?? "",
      params.scheduledAt ?? "",
      params.duration ?? 0,
      params.excludeId ?? "",
    ],
    queryFn: () =>
      fetchConsultationConflicts({
        doctorId: params.doctorId!,
        scheduledAt: params.scheduledAt!,
        duration: params.duration!,
        excludeId: params.excludeId,
      }),
    enabled: ready,
    staleTime: 10_000,
  });
}

export function useConsultationFacets(opts?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ["consultation-facets", opts?.from ?? "", opts?.to ?? ""],
    queryFn: () => fetchConsultationFacets(opts),
    staleTime: 60_000,
  });
}

export function useConsultationTypes() {
  return useQuery({
    queryKey: ["consultation-types"],
    queryFn: fetchConsultationTypes,
    staleTime: 5 * 60_000,
  });
}
