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
} from "@/types";

// ---- Fetch helpers ----

async function fetchConsultations(
  patientId?: string
): Promise<ConsultationsListResponse> {
  const url = patientId
    ? `/api/proxy/patients/${encodeURIComponent(patientId)}/consultations?limit=50`
    : "/api/consultations";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch consultations");
  return res.json();
}

async function fetchConsultation(id: string): Promise<ConsultationResponse> {
  const res = await fetch(`/api/proxy/consultations/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error("Failed to fetch consultation");
  return res.json();
}

async function createConsultationApi(body: {
  patientId: string;
  patientName: string;
  doctorId?: string;
  doctorName: string;
  scheduledAt: string;
  type: ConsultationType;
  duration?: number;
  notes?: string;
}): Promise<ConsultationResponse> {
  const res = await fetch("/api/proxy/consultations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: "Failed to create consultation" }));
    throw new Error(err.error ?? "Failed to create consultation");
  }
  return res.json();
}

async function updateConsultationApi(
  id: string,
  body: {
    status?: ConsultationStatus;
    outcome?: string | null;
    notes?: string | null;
    completedAt?: string | null;
    scheduledAt?: string;
    duration?: number | null;
    type?: ConsultationType;
    doctorId?: string;
    doctorName?: string;
  }
): Promise<ConsultationResponse> {
  const res = await fetch(`/api/proxy/consultations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: "Failed to update consultation" }));
    throw new Error(err.error ?? "Failed to update consultation");
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

// ---- Hooks ----

export function consultationsQueryOptions(patientId?: string) {
  return queryOptions({
    queryKey: patientId ? ["consultations", patientId] : ["consultations"],
    queryFn: () => fetchConsultations(patientId),
  });
}

export function useConsultations(
  patientId?: string,
  initialData?: ConsultationsListResponse
) {
  return useQuery({
    ...consultationsQueryOptions(patientId),
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
    mutationFn: (body: {
      patientId: string;
      patientName: string;
      doctorId?: string;
      doctorName: string;
      scheduledAt: string;
      type: ConsultationType;
      duration?: number;
      notes?: string;
    }) => createConsultationApi(body),
    onSuccess: (res) => {
      const patientId = res.data.consultation.patientId;
      queryClient.invalidateQueries({ queryKey: ["consultations"], exact: true });
      queryClient.invalidateQueries({ queryKey: ["consultations", patientId] });
      queryClient.invalidateQueries({ queryKey: ["patient-counts", patientId] });
      queryClient.invalidateQueries({ queryKey: ["patient-activity", patientId] });
    },
  });
}

export function useUpdateConsultation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      status?: ConsultationStatus;
      outcome?: string | null;
      notes?: string | null;
      completedAt?: string | null;
      scheduledAt?: string;
      duration?: number | null;
      type?: ConsultationType;
      doctorId?: string;
      doctorName?: string;
    }) => updateConsultationApi(id, body),
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: ["consultation", res.data.consultation.id],
      });
      const patientId = res.data.consultation.patientId;
      queryClient.invalidateQueries({ queryKey: ["consultations"], exact: true });
      queryClient.invalidateQueries({ queryKey: ["consultations", patientId] });
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
      queryClient.invalidateQueries({ queryKey: ["patient-counts"] });
      queryClient.invalidateQueries({ queryKey: ["patient-activity"] });
    },
  });
}
