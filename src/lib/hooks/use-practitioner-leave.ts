import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreatePractitionerLeavePayload,
  ListPractitionerLeaveQuery,
  PractitionerLeaveListResponse,
  PractitionerLeaveResponse,
} from "@/types";

// ---- Fetch helpers ----

async function fetchPractitionerLeave(
  q: ListPractitionerLeaveQuery
): Promise<PractitionerLeaveListResponse> {
  const params = new URLSearchParams({ from: q.from, to: q.to });
  if (q.practitionerId) params.set("practitionerId", q.practitionerId);
  if (q.entityId) params.set("entityId", q.entityId);
  const res = await fetch(`/api/proxy/practitioner-leave?${params.toString()}`);
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: "Failed to fetch leave entries" }));
    throw new Error(err.error ?? "Failed to fetch leave entries");
  }
  return res.json() as Promise<PractitionerLeaveListResponse>;
}

async function createPractitionerLeave(
  data: CreatePractitionerLeavePayload
): Promise<PractitionerLeaveResponse> {
  const res = await fetch("/api/proxy/practitioner-leave", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: "Failed to create leave entry" }));
    if (res.status === 403) {
      throw new Error(err.error ?? "You can only record leave for yourself.");
    }
    if (res.status === 400) {
      throw new Error(err.error ?? "Validation failed");
    }
    throw new Error(err.error ?? "Failed to create leave entry");
  }
  return res.json() as Promise<PractitionerLeaveResponse>;
}

async function deletePractitionerLeave(leaveId: string): Promise<void> {
  const res = await fetch(
    `/api/proxy/practitioner-leave/${encodeURIComponent(leaveId)}`,
    { method: "DELETE" }
  );
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: "Failed to delete leave entry" }));
    throw new Error(err.error ?? "Failed to delete leave entry");
  }
}

// ---- Hooks ----

export function usePractitionerLeave(
  q: ListPractitionerLeaveQuery | undefined,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: [
      "practitioner-leave",
      q?.from ?? null,
      q?.to ?? null,
      q?.practitionerId ?? null,
      q?.entityId ?? null,
    ],
    queryFn: () => fetchPractitionerLeave(q as ListPractitionerLeaveQuery),
    enabled: enabled && Boolean(q?.from) && Boolean(q?.to),
    staleTime: 30_000,
  });
}

export function useCreatePractitionerLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePractitionerLeavePayload) =>
      createPractitionerLeave(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practitioner-leave"] });
    },
  });
}

export function useDeletePractitionerLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (leaveId: string) => deletePractitionerLeave(leaveId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practitioner-leave"] });
    },
  });
}
