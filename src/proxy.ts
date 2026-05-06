import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

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

  // Role-based authorization is enforced by:
  //   1. Server Components (e.g. workspace/page.tsx redirects non-admins)
  //   2. The gateway (returns 403 on admin endpoints for non-admin callers)
  // We intentionally do not call the backend from the proxy to avoid a
  // network hop on every request.
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
