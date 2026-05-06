import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { UserProfile, UserRole, UserSession } from "@/types";

export { auth };

/**
 * Result of resolving the current user against the backend.
 *
 * - `ok`: backend returned a profile (200).
 * - `unauthenticated`: no Clerk session.
 * - `deactivated`: backend returned 403 — the account is revoked or
 *   soft-deactivated. Caller should force sign-out.
 * - `setup`: backend returned 404 — Clerk session exists but the `users`
 *   row has not been provisioned yet (first-sign-in race).
 * - `error`: any other failure. Caller should treat as transient.
 */
export type MeState =
  | { kind: "ok"; profile: UserProfile; clerkUserId: string }
  | { kind: "unauthenticated" }
  | { kind: "deactivated"; clerkUserId: string }
  | { kind: "setup"; clerkUserId: string }
  | { kind: "error"; clerkUserId: string };

/**
 * Resolve the current user's backend profile.
 *
 * Wrapped in `React.cache` so multiple Server Components in a single request
 * share one fetch.
 */
export const getMeState = cache(async (): Promise<MeState> => {
  const { userId } = await auth();
  if (!userId) return { kind: "unauthenticated" };
  try {
    const response = await api.getMyProfile(userId);
    const profile = response.data.profile;
    if (!profile) return { kind: "setup", clerkUserId: userId };
    return { kind: "ok", profile, clerkUserId: userId };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 403) return { kind: "deactivated", clerkUserId: userId };
      if (err.status === 404) return { kind: "setup", clerkUserId: userId };
    }
    return { kind: "error", clerkUserId: userId };
  }
});

/** Convenience accessor — returns just the profile or null. */
export const getMe = cache(async (): Promise<UserProfile | null> => {
  const state = await getMeState();
  return state.kind === "ok" ? state.profile : null;
});

/**
 * Require an authenticated, active user in a Server Component or Route Handler.
 *
 * - No Clerk session → redirect to `/sign-in`.
 * - Backend says deactivated/revoked → redirect to `/sign-in?reason=deactivated`
 *   (the sign-in page can surface a message; Clerk session is left intact so
 *   the user can sign out cleanly).
 * - Backend has no `users` row yet → fall through with empty `internalUserId`
 *   so the dashboard can render a "setting up your account" state instead of
 *   looping the proxy.
 */
export async function requireAuth(): Promise<{
  userId: string;
  internalUserId: string;
  role: UserRole;
  entityId: string;
}> {
  const state = await getMeState();
  if (state.kind === "unauthenticated") redirect("/sign-in");
  if (state.kind === "deactivated") redirect("/sign-in?reason=deactivated");

  if (state.kind === "ok") {
    return {
      userId: state.clerkUserId,
      internalUserId: state.profile.id,
      role: state.profile.role,
      entityId: state.profile.entityId ?? "",
    };
  }

  // setup or transient error — return safe defaults so callers can render
  // a fallback UI without a redirect loop.
  return {
    userId: state.clerkUserId,
    internalUserId: "",
    role: "staff",
    entityId: "",
  };
}

/** Resolve the active entity (clinic/shop) ID for the current user. */
export async function getEntityId(): Promise<string> {
  const profile = await getMe();
  return profile?.entityId ?? "";
}

/** Resolve the current user's role. Defaults to `staff` when unknown. */
export async function getUserRole(): Promise<UserRole> {
  const profile = await getMe();
  return profile?.role ?? "staff";
}

/**
 * Get the current user's session info for UI display.
 * Returns null if not authenticated or the account has been deactivated.
 */
export async function getCurrentUser(): Promise<UserSession | null> {
  const state = await getMeState();
  if (state.kind === "unauthenticated" || state.kind === "deactivated") {
    return null;
  }

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const profile = state.kind === "ok" ? state.profile : null;
  const internalName = [profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .join(" ");
  const clerkName = [clerkUser.firstName, clerkUser.lastName]
    .filter(Boolean)
    .join(" ");
  const email = profile?.email ?? clerkUser.emailAddresses[0]?.emailAddress ?? "";

  return {
    name: internalName || clerkName || email || "User",
    email,
    image: clerkUser.imageUrl,
    role: profile?.role ?? "staff",
  };
}
