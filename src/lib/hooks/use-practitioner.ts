import type {
  PractitionerProfileResponse,
  PractitionerAvailabilityResponse,
  PractitionersListResponse,
  PractitionersListQuery,
  PractitionerFreeSlotsResponse,
  UpdatePractitionerPayload,
  UpdatePractitionerAvailabilityPayload,
} from "@/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ---- Fetch helpers ----

async function fetchPractitioner(): Promise<PractitionerProfileResponse> {
  const res = await fetch("/api/proxy/practitioners/me");
  // 404 = no practitioner profile yet — surface as empty data, not an error.
  if (res.status === 404) {
    return { success: true, data: { practitioner: null } };
  }
  if (!res.ok) throw new Error("Failed to fetch practitioner profile");
  return res.json() as Promise<PractitionerProfileResponse>;
}

async function updatePractitioner(data: UpdatePractitionerPayload) {
  const res = await fetch("/api/proxy/practitioners/me", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: "Failed to update practitioner profile" }));
    if (res.status === 403) {
      throw new Error(
        err.error ??
          "Only doctors or admins can set HPII, prescriber number, or qualifications"
      );
    }
    if (res.status === 400) {
      throw new Error(err.error ?? "Validation failed");
    }
    throw new Error(err.error ?? "Failed to update practitioner profile");
  }
  return res.json() as Promise<PractitionerProfileResponse>;
}

async function updatePractitionerAvailability(
  data: UpdatePractitionerAvailabilityPayload
) {
  const res = await fetch("/api/proxy/practitioners/me/availability", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: "Failed to update availability" }));
    throw new Error(err.error ?? "Failed to update availability");
  }
  return res.json() as Promise<PractitionerAvailabilityResponse>;
}

// ---- Hooks ----

export function usePractitioner(initialData?: PractitionerProfileResponse) {
  return useQuery({
    queryKey: ["practitioner"],
    queryFn: fetchPractitioner,
    initialData,
  });
}

export function useUpdatePractitioner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePractitionerPayload) => updatePractitioner(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practitioner"] });
    },
  });
}

export function useUpdatePractitionerAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePractitionerAvailabilityPayload) =>
      updatePractitionerAvailability(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practitioner"] });
    },
  });
}

// ---- Directory + scheduling ----

async function fetchPractitioners(
  opts?: PractitionersListQuery
): Promise<PractitionersListResponse> {
  const params = new URLSearchParams();
  if (opts?.role) params.set("role", opts.role);
  if (opts?.active === false) params.set("active", "false");
  if (opts?.search) params.set("search", opts.search);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`/api/proxy/practitioners${qs}`);
  if (!res.ok) throw new Error("Failed to fetch practitioners");
  return res.json() as Promise<PractitionersListResponse>;
}

async function fetchPractitionerFreeSlots(
  userId: string,
  date: string,
  duration: number,
  tz?: string
): Promise<PractitionerFreeSlotsResponse> {
  const params = new URLSearchParams({
    date,
    duration: String(duration),
  });
  if (tz) params.set("tz", tz);
  const res = await fetch(
    `/api/proxy/practitioners/${encodeURIComponent(userId)}/free-slots?${params.toString()}`
  );
  if (!res.ok) throw new Error("Failed to fetch free slots");
  return res.json() as Promise<PractitionerFreeSlotsResponse>;
}

export function usePractitioners(
  opts?: PractitionersListQuery,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: [
      "practitioners",
      opts?.role ?? "doctor",
      opts?.active ?? true,
      opts?.search ?? "",
    ],
    queryFn: () => fetchPractitioners(opts),
    enabled,
    staleTime: 60_000,
  });
}

/**
 * Open booking windows for a practitioner on a given local date. Empty `slots`
 * is a valid response (day off / fully booked) — render an empty state, not an
 * error.
 */
export function usePractitionerFreeSlots(
  userId: string | undefined,
  date: string | undefined,
  duration: number | undefined,
  tz?: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["practitioner-free-slots", userId, date, duration, tz ?? null],
    queryFn: () =>
      fetchPractitionerFreeSlots(userId as string, date as string, duration as number, tz),
    enabled: enabled && Boolean(userId) && Boolean(date) && Boolean(duration),
    staleTime: 30_000,
  });
}
