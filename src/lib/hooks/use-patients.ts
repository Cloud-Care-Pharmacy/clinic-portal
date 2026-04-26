import type {
  PatientMapping,
  PatientsListResponse,
  PatientsListQuery,
  PatientSearchResponse,
  UpdatePatientPayload,
  ClinicalDataListResponse,
  LatestClinicalDataResponse,
  ClinicalDataApprovalResponse,
} from "@/types";
import {
  queryOptions,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

// ---- Fetch helpers ----

async function fetchPatients(entityId: string, opts?: PatientsListQuery) {
  const params = new URLSearchParams();
  params.set("limit", String(opts?.limit ?? 50));
  params.set("offset", String(opts?.offset ?? 0));
  if (opts?.search) params.set("search", opts.search);
  if (opts?.pmsStatus) params.set("pmsStatus", opts.pmsStatus);
  if (opts?.sort) params.set("sort", opts.sort);
  if (opts?.order) params.set("order", opts.order);
  const res = await fetch(
    `/api/proxy/entities/${encodeURIComponent(entityId)}/patients?${params}`
  );
  if (!res.ok) throw new Error("Failed to fetch patients");
  return res.json() as Promise<PatientsListResponse>;
}

async function searchPatients(entityId: string, opts?: { q?: string; limit?: number }) {
  const params = new URLSearchParams({ entityId });
  if (opts?.q) params.set("q", opts.q);
  if (opts?.limit) params.set("limit", String(opts.limit));
  const res = await fetch(`/api/proxy/patients/search?${params}`);
  if (!res.ok) throw new Error("Failed to search patients");
  return res.json() as Promise<PatientSearchResponse>;
}

async function fetchPatient(patientId: string) {
  const res = await fetch(`/api/proxy/patients/${encodeURIComponent(patientId)}`);
  if (!res.ok) throw new Error("Failed to fetch patient");
  return res.json() as Promise<{
    success: boolean;
    data: { patient: PatientMapping };
  }>;
}

async function updatePatient(patientId: string, data: UpdatePatientPayload) {
  const res = await fetch(`/api/proxy/patients/${encodeURIComponent(patientId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to update patient" }));
    throw new Error(err.error ?? "Failed to update patient");
  }
  return res.json() as Promise<{
    success: boolean;
    data: { patient: PatientMapping };
  }>;
}

async function deletePatient(patientId: string) {
  const res = await fetch(`/api/proxy/patients/${encodeURIComponent(patientId)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to delete patient" }));
    throw new Error(err.error ?? "Failed to delete patient");
  }
  return res.json() as Promise<{ deleted: boolean }>;
}

async function fetchClinicalData(patientId: string, limit = 50, offset = 0) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const res = await fetch(
    `/api/proxy/patients/${encodeURIComponent(patientId)}/clinical-data?${params}`
  );
  if (!res.ok) throw new Error("Failed to fetch clinical data");
  return res.json() as Promise<ClinicalDataListResponse>;
}

async function fetchLatestClinicalData(patientId: string) {
  const res = await fetch(
    `/api/proxy/patients/${encodeURIComponent(patientId)}/clinical-data/latest`
  );
  if (!res.ok) throw new Error("Failed to fetch latest clinical data");
  return res.json() as Promise<LatestClinicalDataResponse>;
}

async function approveClinicalRecord(
  patientId: string,
  recordId: string,
  body: { reviewNotes?: string }
): Promise<ClinicalDataApprovalResponse> {
  const res = await fetch(
    `/api/proxy/patients/${encodeURIComponent(patientId)}/clinical-data/${encodeURIComponent(recordId)}/approve`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: "Failed to approve clinical record" }));
    throw new Error(err.error ?? "Failed to approve clinical record");
  }
  return res.json();
}

// ---- Hooks ----

export function patientQueryOptions(patientId: string) {
  return queryOptions({
    queryKey: ["patient", patientId],
    queryFn: () => fetchPatient(patientId),
  });
}

export function clinicalDataQueryOptions(
  patientId: string,
  opts?: { limit?: number; offset?: number }
) {
  return queryOptions({
    queryKey: ["clinical-data", patientId, opts?.limit, opts?.offset],
    queryFn: () => fetchClinicalData(patientId, opts?.limit, opts?.offset),
  });
}

export function latestClinicalDataQueryOptions(patientId: string) {
  return queryOptions({
    queryKey: ["clinical-data-latest", patientId],
    queryFn: () => fetchLatestClinicalData(patientId),
  });
}

export function usePatients(
  entityId: string | undefined,
  opts?: PatientsListQuery,
  initialData?: PatientsListResponse
) {
  return useQuery({
    queryKey: [
      "patients",
      entityId,
      opts?.limit ?? 50,
      opts?.offset ?? 0,
      opts?.search ?? "",
      opts?.pmsStatus ?? "",
      opts?.sort ?? "",
      opts?.order ?? "",
    ],
    queryFn: () => fetchPatients(entityId!, opts),
    enabled: !!entityId,
    initialData,
  });
}

export function usePatientSearch(
  entityId: string | undefined,
  opts?: { q?: string; limit?: number }
) {
  return useQuery({
    queryKey: ["patient-search", entityId, opts?.q ?? "", opts?.limit ?? 20],
    queryFn: () => searchPatients(entityId!, opts),
    enabled: Boolean(entityId),
  });
}

export function usePatient(
  patientId: string | undefined,
  initialData?: { success: boolean; data: { patient: PatientMapping } }
) {
  return useQuery({
    ...patientQueryOptions(patientId ?? ""),
    enabled: !!patientId,
    initialData,
  });
}

export function useUpdatePatient(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePatientPayload) => updatePatient(patientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient", patientId] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patientId: string) => deletePatient(patientId),
    onSuccess: (_data, patientId) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.removeQueries({ queryKey: ["patient", patientId] });
      queryClient.removeQueries({ queryKey: ["patient-counts", patientId] });
      queryClient.removeQueries({ queryKey: ["consultations", patientId] });
    },
  });
}

export function useClinicalData(
  patientId: string | undefined,
  opts?: { limit?: number; offset?: number },
  initialData?: ClinicalDataListResponse
) {
  return useQuery({
    ...clinicalDataQueryOptions(patientId ?? "", opts),
    enabled: !!patientId,
    initialData,
  });
}

export function useLatestClinicalData(
  patientId: string | undefined,
  initialData?: LatestClinicalDataResponse
) {
  return useQuery({
    ...latestClinicalDataQueryOptions(patientId ?? ""),
    enabled: !!patientId,
    initialData,
  });
}

export function useApproveClinicalRecord(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      recordId,
      reviewNotes,
    }: {
      recordId: string;
      reviewNotes?: string;
    }) => approveClinicalRecord(patientId, recordId, { reviewNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinical-data", patientId] });
      queryClient.invalidateQueries({
        queryKey: ["clinical-data-latest", patientId],
      });
      queryClient.invalidateQueries({ queryKey: ["patient-activity", patientId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-recent-activity"] });
    },
  });
}
