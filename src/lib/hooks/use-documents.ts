import type {
  PatientDocumentsListResponse,
  EntityDocumentsListResponse,
  PatientDocumentResponse,
  DocumentCategory,
  DocumentStatus,
  DocumentSource,
  DocumentUpdatePayload,
  DocumentVerifyPayload,
  DocumentSyncResponse,
} from "@/types";
import {
  queryOptions,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

type PatientDocumentsQueryOptions = {
  category?: DocumentCategory;
  status?: DocumentStatus;
  source?: DocumentSource;
  limit?: number;
  offset?: number;
  sort?: "created_at" | "filename" | "category";
  order?: "asc" | "desc";
};

type EntityDocumentsQueryOptions = PatientDocumentsQueryOptions & {
  patientSearch?: string;
  sort?: string;
};

// ---- Fetch helpers ----

async function fetchDocuments(patientId: string, opts?: PatientDocumentsQueryOptions) {
  const params = new URLSearchParams();
  if (opts?.category) params.set("category", opts.category);
  if (opts?.status) params.set("status", opts.status);
  if (opts?.source) params.set("source", opts.source);
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));
  if (opts?.sort) params.set("sort", opts.sort);
  if (opts?.order) params.set("order", opts.order);
  const qs = params.toString() ? `?${params}` : "";
  const res = await fetch(
    `/api/proxy/patients/${encodeURIComponent(patientId)}/documents${qs}`
  );
  if (res.status === 404) {
    return {
      success: true,
      data: {
        patientId,
        documents: [],
        pagination: { limit: opts?.limit ?? 50, offset: opts?.offset ?? 0, total: 0 },
      },
    } as PatientDocumentsListResponse;
  }
  if (!res.ok) throw new Error("Failed to fetch documents");
  return res.json() as Promise<PatientDocumentsListResponse>;
}

async function fetchEntityDocuments(
  entityId: string,
  opts?: EntityDocumentsQueryOptions
) {
  const params = new URLSearchParams();
  if (opts?.patientSearch) params.set("patientSearch", opts.patientSearch);
  if (opts?.category) params.set("category", opts.category);
  if (opts?.status) params.set("status", opts.status);
  if (opts?.source) params.set("source", opts.source);
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));
  if (opts?.sort) params.set("sort", opts.sort);
  if (opts?.order) params.set("order", opts.order);
  const qs = params.toString() ? `?${params}` : "";
  const res = await fetch(
    `/api/proxy/entities/${encodeURIComponent(entityId)}/documents${qs}`
  );
  if (!res.ok) throw new Error("Failed to fetch entity documents");
  return res.json() as Promise<EntityDocumentsListResponse>;
}

async function uploadDocument(
  patientId: string,
  payload: {
    file: File;
    category: DocumentCategory;
    description?: string;
    expiry_date?: string;
    uploaded_by?: string;
  }
) {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("category", payload.category);
  if (payload.description) formData.append("description", payload.description);
  if (payload.expiry_date) formData.append("expiry_date", payload.expiry_date);
  if (payload.uploaded_by) formData.append("uploaded_by", payload.uploaded_by);

  const res = await fetch(
    `/api/proxy/patients/${encodeURIComponent(patientId)}/documents`,
    { method: "POST", body: formData }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(err.error ?? "Upload failed");
  }
  return res.json() as Promise<PatientDocumentResponse>;
}

async function updateDocument(
  patientId: string,
  documentId: string,
  data: DocumentUpdatePayload
) {
  const res = await fetch(
    `/api/proxy/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Update failed" }));
    throw new Error(err.error ?? "Update failed");
  }
  return res.json() as Promise<PatientDocumentResponse>;
}

async function verifyDocument(
  patientId: string,
  documentId: string,
  data: DocumentVerifyPayload
) {
  const res = await fetch(
    `/api/proxy/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}/verify`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Verify failed" }));
    throw new Error(err.error ?? "Verify failed");
  }
  return res.json() as Promise<PatientDocumentResponse>;
}

async function deleteDocument(patientId: string, documentId: string) {
  const res = await fetch(
    `/api/proxy/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}`,
    { method: "DELETE" }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Delete failed" }));
    throw new Error(err.error ?? "Delete failed");
  }
  return res.json() as Promise<{ success: boolean; data: { deleted: boolean } }>;
}

async function syncEmailAttachments(patientId: string) {
  const res = await fetch(
    `/api/proxy/patients/${encodeURIComponent(patientId)}/documents/sync-email-attachments`,
    { method: "POST" }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Sync failed" }));
    throw new Error(err.error ?? "Sync failed");
  }
  return res.json() as Promise<DocumentSyncResponse>;
}

// ---- Hooks ----

export function patientDocumentsQueryOptions(
  patientId: string,
  opts?: PatientDocumentsQueryOptions
) {
  return queryOptions({
    queryKey: [
      "patient-documents",
      patientId,
      opts?.category ?? null,
      opts?.status ?? null,
      opts?.source ?? null,
      opts?.limit ?? null,
      opts?.offset ?? null,
      opts?.sort ?? null,
      opts?.order ?? null,
    ],
    queryFn: () => fetchDocuments(patientId, opts),
  });
}

export function usePatientDocuments(
  patientId: string | undefined,
  opts?: PatientDocumentsQueryOptions,
  initialData?: PatientDocumentsListResponse
) {
  return useQuery({
    ...patientDocumentsQueryOptions(patientId ?? "", opts),
    enabled: !!patientId,
    initialData,
  });
}

export function useEntityDocuments(
  entityId: string | undefined,
  opts?: EntityDocumentsQueryOptions,
  initialData?: EntityDocumentsListResponse
) {
  return useQuery({
    queryKey: [
      "entity-documents",
      entityId,
      opts?.patientSearch ?? "",
      opts?.category ?? null,
      opts?.status ?? null,
      opts?.source ?? null,
      opts?.limit ?? null,
      opts?.offset ?? null,
      opts?.sort ?? null,
      opts?.order ?? null,
    ],
    queryFn: () => fetchEntityDocuments(entityId!, opts),
    enabled: !!entityId,
    initialData,
  });
}

export function useUploadDocument(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      file: File;
      category: DocumentCategory;
      description?: string;
      expiry_date?: string;
      uploaded_by?: string;
    }) => uploadDocument(patientId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-documents", patientId] });
    },
  });
}

export function useUpdateDocument(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      documentId,
      data,
    }: {
      documentId: string;
      data: DocumentUpdatePayload;
    }) => updateDocument(patientId, documentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-documents", patientId] });
    },
  });
}

export function useVerifyDocument(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      documentId,
      data,
    }: {
      documentId: string;
      data: DocumentVerifyPayload;
    }) => verifyDocument(patientId, documentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-documents", patientId] });
    },
  });
}

export function useDeleteDocument(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => deleteDocument(patientId, documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-documents", patientId] });
    },
  });
}

export function useSyncEmailAttachments(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => syncEmailAttachments(patientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-documents", patientId] });
    },
  });
}
