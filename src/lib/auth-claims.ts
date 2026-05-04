import type { UserRole } from "@/types";

const USER_ROLES = ["admin", "doctor", "staff"] as const satisfies readonly UserRole[];

type JsonRecord = Record<string, unknown>;
type ClerkMetadataSource = {
  publicMetadata?: unknown;
  privateMetadata?: unknown;
  unsafeMetadata?: unknown;
};

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null ? (value as JsonRecord) : null;
}

export function coerceUserRole(value: unknown): UserRole | null {
  return USER_ROLES.includes(value as UserRole) ? (value as UserRole) : null;
}

export function getRoleFromClaims(sessionClaims: unknown): UserRole | null {
  const claims = asRecord(sessionClaims);
  const metadata = asRecord(claims?.metadata);
  const publicMetadata =
    asRecord(claims?.publicMetadata) ?? asRecord(claims?.public_metadata);

  return (
    coerceUserRole(metadata?.role) ??
    coerceUserRole(publicMetadata?.role) ??
    coerceUserRole(claims?.role)
  );
}

export function getRoleFromUserMetadata(user: ClerkMetadataSource | null | undefined) {
  const publicMetadata = asRecord(user?.publicMetadata);
  const privateMetadata = asRecord(user?.privateMetadata);
  const unsafeMetadata = asRecord(user?.unsafeMetadata);

  return (
    coerceUserRole(publicMetadata?.role) ??
    coerceUserRole(privateMetadata?.role) ??
    coerceUserRole(unsafeMetadata?.role)
  );
}

export function getUserRole(sessionClaims: unknown): UserRole {
  return getRoleFromClaims(sessionClaims) ?? "staff";
}

export function getEntityIdFromClaims(sessionClaims: unknown): string {
  const claims = asRecord(sessionClaims);
  const metadata = asRecord(claims?.metadata);
  const publicMetadata =
    asRecord(claims?.publicMetadata) ?? asRecord(claims?.public_metadata);
  const entityId = metadata?.entityId ?? publicMetadata?.entityId ?? claims?.entityId;

  return typeof entityId === "string" ? entityId : "";
}

export function getEntityIdFromUserMetadata(
  user: ClerkMetadataSource | null | undefined
): string {
  const publicMetadata = asRecord(user?.publicMetadata);
  const privateMetadata = asRecord(user?.privateMetadata);
  const unsafeMetadata = asRecord(user?.unsafeMetadata);
  const entityId =
    publicMetadata?.entityId ?? privateMetadata?.entityId ?? unsafeMetadata?.entityId;

  return typeof entityId === "string" ? entityId : "";
}
