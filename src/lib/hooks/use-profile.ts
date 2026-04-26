import type {
  UserProfileResponse,
  UpdateUserProfilePayload,
  UpdateUserAvailabilityPayload,
  UserAvailabilityResponse,
} from "@/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ---- Fetch helpers ----

async function fetchProfile() {
  const res = await fetch("/api/proxy/users/me");
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json() as Promise<UserProfileResponse>;
}

async function updateProfile(data: UpdateUserProfilePayload) {
  const res = await fetch("/api/proxy/users/me", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to update profile" }));
    if (res.status === 403) {
      throw new Error(err.error ?? "Only doctors can set these fields");
    }
    if (res.status === 400) {
      throw new Error(err.error ?? "Validation failed");
    }
    throw new Error(err.error ?? "Failed to update profile");
  }
  return res.json() as Promise<UserProfileResponse>;
}

async function updateAvailability(data: UpdateUserAvailabilityPayload) {
  const res = await fetch("/api/proxy/users/me/availability", {
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
  return res.json() as Promise<UserAvailabilityResponse>;
}

// ---- Hooks ----

export function useProfile(initialData?: UserProfileResponse) {
  return useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
    initialData,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateUserProfilePayload) => updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useUpdateAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateUserAvailabilityPayload) => updateAvailability(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
