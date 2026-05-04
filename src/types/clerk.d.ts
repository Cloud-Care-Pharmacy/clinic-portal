import type { UserRole } from "@/types";

declare global {
  interface ClerkAuthorization {
    permission: "";
    role: "";
  }

  interface UserPublicMetadata {
    role?: UserRole;
    entityId?: string;
  }

  interface CustomJwtSessionClaims {
    metadata?: {
      role?: UserRole;
      entityId?: string;
    };
    publicMetadata?: {
      role?: UserRole;
      entityId?: string;
    };
    public_metadata?: {
      role?: UserRole;
      entityId?: string;
    };
    role?: UserRole;
    entityId?: string;
  }
}

export {};
