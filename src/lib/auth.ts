import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { UserRole } from "@/types";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
    };
  }

  interface JWT {
    role?: UserRole;
  }
}

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "").split(",").filter(Boolean);
const DOCTOR_EMAILS = (process.env.DOCTOR_EMAILS ?? "")
  .split(",")
  .filter(Boolean);

function resolveRole(email: string | null | undefined): UserRole {
  if (!email) return "staff";
  if (ADMIN_EMAILS.includes(email)) return "admin";
  if (DOCTOR_EMAILS.includes(email)) return "doctor";
  return "staff";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = resolveRole(user.email);
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = (token.role as UserRole) ?? "staff";
      }
      return session;
    },
  },
});
