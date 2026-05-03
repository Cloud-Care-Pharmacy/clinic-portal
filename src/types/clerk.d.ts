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
  }
}

export {};
