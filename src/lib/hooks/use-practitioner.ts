import type {
  PractitionerProfileResponse,
  PractitionerAvailabilityResponse,
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
