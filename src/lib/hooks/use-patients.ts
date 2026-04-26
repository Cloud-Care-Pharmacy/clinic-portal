import type {
  PatientMapping,
  UpdatePatientPayload,
  ClinicalDataListResponse,
  LatestClinicalDataResponse,
} from "@/types";
import {
  queryOptions,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

// ---- Fetch helpers ----

async function fetchPatients(entityId: string, limit = 50, offset = 0) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const res = await fetch(
    `/api/proxy/entities/${encodeURIComponent(entityId)}/patients?${params}`
  );
  if (!res.ok) throw new Error("Failed to fetch patients");
  return res.json() as Promise<{
    success: boolean;
    data: {
      entityId: string;
      patients: PatientMapping[];
      pagination: { limit: number; offset: number; total: number };
    };
  }>;
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
  opts?: { limit?: number; offset?: number }
) {
  return useQuery({
    queryKey: ["patients", entityId, opts?.limit, opts?.offset],
    queryFn: () => fetchPatients(entityId!, opts?.limit, opts?.offset),
    enabled: !!entityId,
  });
}

export function usePatient(patientId: string | undefined) {
  return useQuery({
    ...patientQueryOptions(patientId ?? ""),
    enabled: !!patientId,
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

export function useClinicalData(
  patientId: string | undefined,
  opts?: { limit?: number; offset?: number }
) {
  return useQuery({
    ...clinicalDataQueryOptions(patientId ?? "", opts),
    enabled: !!patientId,
  });
}

export function useLatestClinicalData(patientId: string | undefined) {
  return useQuery({
    ...latestClinicalDataQueryOptions(patientId ?? ""),
    enabled: !!patientId,
  });
}
