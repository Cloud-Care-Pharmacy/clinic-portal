import type { UserProfileResponse, UpdateUserProfilePayload } from "@/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ---- Fetch helpers ----
// TODO: When backend is ready, change `/api/profile` to `/api/proxy/users/me`

async function fetchProfile() {
  const res = await fetch("/api/profile");
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json() as Promise<UserProfileResponse>;
}

async function updateProfile(data: UpdateUserProfilePayload) {
  const res = await fetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to update profile" }));
    throw new Error(err.error ?? "Failed to update profile");
  }
  return res.json() as Promise<UserProfileResponse>;
}

// ---- Hooks ----

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
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
