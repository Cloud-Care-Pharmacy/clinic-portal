import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import {
  getEntityIdFromClaims,
  getEntityIdFromUserMetadata,
  getRoleFromClaims,
  getRoleFromUserMetadata,
  getUserRole,
} from "@/lib/auth-claims";
import type { UserSession } from "@/types";

export { auth };
export { getUserRole };

/**
 * Require an authenticated user in a Server Component or Route Handler.
 * Redirects to /sign-in if not authenticated.
 */
export async function requireAuth() {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect("/sign-in");
  const roleFromClaims = getRoleFromClaims(sessionClaims);
  if (roleFromClaims) return { userId, role: roleFromClaims };

  const user = await currentUser();
  return { userId, role: getRoleFromUserMetadata(user) ?? "staff" };
}

/**
 * Resolve the active entity (clinic/shop) ID for the current user.
 *
 * Source of truth is Clerk `publicMetadata.entityId`. We first check the
 * session JWT (`metadata.entityId`, configured in Clerk Dashboard → Sessions
 * → Customize session token) for a fast read; if not surfaced there, we fall
 * back to reading `publicMetadata.entityId` directly off the user. Returns
 * "" when the Clerk user has no `entityId` set.
 */
export async function getEntityId(): Promise<string> {
  const { sessionClaims } = await auth();
  const fromClaims = getEntityIdFromClaims(sessionClaims);
  if (fromClaims) return fromClaims;

  const user = await currentUser();
  return getEntityIdFromUserMetadata(user);
}

/**
 * Get the current user's session info for UI display.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<UserSession | null> {
  const { sessionClaims } = await auth();
  const user = await currentUser();
  if (!user) return null;

  const profile = await api
    .getMyProfile(user.id)
    .then((response) => response.data.profile)
    .catch(() => null);
  const internalName = [profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .join(" ");
  const clerkName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const email = profile?.email ?? user.emailAddresses[0]?.emailAddress ?? "";
  const role =
    getRoleFromClaims(sessionClaims) ?? getRoleFromUserMetadata(user) ?? "staff";
  return {
    name: internalName || clerkName || email || "User",
    email,
    image: user.imageUrl,
    role,
  };
}
