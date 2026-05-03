import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { UserRole, UserSession } from "@/types";

export { auth };

/**
 * Extract role from Clerk session claims (customized in Clerk dashboard).
 * Falls back to "staff" when no role metadata is set.
 */
export function getUserRole(sessionClaims: CustomJwtSessionClaims | null): UserRole {
  const role = sessionClaims?.metadata?.role;
  if (role === "admin" || role === "doctor" || role === "staff") return role;
  return "staff";
}

/**
 * Require an authenticated user in a Server Component or Route Handler.
 * Redirects to /sign-in if not authenticated.
 */
export async function requireAuth() {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect("/sign-in");
  return { userId, role: getUserRole(sessionClaims) };
}

/**
 * Resolve the active entity (clinic/shop) ID for the current user.
 *
 * Source of truth is Clerk `publicMetadata.entityId`, surfaced into the
 * session JWT under `metadata.entityId` (configured in Clerk Dashboard →
 * Sessions → Customize session token). Falls back to
 * `NEXT_PUBLIC_DEFAULT_ENTITY_ID` for local development / single-tenant
 * deployments. Returns "" when neither is set.
 */
export async function getEntityId(): Promise<string> {
  const { sessionClaims } = await auth();
  const fromClerk = sessionClaims?.metadata?.entityId;
  if (fromClerk) return fromClerk;
  return process.env.NEXT_PUBLIC_DEFAULT_ENTITY_ID ?? "";
}

/**
 * Get the current user's session info for UI display.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<UserSession | null> {
  const user = await currentUser();
  if (!user) return null;

  const role = (user.publicMetadata?.role as UserRole) ?? "staff";
  return {
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") || "User",
    email: user.emailAddresses[0]?.emailAddress ?? "",
    image: user.imageUrl,
    role,
  };
}
