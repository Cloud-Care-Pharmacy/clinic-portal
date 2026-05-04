import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getRoleFromClaims, getUserRole } from "@/lib/auth-claims";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isWorkspaceRoute = createRouteMatcher(["/workspace(.*)"]);

export const proxy = clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Protect all other routes — redirects to sign-in if unauthenticated
  await auth.protect();

  // Redirect root to dashboard
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Admin-only route guard for routes that do not have their own server fallback.
  if (isAdminRoute(req)) {
    const { sessionClaims } = await auth();
    const role = getUserRole(sessionClaims);
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // Workspace remains admin-only, but can fall back to Clerk user metadata in page.tsx
  // when the session token template does not expose role metadata.
  if (isWorkspaceRoute(req)) {
    const { sessionClaims } = await auth();
    const role = getRoleFromClaims(sessionClaims);
    if (role && role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
